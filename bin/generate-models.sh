#!/usr/bin/env bash
set -e

npx openapi bundle --dereferenced --output src/openapi/all --ext yaml src/openapi/api.yaml
npx openapi-typescript src/openapi/all.yaml -o src/generated-schema.ts
rm src/openapi/all.yaml