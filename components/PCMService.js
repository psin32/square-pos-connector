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

module.exports.productFullSync = async () => {
    const products = await epcc.fetchPCMProduct()
    const templateId = await epcc.getReferenceTemplateId()
    log.info("Template ID for Reference template", templateId)
    for (let product of products) {
        await publishProductToSquare(product, templateId)
    }
};

async function publishProductToSquare(product, templateId) {
    await associateTemplateIfNotExists(product.id, templateId)
    let pcmProduct = await epcc.getPCMProductByProductID(product.id)
    product = await buildProductForTemplate(product, pcmProduct)
    log.debug("Product Information", JSON.stringify(product, (key, value) => typeof value === 'bigint' ? value.toString() : value))
    const rendered = nunjucks.render('templates/pcm_product/pcmproduct.njk', product)
    const productRequest = JSON.parse(rendered)
    log.debug("Template rendered data", JSON.stringify(productRequest))
    const response = await square.upsertCatalogObject(productRequest).catch((error) => {
        log.error("Error occured", error)
        return error
    });
    await updateExternalReference(response, product)
}

async function associateTemplateIfNotExists(productId, templateId) {
    const productTemplates = await epcc.getTemplateAssociatedWithProduct(productId)
    let referenceTemplate = productTemplates.data.find((template) => template.id === templateId)
    if (JSON.stringify(productTemplates.data) === '[]' || typeof referenceTemplate === 'undefined' || JSON.stringify(referenceTemplate) === '[]') {
        log.info("Associate template with Product")
        await epcc.createTemplateRelationship(productId, templateId)
    }
}

async function buildProductForTemplate(product, pcmProduct) {
    const imageId = await addImage(pcmProduct)
    if (imageId != null) {
        pcmProduct = await epcc.getPCMProductByProductID(product.id)
        product.imageId = imageId
    }
    product.currency = process.env.DEFAULT_CURRENCY
    product.idempotencyKey = uuidv4()
    product.attributes.description = product.attributes.description.replace("\n", "")
    const versions = await getVersion(pcmProduct)
    product.version = versions
    log.debug("Version details for Square object", versions)
    if ("extensions" in pcmProduct.data.attributes
        && "products(reference)" in pcmProduct.data.attributes.extensions) {
        product.reference = pcmProduct.data.attributes.extensions["products(reference)"]
    }
    return product
}

async function getVersion(pcmProduct) {
    let versions = {
        item_version: 1,
        variation_version: 1
    }
    const squareObject = await getSquareObject(pcmProduct)
    if (squareObject != null) {
        let variations = []
        for (const variation of squareObject.object.itemData.variations) {
            variations.push({
                sku: variation.itemVariationData.sku,
                version: variation.version
            })
        }
        versions = {
            item_version: squareObject.object.version,
            variation_version: variations
        }
    }
    return versions
}

async function getSquareObject(pcmProduct) {
    let squareObject = null
    if ("extensions" in pcmProduct.data.attributes
        && "products(reference)" in pcmProduct.data.attributes.extensions
        && "item_reference" in pcmProduct.data.attributes.extensions["products(reference)"]
        && pcmProduct.data.attributes.extensions["products(reference)"].item_reference != null) {
        const response = await square.retrieveCatalogObject(pcmProduct.data.attributes.extensions["products(reference)"].item_reference).catch((error) => {
            log.error("Error occured", error)
            return error
        });
        squareObject = response.result
    }
    return squareObject
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
                    type: "entry",
                    item_reference: mapping.objectId,
                    item_version: versionData[0].version.toString()
                }
            } else if (mapping.clientObjectId.startsWith("#")) {
                sku = mapping.clientObjectId.replace("#", "")
                const versionData = jsonpath.query(response, '$..[?(@.id == "' + mapping.objectId + '")]');
                productRequest = {
                    type: "entry",
                    item_variation_reference: mapping.objectId,
                    item_variation_version: versionData[0].version.toString()
                }
            }
            const productId = product.id
            productRequest.id = productId
            await epcc.updateTemplateAttributes("products(reference)", productId, productRequest)
        }
    }
}

async function addImage(pcmProduct) {
    let squareImageId = null
    if ("included" in pcmProduct && "main_images" in pcmProduct.included) {
        const imageId = pcmProduct.included.main_images[0].id
        const imageUrl = pcmProduct.included.main_images[0].link.href
        log.debug("Product Image Details (Image ID and Image URL)", imageId, imageUrl)
        let imageCheckResponse = await checkIfImageRequireReupload(pcmProduct, imageId)

        if (imageCheckResponse.newImage) {
            const res = await axios.get(imageUrl, { responseType: 'arraybuffer' })
            fs.writeFileSync("/tmp/" + imageId + ".jpg", Buffer.from(res.data, "utf-8"));
            const file = new FileWrapper(fs.createReadStream("/tmp/" + imageId + ".jpg"))
            const response = await createNewImage(imageId, file)
            log.debug("Image response", response)
            await updateProductWithImageReference(pcmProduct.data.id, imageId, response)
            fs.unlinkSync("/tmp/" + imageId + ".jpg")
            squareImageId = response.result.image.id
            log.info("New Square Image ID", squareImageId)
        } else {
            squareImageId = imageCheckResponse.imageReference
            log.info("Reusing Square Image ID", squareImageId)
        }
    }
    return squareImageId
}

async function checkIfImageRequireReupload(pcmProduct, imageId) {
    let newImage = true
    let imageReference = ""
    if ("extensions" in pcmProduct.data.attributes
        && "products(reference)" in pcmProduct.data.attributes.extensions
        && "image_reference" in pcmProduct.data.attributes.extensions["products(reference)"]
        && pcmProduct.data.attributes.extensions["products(reference)"].image_reference != null
        && "main_image_id" in pcmProduct.data.attributes.extensions["products(reference)"]
        && pcmProduct.data.attributes.extensions["products(reference)"].main_image_id != null) {

        const existingImageId = pcmProduct.data.attributes.extensions["products(reference)"].main_image_id

        if (existingImageId === imageId) {
            newImage = false
            imageReference = pcmProduct.data.attributes.extensions["products(reference)"].image_reference
        }
    }
    log.debug("Checking if image require reupload", newImage, imageReference)
    return { newImage: newImage, imageReference: imageReference }
}

async function updateProductWithImageReference(productId, imageId, response) {
    const attribute = await epcc.getTemplateAttributes("products(reference)", productId)
    const entryRequest = {
        type: "entry",
        id: productId,
        main_image_id: imageId,
        image_reference: response.result.image.id
    }
    if ("errors" in attribute) {
        log.debug("Create template attribute request", entryRequest)
        await epcc.createTemplateAttributes("products(reference)", entryRequest)
    } else {
        log.debug("Update template attribute request", entryRequest)
        await epcc.updateTemplateAttributes("products(reference)", productId, entryRequest)
    }
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