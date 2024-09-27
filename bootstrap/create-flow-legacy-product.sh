#! /bin/bash

HOST=$1
ACCESS_TOKEN=$2

FLOW_SLUG_NAME_LEGACY_PRODUCT="products"
FIELD_SLUG_NAME_ITEM_REFERENCE="item_reference"
FIELD_SLUG_NAME_ITEM_VARIATION_REFERENCE="item_variation_reference"
FIELD_SLUG_NAME_IMAGE_REFERENCE="image_reference"
FIELD_SLUG_NAME_MAIN_IMAGE_ID="main_image_id"

# Retrieve all flows and check if Legacy Product flow already exists
FLOW_URL=https://${HOST}/v2/flows
FLOW_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -X GET $FLOW_URL)
LEGACY_PRODUCT_FLOW_DATA=$(echo ${FLOW_RESPONSE} | jq '.data[] | select(.slug=="'${FLOW_SLUG_NAME_LEGACY_PRODUCT}'")')

# In case if Legacy Product does not exists then create core flow otherwise retrieve Flow ID
LEGACY_PRODUCT_FLOW_ID=""
if [ -z "$LEGACY_PRODUCT_FLOW_DATA" ]
then
    echo "Core flow for Legacy Product does not exists, going to create one"
    LEGACY_PRODUCT_FLOW_CREATION_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -H "Content-Type: application/json" -d @bootstrap/model/legacy_product/legacy_product_flow.json -X POST $FLOW_URL)
    echo "Legacy Product flow creation response - "$LEGACY_PRODUCT_FLOW_CREATION_RESPONSE
    LEGACY_PRODUCT_FLOW_ID=$(echo ${LEGACY_PRODUCT_FLOW_CREATION_RESPONSE} | jq -r '.data.id')
else
    LEGACY_PRODUCT_FLOW_ID=$(echo ${LEGACY_PRODUCT_FLOW_DATA} | jq -r '.id')
    echo "Core flow for Legacy Product already exists"
fi

if [ -z "$LEGACY_PRODUCT_FLOW_ID" ]
then
    echo "Unable to get Legacy Product flow ID, so not processing further"
else
    echo "Legacy Product Flow ID - "$LEGACY_PRODUCT_FLOW_ID
    FIELD_URL=https://${HOST}/v2/fields

    # Retrieve all fields
    LEGACY_PRODUCT_FIELD_URL=https://${HOST}/v2/flows/${FLOW_SLUG_NAME_LEGACY_PRODUCT}/fields
    FIELD_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -X GET $LEGACY_PRODUCT_FIELD_URL)

    # Check if item reference field already exists
    ITEM_REFERENCE_FIELD_DATA=$(echo ${FIELD_RESPONSE} | jq '.data[] | select(.slug=="'${FIELD_SLUG_NAME_ITEM_REFERENCE}'")')

    # Create item reference field if that does not exists
    if [ -z "$ITEM_REFERENCE_FIELD_DATA" ]
    then
        echo "Item reference field does not exists in Legacy Product, going to create one"
        item_reference_field_data=$(cat bootstrap/model/legacy_product/item_reference_field.json)
        ITEM_REFERENCE_FIELD_REQUEST=${item_reference_field_data/FLOW_ID/$LEGACY_PRODUCT_FLOW_ID}
        ITEM_REFERENCE_FIELD_CREATION_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -H "Content-Type: application/json" -d "${ITEM_REFERENCE_FIELD_REQUEST}" -X POST $FIELD_URL)
        echo "Item reference field creation response - "$ITEM_REFERENCE_FIELD_CREATION_RESPONSE
    else
        echo "Item reference field already exists for legacy product flow"
    fi

    # Check if item variation reference field already exists
    ITEM_VARIATION_REFERENCE_FIELD_DATA=$(echo ${FIELD_RESPONSE} | jq '.data[] | select(.slug=="'${FIELD_SLUG_NAME_ITEM_VARIATION_REFERENCE}'")')

    # Create item variation reference field if that does not exists
    if [ -z "$ITEM_VARIATION_REFERENCE_FIELD_DATA" ]
    then
        echo "Item variation reference field does not exists in Legacy Product, going to create one"
        item_variation_reference_field_data=$(cat bootstrap/model/legacy_product/item_variation_reference_field.json)
        ITEM_VARIATION_REFERENCE_FIELD_REQUEST=${item_variation_reference_field_data/FLOW_ID/$LEGACY_PRODUCT_FLOW_ID}
        ITEM_VARIATION_REFERENCE_FIELD_CREATION_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -H "Content-Type: application/json" -d "${ITEM_VARIATION_REFERENCE_FIELD_REQUEST}" -X POST $FIELD_URL)
        echo "Item variation reference field creation response - "$ITEM_VARIATION_REFERENCE_FIELD_CREATION_RESPONSE
    else
        echo "Item variation reference field already exists for legacy product flow"
    fi

    # Check if image reference field already exists
    IMAGE_REFERENCE_FIELD_DATA=$(echo ${FIELD_RESPONSE} | jq '.data[] | select(.slug=="'${FIELD_SLUG_NAME_IMAGE_REFERENCE}'")')

    # Create image reference field if that does not exists
    if [ -z "$IMAGE_REFERENCE_FIELD_DATA" ]
    then
        echo "Image reference field does not exists in Legacy Product, going to create one"
        image_reference_field_data=$(cat bootstrap/model/legacy_product/image_reference_field.json)
        IMAGE_REFERENCE_FIELD_REQUEST=${image_reference_field_data/FLOW_ID/$LEGACY_PRODUCT_FLOW_ID}
        IMAGE_REFERENCE_FIELD_CREATION_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -H "Content-Type: application/json" -d "${IMAGE_REFERENCE_FIELD_REQUEST}" -X POST $FIELD_URL)
        echo "Image reference field creation response - "$IMAGE_REFERENCE_FIELD_CREATION_RESPONSE
    else
        echo "Image reference field already exists for legacy product flow"
    fi

    # Check if main image id field already exists
    MAIN_IMAGE_ID_FIELD_DATA=$(echo ${FIELD_RESPONSE} | jq '.data[] | select(.slug=="'${FIELD_SLUG_NAME_MAIN_IMAGE_ID}'")')

    # Create main image id field if that does not exists
    if [ -z "$MAIN_IMAGE_ID_FIELD_DATA" ]
    then
        echo "Main image id field does not exists in Legacy Product, going to create one"
        main_image_id_field_data=$(cat bootstrap/model/legacy_product/main_image_id_field.json)
        MAIN_IMAGE_ID_FIELD_REQUEST=${main_image_id_field_data/FLOW_ID/$LEGACY_PRODUCT_FLOW_ID}
        MAIN_IMAGE_ID_FIELD_CREATION_RESPONSE=$(curl -s -H "Authorization: ${ACCESS_TOKEN}" -H "Content-Type: application/json" -d "${MAIN_IMAGE_ID_FIELD_REQUEST}" -X POST $FIELD_URL)
        echo "Main image id field creation response - "$MAIN_IMAGE_ID_FIELD_CREATION_RESPONSE
    else
        echo "Main image id field already exists for legacy product flow"
    fi
fi
