#!/usr/bin/env sh

set -e

DIR=$(pwd)
ORG=redkubes
REPO="ssh://git@github.com/redkubes/otomi-api.git"

VENDOR="otomi-api"
TYPE="axios"
OPENAPI_DOC="./vendors/openapi/${VENDOR}.json"
REGISTRY="https://npm.pkg.github.com/"
TARGET_DIR="./vendors/client/${VENDOR}/${TYPE}"
TARGET_PACKAGE_JSON="${TARGET_DIR}/package.json"
TARGET_NPM_NAME="@${ORG}/$VENDOR-client-${TYPE}"

validate() {

    if ! which sponge > /dev/null; then
        echo "The sponge binary does not exist. To install it execute: 'brew install moreutils'"
        exit 1
    fi

    if [ -z "$VENDOR" ]; then
        echo "No vendor argument supplied.\nUsage:\n\t./bin/generate-client.sh <vendor-name>"
        exit 1
    fi

    if [ -d "$TARGET_DIR" ]; then
        echo "The directoy $TARGET_DIR already exists. Please choose different vendor name or remove existing directory."
        exit 1
    fi
}

generate_client() {
    echo "Generating client code from openapi specification ${OPENAPI_DOC}.."

    docker run --rm -v ${PWD}:/local \
    openapitools/openapi-generator-cli generate \
    -i /local/${OPENAPI_DOC} \
    -o /local/${TARGET_DIR} \
    -g typescript-node \
    --additional-properties supportsES6=true,npmName=${TARGET_NPM_NAME}
}

set_package_json() {
    echo "Updating  $TARGET_PACKAGE_JSON file.."

    jq \
    --arg type 'git' \
    --arg url ${REPO} \
    --arg directory "packages/vendors/${VENDOR}" \
    --arg registry ${REGISTRY} \
    '. + {"repository": {"type": $type, "url": $url, "directory": $directory}, "publishConfig": {"registry": $registry}}' \
    ${TARGET_PACKAGE_JSON} \
    | sponge ${TARGET_PACKAGE_JSON}

}

build_npm_package() {
    echo "Building $TARGET_NPM_NAME npm package"
    cd ${TARGET_DIR}
    npm install && npm run build
    cd $DIR
}

rm -rf $TARGET_DIR >/dev/null
validate
generate_client 
set_package_json
build_npm_package

echo "The client code has been generated at ${TARGET_DIR}/ directory"

echo "In order to publish an NPM package run:\n\t cd ${TARGET_DIR} && npm publish"
