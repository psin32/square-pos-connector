#! /bin/bash

HOST=$1
ACCESS_TOKEN=$2

FLOW_SLUG_NAME_ORDERS="orders"
FIELD_SLUG_NAME_SQUARE_ORDER_REFERENCE="square_order_reference"

# Retrieve all flows and check if Order flow already exists
FLOW_URL=https://${HOST}/v2/flows
FLOW_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -X GET $FLOW_URL)
ORDER_FLOW_DATA=$(echo ${FLOW_RESPONSE} | jq '.data[] | select(.slug=="'${FLOW_SLUG_NAME_ORDERS}'")')

# In case if Order does not exists then create core flow otherwise retrieve Flow ID
ORDER_FLOW_ID=""
if [ -z "$ORDER_FLOW_DATA" ]
then
    echo "Core flow for Order does not exists, going to create one"
    ORDER_FLOW_CREATION_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -H "Content-Type: application/json" -d @bootstrap/model/order/order_flow.json -X POST $FLOW_URL)
    echo "Order flow creation response - "$ORDER_FLOW_CREATION_RESPONSE
    ORDER_FLOW_ID=$(echo ${ORDER_FLOW_CREATION_RESPONSE} | jq -r '.data.id')
else
    ORDER_FLOW_ID=$(echo ${ORDER_FLOW_DATA} | jq -r '.id')
    echo "Core flow for Order already exists"
fi

if [ -z "$ORDER_FLOW_ID" ]
then
    echo "Unable to get Order flow ID, so not processing further"
else
    echo "Order Flow ID - "$ORDER_FLOW_ID
    FIELD_URL=https://${HOST}/v2/fields

    # Retrieve all fields
    ORDER_FIELD_URL=https://${HOST}/v2/flows/${FLOW_SLUG_NAME_ORDERS}/fields
    FIELD_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -X GET $ORDER_FIELD_URL)

    # Check if square order reference field already exists
    SQUARE_ORDER_REFERENCE_FIELD_DATA=$(echo ${FIELD_RESPONSE} | jq '.data[] | select(.slug=="'${FIELD_SLUG_NAME_SQUARE_ORDER_REFERENCE}'")')

    # Create square order reference field if that does not exists
    if [ -z "$SQUARE_ORDER_REFERENCE_FIELD_DATA" ]
    then
        echo "Square order reference does not exists in Order, going to create one"
        SQUARE_ORDER_REFERENCE_FIELD_DATA=$(cat bootstrap/model/order/square_order_reference_field.json)
        SQUARE_ORDER_REFERENCE_FIELD_REQUEST=${SQUARE_ORDER_REFERENCE_FIELD_DATA/FLOW_ID/$ORDER_FLOW_ID}
        SQUARE_ORDER_REFERENCE_FIELD_CREATION_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -H "Content-Type: application/json" -d "${SQUARE_ORDER_REFERENCE_FIELD_REQUEST}" -X POST $FIELD_URL)
        echo "Square order reference field creation response - "$SQUARE_ORDER_REFERENCE_FIELD_CREATION_RESPONSE
    else
        echo "Square order reference field already exists for order flow"
    fi
fi
