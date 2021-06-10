#!/usr/bin/env bash

set -e

org=redkubes
repo="ssh://git@github.com/redkubes/otomi-api.git"

vendor="otomi-api"
type="axios"
openapi_doc="vendors/openapi/otomi-api.json"
registry="https://npm.pkg.github.com/"
target_dir="vendors/client/$vendor/$type"
target_package_json="$target_dir/package.json"
target_npm_name="@$org/$vendor-client-$type"

validate() {

    if [ -z "$vendor" ]; then
        printf "No vendor argument supplied.\nUsage:\n\tbin/generate-client.sh <vendor-name>\n"
        exit 1
    fi

    if [ ! -f "$openapi_doc" ]; then
        echo "The file $openapi_doc does not exist."
        exit 1
    fi
}

clean_up() {
    if [ -f vendors/openapi/otomi-api.json ]; then
        rm vendors/openapi/otomi-api.json
    fi 
    rm -rf vendors/client/otomi-api >/dev/null
}

generate_client() {
    echo "Generating client code from openapi specification $openapi_doc..."

    # npx openapi bundle --output src/openapi --ext yaml src/openapi/api.yaml
    npm run build:spec

    docker run --rm -v $PWD:/local -w /local -u "$(id -u $USER)" \
    openapitools/openapi-generator-cli:v5.1.0 generate \
    -i /local/$openapi_doc \
    -o /local/$target_dir \
    -g typescript-node \
    --additional-properties supportsES6=true,npmName=$target_npm_name,modelPropertyNaming=original,enumPropertyNaming=original \
    --generate-alias-as-model 
}

set_package_json() {
    echo "Updating $target_package_json file..."

    jq \
    --arg type 'git' \
    --arg url $repo \
    --arg directory "packages/vendors/$vendor" \
    --arg registry $registry \
    '. + {"repository": {"type": $type, "url": $url, "directory": $directory}, "publishConfig": {"registry": $registry}}' \
    $target_package_json > /tmp/pkg.json
    mv /tmp/pkg.json $target_package_json

}

# Anyone may delete this function if the breaking change is no longer present
# But please check by running `tsc` in client library package.json.
# TODO https://github.com/DefinitelyTyped/DefinitelyTyped/issues/53100
set_bluebird() {
    if [ -f "$target_package_json" ]; then
        echo "Setting @types/bluebird to 3.5.34..."

        cat <<< "$(jq '.dependencies."@types/bluebird" = "3.5.34"' $target_package_json)" > /tmp/pkg.json && \
        mv /tmp/pkg.json $target_package_json
    fi
}

build_npm_package() {
    cd $target_dir && echo "Building $target_npm_name npm package..."
    npm install && npm run build
    cd -
}

validate
clean_up
generate_client 
set_package_json
set_bluebird
build_npm_package

echo "The client code has been generated at $target_dir/ directory."
