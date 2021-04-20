#!/usr/bin/env bash

set -e

org=redkubes
repo="ssh://git@github.com/redkubes/otomi-api.git"

vendor="otomi-api"
type="axios"
openapi_doc="vendors/openapi/$vendor.json"
registry="https://npm.pkg.github.com/"
target_dir="vendors/client/$vendor/$type"
target_package_json="$target_dir/package.json"
target_npm_name="@$org/$vendor-client-$type"

validate() {

    if [ -z "$vendor" ]; then
        echo "No vendor argument supplied.\nUsage:\n\tbin/generate-client.sh <vendor-name>"
        exit 1
    fi

    if [ ! -f "$openapi_doc" ]; then
        echo "The file $openapi_doc does not exist."
        exit 1
    fi
}

generate_client() {
    echo "Generating client code from openapi specification $openapi_doc.."
    rm -rf $target_dir >/dev/null
    docker run --rm -v $PWD:/local -w /local -u "$(id -u $USER)" \
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
    $target_package_json > /tmp/pkg.json
    mv /tmp/pkg.json $target_package_json

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
