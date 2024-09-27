const epcc = require('../client/epcc');
const square = require('../client/square');
const { v4: uuidv4 } = require('uuid');

const nunjucks = require('nunjucks')
nunjucks.configure({ autoescape: false, trimBlocks: true, lstripBlocks: true });

const log = require('loglevel');
log.setLevel(process.env.LOG_LEVEL || "info")

module.exports.createCustomer = async (request) => {
    const idempotencyKey = uuidv4()
    const customerId = request.payload.data.id
    request.idempotencyKey = idempotencyKey
    const rendered = nunjucks.render('templates/customer/customer.njk', request)
    const isSync = await checkIfCustomerIsAlreadyInSync(request, idempotencyKey, rendered)
    let response = null
    if (isSync) {
        log.info("EPCC and Square is in sync, so no updates required")
        response = {
            message: "EPCC and Square is in sync, so no updates required",
            customerId: customerId
        }
    } else {
        if ("external_customer_id" in request.payload.data && request.payload.data.external_customer_id != null) {
            response = await square.updateCustomer(request.payload.data.external_customer_id, JSON.parse(rendered)).catch((error) => {
                console.log("Error occured", error)
                return error
            });
        } else {
            response = await square.createCustomer(JSON.parse(rendered)).catch((error) => {
                console.log("Error occured", error)
                return error
            });
        }
        await updateExternalReference(response);
    }
    return response
};

async function checkIfCustomerIsAlreadyInSync(request, idempotencyKey, epccRendered) {
    let isSync = false
    const squareObject = await getSquareObject(request)
    if (squareObject != null) {
        squareObject.idempotencyKey = idempotencyKey
        const squareRendered = nunjucks.render('templates/customer/square_customer.njk', squareObject)
        log.debug("Square rendered", JSON.stringify(JSON.parse(squareRendered)))
        log.debug("EPCC rendered", JSON.stringify(JSON.parse(epccRendered)))
        if (JSON.stringify(JSON.parse(squareRendered)) == JSON.stringify(JSON.parse(epccRendered))) {
            isSync = true
        }
    }
    return isSync
}

async function getSquareObject(request) {
    let squareObject = null
    if ("external_customer_id" in request.payload.data && request.payload.data.external_customer_id != null) {
        const response = await square.getCustomer(request.payload.data.external_customer_id).catch((error) => {
            log.error("Error occured", error)
            return error
        });
        squareObject = response.result
    }
    return squareObject
}

async function updateExternalReference(response) {
    if ("result" in response && "customer" in response.result && "id" in response.result.customer) {
        const customerRequest = {
            type: "customer",
            id: response.result.customer.referenceId,
            external_customer_id: response.result.customer.id
        }
        await epcc.updateCustomer(response.result.customer.referenceId, customerRequest)
    }
}