const epcc = require('../client/epcc');
const square = require('../client/square');

const nunjucks = require('nunjucks')
nunjucks.configure({ autoescape: false, trimBlocks: true, lstripBlocks: true });

const log = require('loglevel');
log.setLevel(process.env.LOG_LEVEL || "info")

module.exports.createOrder = async (request) => {
    const type = request.type
    const status = request.data.object.payment.status
    if (type === "payment.updated" && status === "COMPLETED") {
        const orderId = request.data.object.payment.order_id
        const orderResponse = await square.getOrder(orderId).catch((error) => {
            log.error("Error occured", error)
            return error
        });

        if ("statusCode" in orderResponse && orderResponse.statusCode != 400) {
            if ("result" in orderResponse && "order" in orderResponse.result && "customerId" in orderResponse.result.order) {
                const customerId = orderResponse.result.order.customerId
                const customerResponse = await square.getCustomer(customerId).catch((error) => {
                    log.error("Error occured", error)
                    return error
                });
                if ("statusCode" in customerResponse && customerResponse.statusCode != 400) {
                    const customerEmail = customerResponse.result.customer.emailAddress
                    const customerName = customerResponse.result.customer.givenName
                    const customer = await epcc.getCustomerByEmail(customerEmail)
                    const cartResponse = await epcc.createCart(orderId)
                    log.debug("Cart Creation Response", cartResponse)
                    const cartId = cartResponse.data.id
                    await addItemsToCart(cartId, orderResponse)
                    const order = await epcc.checkout(cartId, customerName, customer)
                    const orderUpdateRequest = {
                        type: "order",
                        square_order_reference: orderId
                    }
                    await epcc.updateOrder(order.data.id, orderUpdateRequest)
                    const authResponse = await epcc.authorizePayment(order.data.id)
                    await epcc.capturePayment(order.data.id, authResponse.data.id, orderId)
                    return await epcc.markOrderAsFulfil(order.data.id)
                } else {
                    return customerResponse
                }
            } else {
                log.warn("Ignoring message as customer is not associated with the order")
                return {
                    message: "Ignoring message as customer is not associated with the order"
                }
            }
        }
        return orderResponse
    }
    log.warn("Ignoring message as either type of event is not payment.updated or status is not COMPLETED.")
    return {
        message: "Ignoring message as either type of event is not payment.updated or status is not COMPLETED."
    }
};


async function addItemsToCart(cartId, response) {
    if ("result" in response && "order" in response.result && "lineItems" in response.result.order) {
        for (const item of response.result.order.lineItems) {
            const itemId = item.catalogObjectId
            const itemResponse = await square.retrieveCatalogObject(itemId).catch((error) => {
                log.error("Error occured", error)
                return error
            });
            if ("statusCode" in itemResponse && itemResponse.statusCode != 400) {
                const sku = itemResponse.result.object.itemVariationData.sku + "#"
                const name = itemResponse.result.object.itemVariationData.name
                const quantity = parseInt(item.quantity)
                const amount = parseInt(item.totalMoney.amount) / quantity
                await epcc.addToCart(cartId, sku, quantity, name, amount)
            }
        }
    }
}