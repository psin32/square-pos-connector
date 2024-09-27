#! /bin/bash

HOST=$1
CLIENT_ID=$2
CLIENT_SECRET=$3

TOKEN_RESPONSE=$(curl -s -X POST "https://${HOST}/oauth/access_token" -d "client_id=${CLIENT_ID}" -d "client_secret=${CLIENT_SECRET}" -d "grant_type=client_credentials")
ACCESS_TOKEN=$(echo ${TOKEN_RESPONSE} | jq -r '.access_token')

echo "============================================================"
echo "START - Setting up Legacy Product Flow and Fields"
sh bootstrap/create-flow-legacy-product.sh $HOST $ACCESS_TOKEN
echo "COMPLETED - Setting up Legacy Product Flow and Fields"

echo "============================================================"
echo "START - Setting up Customer Flow and Fields"
sh bootstrap/create-flow-customer.sh $HOST $ACCESS_TOKEN
echo "COMPLETED - Setting up Customer Flow and Fields"

echo "============================================================"
echo "START - Setting up Order Flow and Fields"
sh bootstrap/create-flow-order.sh $HOST $ACCESS_TOKEN
echo "COMPLETED - Setting up Order Flow and Fields"

echo "============================================================"
echo "START - Setting up PCM Product Template and Attributes"
sh bootstrap/create-template-pcm-product.sh $HOST $ACCESS_TOKEN
echo "COMPLETED - Setting up PCM Product Template and Attributes"
