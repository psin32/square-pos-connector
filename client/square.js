const { Client, Environment, ApiError } = require('square')
const log = require('loglevel');
log.setLevel(process.env.LOG_LEVEL || "info")

const client = new Client({
  environment: process.env.SQUARE_ENVIRONMENT,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
})

module.exports.retrieveCatalogObject = async (objectId) => {
  const catalogApi = client.catalogApi;
  const response = await catalogApi.retrieveCatalogObject(objectId).catch(error => {
    log.error("Error occurred", error)
    error.statusCode = 400
    return error
  });
  return response;
}

module.exports.upsertCatalogObject = async (body) => {
  const catalogApi = client.catalogApi;
  const response = await catalogApi.upsertCatalogObject(body).catch(error => {
    log.error("Error occurred", error)
    error.statusCode = 400
    return error
  });
  return response;
}

module.exports.createCatalogImage = async (body, file) => {
  const catalogApi = client.catalogApi;
  const response = await catalogApi.createCatalogImage(body,file).catch(error => {
    log.error("Error occurred", error)
    error.statusCode = 400
    return error
  });
  return response;
}

module.exports.batchUpsertCatalogObjects = async (body) => {
  const catalogApi = client.catalogApi;
  try {
    const response = await catalogApi.batchUpsertCatalogObjects(body);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      const errors = error.result;
      return errors
    }
  }
}

module.exports.createCustomer = async (body) => {
  const customersApi = client.customersApi;
  try {
    const response = await customersApi.createCustomer(body);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      const errors = error.result;
      return errors
    }
  }
}

module.exports.updateCustomer = async (customerId, body) => {
  const customersApi = client.customersApi;
  try {
    const response = await customersApi.updateCustomer(customerId, body);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      const errors = error.result;
      return errors
    }
  }
}

module.exports.getCustomer = async (customerId) => {
  const customersApi = client.customersApi;
  const response = await customersApi.retrieveCustomer(customerId).catch(error => {
    log.error("Error occurred", error)
    error.statusCode = 400
    return error
  });
  return response;
}

module.exports.getOrder = async (orderId) => {
  const ordersApi = client.ordersApi;
  const response = await ordersApi.retrieveOrder(orderId).catch(error => {
    log.error("Error occurred", error)
    error.statusCode = 400
    return error
  });
  return response;
}