'use strict';
const LegacyService = require('./components/LegacyService');
const CustomerService = require('./components/CustomerService');
const OrderService = require('./components/OrderService');
const PCMService = require('./components/PCMService');
const log = require('loglevel');
log.setLevel(process.env.LOG_LEVEL || "info")


module.exports.legacyProductSync = async (event) => {
  let statusCode = 200
  const request = JSON.parse(event.body);
  let response = await LegacyService.productSync(request);
  if ("statusCode" in response) {
    statusCode = response.statusCode
  }

  return {
    statusCode: statusCode,
    body: JSON.stringify(response, (key, value) => typeof value === 'bigint' ? value.toString() : value)
  };
};

module.exports.customerSync = async (event) => {
  let statusCode = 200
  const request = JSON.parse(event.body);
  let response = await CustomerService.createCustomer(request);
  if ("statusCode" in response) {
    statusCode = response.statusCode
  }

  return {
    statusCode: statusCode,
    body: JSON.stringify(response, (key, value) => typeof value === 'bigint' ? value.toString() : value)
  };
};

module.exports.orderSync = async (event) => {
  let statusCode = 200
  const request = JSON.parse(event.body);
  let response = await OrderService.createOrder(request);
  if ("statusCode" in response) {
    statusCode = response.statusCode
  }

  return {
    statusCode: statusCode,
    body: JSON.stringify(response, (key, value) => typeof value === 'bigint' ? value.toString() : value)
  };
};

module.exports.productPCMFullSync = async (event) => {
  log.info("PCM Product full sync is starting")
  await PCMService.productFullSync();

  return {
    statusCode: 200
  };
};
