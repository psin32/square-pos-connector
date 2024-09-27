const { createClient: client } = require("@moltin/request");
const log = require('loglevel');
log.setLevel(process.env.LOG_LEVEL || "info")
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const where = require("lodash.where");

module.exports.getLegacyProduct = async (productId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const response = await epcc.get(`products/${productId}?include=main_image,categories,children,parent`).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}

module.exports.getCustomer = async (customerId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const response = await epcc.get(`customers/${customerId}`).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}

module.exports.updateProduct = async (productId, productRequest) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const response = await epcc.put(`products/${productId}`, productRequest).catch(error => {
    log.error("Error occurred updateProduct", error)
    return error
  })
  return response
}

module.exports.updateCustomer = async (customerId, customerRequest) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const response = await epcc.put(`customers/${customerId}`, customerRequest).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}

module.exports.createCart = async (cartName) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const cartRequest = {
    name: cartName,
    description: "Square Order Id - " + cartName
  }
  const response = await epcc.post(`carts`, cartRequest).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}

module.exports.addToCart = async (cartId, sku, quantity, name, amount) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const addItemRequest = {
    type: "custom_item",
    sku: sku,
    quantity: quantity,
    name: name,
    description: name,
    price: {
      amount: amount,
      includes_tax: true
    }
  }
  const response = await epcc.post(`carts/${cartId}/items`, addItemRequest).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}

module.exports.getCartItems = async (cartId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const response = await epcc.get(`carts/${cartId}/items`).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}

module.exports.checkout = async (cartId, customerName, customer) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const address = {
    first_name: customerName,
    last_name: "",
    line_1: "Store Order",
    city: "Store Order",
    county: "Store Order",
    postcode: "Store Order",
    country: "GB"
  }
  const checkoutRequest = {
    customer: {
      id: customer.data[0].id
    },
    billing_address: address,
    shipping_address: address
  }
  const response = await epcc.post(`carts/${cartId}/checkout`, checkoutRequest).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}


module.exports.getCustomerByEmail = async (customerEmail) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const response = await epcc.get(`customers?filter=eq(email,${customerEmail})`).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}


module.exports.authorizePayment = async (orderId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const authRequest = {
    gateway: "manual",
    method: "authorize"
  }
  const response = await epcc.post(`orders/${orderId}/payments`, authRequest).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}

module.exports.capturePayment = async (orderId, transactionId, squareOrderId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const captureRequest = {
    custom_reference: squareOrderId
  }
  const response = await epcc.post(`orders/${orderId}/transactions/${transactionId}/capture`, captureRequest).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}

module.exports.markOrderAsFulfil = async (orderId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const fulfillRequest = {
    type: "order",
    shipping: "fulfilled"
  }
  const response = await epcc.put(`orders/${orderId}`, fulfillRequest).catch(error => {
    log.error("Error occurred", error)
    return error
  })
  return response
}

module.exports.fetchPCMProduct = async () => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    version: 'pcm',
    host: process.env.EPCC_HOST,
    headers: {
      "EP-Context-Tag": process.env.EP_CONTEXT_TAG,
      'EP-Channel': process.env.EP_CHANNEL,
      'Accept-Language': process.env.ACCEPT_LANGUAGE
    }
  })
  const limit = 25;
  const result = await epcc.get(`catalog/products?page[offset]=0&page[limit]=${limit}`)
  const lastUrl = new URL(`http://null.com${result.links.last}`);
  const lastOffset = lastUrl.searchParams.get('page[offset]') || '0';

  const promises = [];
  for (let i = limit; i <= parseInt(lastOffset); i += limit) {
    await delay(10)
    promises.push(epcc.get(`catalog/products?page[offset]=${i}&page[limit]=${limit}`));
  }
  const results = await Promise.all(promises);

  const products = results.reduce((acc, c) => [...acc, ...c.data], [...result.data]);
  return products;
}

module.exports.getReferenceTemplateId = async () => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const response = await epcc.get(`flows`).catch(error => {
    log.error("Error occurred getReferenceTemplateId", error)
    return error
  })
  let reference = response.data.find((flow) => flow.slug === "products(reference)")
  if (JSON.stringify(reference) != '[]') {
    return reference.id
  }
  return null
}

module.exports.getTemplateAssociatedWithProduct = async (productId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    version: 'pcm',
    host: process.env.EPCC_HOST
  })
  const response = await epcc.get(`products/${productId}/relationships/templates`).catch(error => {
    log.error("Error occurred getTemplateAssociatedWithProduct", error)
    return error
  })
  return response
}

module.exports.createTemplateRelationship = async (productId, templateId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    version: 'pcm',
    host: process.env.EPCC_HOST
  })
  const templateRequest = [
    {
      "type": "template",
      "id": templateId
    }
  ]
  const response = await epcc.post(`products/${productId}/relationships/templates`, templateRequest).catch(error => {
    log.error("Error occurred createTemplateRelationship", error)
    return error
  })
  return response
}

module.exports.getPCMProductByProductID = async (productId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    version: 'pcm',
    host: process.env.EPCC_HOST
  })
  const response = await epcc.get(`products/${productId}?include=main_image`).catch(error => {
    log.error("Error occurred getPCMProductByProductID", error)
    return error
  })
  return response
}


module.exports.createTemplateAttributes = async (templateSlug, request) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST
  })
  const response = await epcc.post(`flows/${templateSlug}/entries`, request).catch(error => {
    log.error("Error occurred while createTemplateAttributes", error)
    return error
  })
  return response
}

module.exports.updateTemplateAttributes = async (templateSlug, productId, request) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST
  })
  const response = await epcc.put(`flows/${templateSlug}/entries/${productId}`, request).catch(error => {
    log.error("Error occurred updateTemplateAttributes", error)
    return error
  })
  return response
}

module.exports.getTemplateAttributes = async (templateSlug, productId) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST
  })
  const response = await epcc.get(`flows/${templateSlug}/entries/${productId}`).catch(error => {
    log.error("Error occurred getTemplateAttributes", error)
    return error
  })
  return response
}

module.exports.updateOrder = async (orderId, request) => {
  const epcc = new client({
    client_id: process.env.EPCC_CLIENT_ID,
    client_secret: process.env.EPCC_CLIENT_SECRET,
    host: process.env.EPCC_HOST,
  })
  const response = await epcc.put(`orders/${orderId}`, request).catch(error => {
    log.error("Error occurred updateOrder", error)
    return error
  })
  return response
}