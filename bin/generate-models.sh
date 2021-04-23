#!/usr/bin/env bash
set -e

api_file=src/openapi-dereferenced.json
npx openapi bundle --dereferenced --output src/openapi-dereferenced --ext json src/openapi/api.yaml
npx openapi-typescript $api_file -o src/generated-schema.ts
