#!/usr/bin/env bash
set -ex

# yq() {
#   docker run --rm -i -v "${PWD}":/workdir mikefarah/yq "$@"
# }

api_file=src/openapi.yaml
npx openapi bundle --dereferenced --output src/openapi --ext yaml src/openapi/api.yaml
npx openapi-typescript $api_file -o src/generated-schema.ts
