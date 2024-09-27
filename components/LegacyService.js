const epcc = require('../client/epcc');
const square = require('../client/square');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const jsonpath = require('jsonpath');
const { FileWrapper } = require('square')
const axios = require('axios');

const nunjucks = require('nunjucks')
nunjucks.configure({ autoescape: false, trimBlocks: true, lstripBlocks: true });

const log = require('loglevel');
log.setLevel(process.env.LOG_LEVEL || "info")

module.exports.productSync = async (request) => {
    const productId = request.payload.data.id
    log.info("Request received for product ID", productId)
    let product = await buildProductForTemplate(productId)

    const isSync = await checkIfProductIsAlreadyInSync(product)
    if (isSync) {
        log.info("EPCC and Square is in sync, so no updates required")
        const response = {
            message: "EPCC and Square is in sync, so no updates required",
            productId: product.data.id
        }
        return response
    }

    let rendered = null
    if ("included" in product && ("parent" in product.included || "children" in product.included)) {
        rendered = nunjucks.render('templates/legacy_product/legacyproduct_withvariant.njk', product)
    } else {
        rendered = nunjucks.render('templates/legacy_product/legacyproduct_withoutvariant.njk', product)
    }
    const productRequest = JSON.parse(rendered)
    log.debug("Template rendered data", productRequest)
    const response = await square.upsertCatalogObject(productRequest).catch((error) => {
        log.error("Error occured", error)
        return error
    });
    await updateExternalReference(response, product)
    return response
};

async function buildProductForTemplate(productId) {
    let product = await epcc.getLegacyProduct(productId)
    if ("included" in product && "parent" in product.included) {
        product = await epcc.getLegacyProduct(product.included.parent[0].id)
    }

    const imageId = await addImage(product)
    if (imageId != null) {
        product.imageId = imageId
    }
    product.currency = process.env.DEFAULT_CURRENCY
    product.idempotencyKey = uuidv4()
    product.data.description = product.data.description.replace("\n", "")
    product.version = await getVersion(product)
    product = await retrieveExternalDetails(product)
    log.debug("Product request for template", JSON.stringify(product, (key, value) => typeof value === 'bigint' ? value.toString() : value))
    return product
}

async function checkIfProductIsAlreadyInSync(product) {
    let isSync = false
    const squareObject = await getSquareObject(product)
    if (squareObject != null) {
        const squareRendered = nunjucks.render('templates/sync_check/square_product.njk', squareObject)
        let epccRendered = null
        if ("included" in product && ("parent" in product.included || "children" in product.included)) {
            epccRendered = nunjucks.render('templates/sync_check/checkinsync_withvariant.njk', product)
        } else {
            epccRendered = nunjucks.render('templates/sync_check/checkinsync_withoutvariant.njk', product)
        }
        log.debug("Square rendered", JSON.stringify(JSON.parse(squareRendered)))
        log.debug("EPCC rendered", JSON.stringify(JSON.parse(epccRendered)))
        if (JSON.stringify(JSON.parse(squareRendered)) == JSON.stringify(JSON.parse(epccRendered))) {
            isSync = true
        }
    }
    return isSync
}

async function getVersion(product) {
    let version = 1
    const squareObject = await getSquareObject(product)
    if (squareObject != null) {
        version = squareObject.object.version
    }
    return version
}

async function getSquareObject(product) {
    let squareObject = null
    if ("item_reference" in product.data && product.data.item_reference != null) {
        const response = await square.retrieveCatalogObject(product.data.item_reference).catch((error) => {
            log.error("Error occured", error)
            return error
        });
        squareObject = response.result
    }
    return squareObject
}

async function retrieveExternalDetails(product) {
    if ("included" in product && "parent" in product.included) {
        for (const parentproduct of product.included.parent) {
            const response = await epcc.getLegacyProduct(parentproduct.id)
            parentproduct.item_reference = response.data.item_reference
        }
    }
    if ("included" in product && "children" in product.included) {
        for (const childproduct of product.included.children) {
            const response = await epcc.getLegacyProduct(childproduct.id)
            childproduct.item_variation_reference = response.data.item_variation_reference
            childproduct.price = response.data.price
        }
    }
    return product
}

async function updateExternalReference(response, product) {
    if ("result" in response && "idMappings" in response.result) {
        for (const mapping of response.result.idMappings) {
            let productRequest = null
            let sku = null
            if (mapping.clientObjectId.startsWith("##")) {
                sku = mapping.clientObjectId.replace("##", "")
                const versionData = jsonpath.query(response, '$..[?(@.id == "' + mapping.objectId + '")]');
                productRequest = {
                    type: "product",
                    item_reference: mapping.objectId,
                    item_version: versionData[0].version.toString()
                }
            } else if (mapping.clientObjectId.startsWith("#")) {
                sku = mapping.clientObjectId.replace("#", "")
                const versionData = jsonpath.query(response, '$..[?(@.id == "' + mapping.objectId + '")]');
                productRequest = {
                    type: "product",
                    item_variation_reference: mapping.objectId,
                    item_variation_version: versionData[0].version.toString()
                }
            }
            const data = jsonpath.query(product, '$..[?(@.sku == "' + sku + '")]');
            const productId = data[0].id
            productRequest.id = productId
            await epcc.updateProduct(productId, productRequest)
        }
    }
}

async function addImage(product) {
    let squareImageId = null
    if ("included" in product && "main_images" in product.included) {
        const imageId = product.included.main_images[0].id
        const imageUrl = product.included.main_images[0].link.href
        log.debug("Product Image Details (Image ID and Image URL)", imageId, imageUrl)
        let imageCheckResponse = await checkIfImageRequireReupload(product, imageId)

        if (imageCheckResponse.newImage) {
            const res = await axios.get(imageUrl, { responseType: 'arraybuffer' })
            fs.writeFileSync("/tmp/"+imageId + ".jpg", Buffer.from(res.data, "utf-8"));
            const file = new FileWrapper(fs.createReadStream("/tmp/"+imageId + ".jpg"))
            const response = await createNewImage(imageId, file)
            log.debug("Image response", response)
            await updateProductWithImageReference(product, imageId, response)
            fs.unlinkSync("/tmp/"+imageId + ".jpg")
            squareImageId = response.result.image.id
            log.info("New Square Image ID", squareImageId)
        } else {
            squareImageId = imageCheckResponse.imageReference
            log.info("Reusing Square Image ID", squareImageId)
        }
    }
    return squareImageId
}

async function checkIfImageRequireReupload(product, imageId) {
    let newImage = true
    let imageReference = ""
    if ("image_reference" in product.data && product.data.image_reference != null && "main_image_id" in product.data && product.data.main_image_id != null) {
        const existingImageId = product.data.main_image_id

        if (existingImageId === imageId) {
            newImage = false
            imageReference = product.data.image_reference
        }
    }
    log.debug("Checking if image require reupload", newImage, imageReference)
    return { newImage: newImage, imageReference: imageReference }
}

async function updateProductWithImageReference(product, imageId, response) {
    const productRequest = {
        type: "product",
        id: product.data.id,
        main_image_id: imageId,
        image_reference: response.result.image.id
    }
    await epcc.updateProduct(product.data.id, productRequest)
}

async function createNewImage(imageId, file) {
    const imageRequest = {
        idempotencyKey: uuidv4(),
        image: {
            id: '#' + imageId,
            type: "IMAGE",
            imageData: {
                name: imageId
            }
        }
    }

    const response = await square.createCatalogImage(imageRequest, file).catch((error) => {
        log.info("Error occured", error)
        return error
    });
    return response
}