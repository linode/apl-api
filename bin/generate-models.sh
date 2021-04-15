#!/usr/bin/env bash
set -e

api_file=src/openapi.yaml
npx openapi bundle --dereferenced --output src/openapi --ext yaml src/openapi/api.yaml
npx openapi-typescript $api_file -o src/generated-schema.ts
