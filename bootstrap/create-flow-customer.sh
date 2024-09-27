#! /bin/bash

HOST=$1
ACCESS_TOKEN=$2

FLOW_SLUG_NAME_CUSTOMER="customers"
FIELD_SLUG_NAME_EXTERNAL_CUSTOMER_ID="external_customer_id"

# Retrieve all flows and check if Customer flow already exists
FLOW_URL=https://${HOST}/v2/flows
FLOW_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -X GET $FLOW_URL)
CUSTOMER_FLOW_DATA=$(echo ${FLOW_RESPONSE} | jq '.data[] | select(.slug=="'${FLOW_SLUG_NAME_CUSTOMER}'")')

# In case if Customer does not exists then create core flow otherwise retrieve Flow ID
CUSTOMER_FLOW_ID=""
if [ -z "$CUSTOMER_FLOW_DATA" ]
then
    echo "Core flow for Customer does not exists, going to create one"
    CUSTOMER_FLOW_CREATION_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -H "Content-Type: application/json" -d @bootstrap/model/customer/customer_flow.json -X POST $FLOW_URL)
    echo "Customer flow creation response - "$CUSTOMER_FLOW_CREATION_RESPONSE
    CUSTOMER_FLOW_ID=$(echo ${CUSTOMER_FLOW_CREATION_RESPONSE} | jq -r '.data.id')
else
    CUSTOMER_FLOW_ID=$(echo ${CUSTOMER_FLOW_DATA} | jq -r '.id')
    echo "Core flow for Customer already exists"
fi

if [ -z "$CUSTOMER_FLOW_ID" ]
then
    echo "Unable to get Customer flow ID, so not processing further"
else
    echo "Customer Flow ID - "$CUSTOMER_FLOW_ID
    FIELD_URL=https://${HOST}/v2/fields

    # Retrieve all fields
    CUSTOMER_FIELD_URL=https://${HOST}/v2/flows/${FLOW_SLUG_NAME_CUSTOMER}/fields
    FIELD_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -X GET $CUSTOMER_FIELD_URL)

    # Check if external customer id field already exists
    EXTERNAL_CUSTOMER_ID_FIELD_DATA=$(echo ${FIELD_RESPONSE} | jq '.data[] | select(.slug=="'${FIELD_SLUG_NAME_EXTERNAL_CUSTOMER_ID}'")')

    # Create external customer id field if that does not exists
    if [ -z "$EXTERNAL_CUSTOMER_ID_FIELD_DATA" ]
    then
        echo "External customer id does not exists in Customer, going to create one"
        external_customer_id_field_data=$(cat bootstrap/model/customer/external_customer_id_field.json)
        EXTERNAL_CUSTOMER_ID_FIELD_REQUEST=${external_customer_id_field_data/FLOW_ID/$CUSTOMER_FLOW_ID}
        EXTERNAL_CUSTOMER_ID_FIELD_CREATION_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -H "Content-Type: application/json" -d "${EXTERNAL_CUSTOMER_ID_FIELD_REQUEST}" -X POST $FIELD_URL)
        echo "External customer id field creation response - "$EXTERNAL_CUSTOMER_ID_FIELD_CREATION_RESPONSE
    else
        echo "External customer id field already exists for customer flow"
    fi
fi
