#!/usr/bin/env sh

set -e

org=redkubes
repo="ssh://git@github.com/redkubes/otomi-api.git"

vendor="otomi-api"
type="axios"
openapi_doc="./vendors/openapi/$vendor.json"
registry="https://npm.pkg.github.com/"
target_dir="./vendors/client/$vendor/$type"
target_package_json="$target_dir/package.json"
target_npm_name="@$org/$vendor-client-$type"

validate() {

    if ! which sponge > /dev/null; then
        echo "The sponge binary does not exist. To install it execute: 'brew install moreutils'"
        exit 1
    fi

    if [ -z "$vendor" ]; then
        echo "No vendor argument supplied.\nUsage:\n\t./bin/generate-client.sh <vendor-name>"
        exit 1
    fi

    if [ -d "$target_dir" ]; then
        echo "The directoy $target_dir already exists. Please choose different vendor name or remove existing directory."
        exit 1
    fi
}

generate_client() {
    echo "Generating client code from openapi specification $openapi_doc.."

    docker run --rm -v $PWD:/local -w /local busybox pwd && ls -als vendors/ && ls -als vendors/openapi/

    docker run --rm -v $PWD:/local -w /local \
    openapitools/openapi-generator-cli:v5.0.1 generate \
    -i /local/$openapi_doc \
    -o /local/$target_dir \
    -g typescript-node \
    --additional-properties supportsES6=true,npmName=$target_npm_name
}

set_package_json() {
    echo "Updating  $target_package_json file.."

    jq \
    --arg type 'git' \
    --arg url $repo \
    --arg directory "packages/vendors/$vendor" \
    --arg registry $registry \
    '. + {"repository": {"type": $type, "url": $url, "directory": $directory}, "publishConfig": {"registry": $registry}}' \
    $target_package_json \
    | sponge $target_package_json

}

build_npm_package() {
    echo "Building $target_npm_name npm package"
    cd $target_dir
    npm install && npm run build
    cd -
}

rm -rf $target_dir >/dev/null
validate
generate_client 
set_package_json
build_npm_package

echo "The client code has been generated at $target_dir/ directory"

echo "In order to publish an npm package run:\n\t cd $target_dir && npm publish"
