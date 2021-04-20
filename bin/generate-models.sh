#!/usr/bin/env bash
set -e

api_file=src/openapi.yaml
npx openapi bundle --output src/openapi --ext yaml src/openapi/api.yaml
npx openapi bundle --dereferenced --output src/openapi-dereferenced --ext yaml src/openapi/api.yaml
npx openapi-typescript src/openapi-dereferenced.yaml -o src/generated-schema.ts
