#!/usr/bin/env sh
set -e
PACKAGE_VERSION=$(jq .version -r package.json)
sed -i -e "s/\(version:.*\)/version: $PACKAGE_VERSION/" src/openapi/api.yaml

for type in 'axios'; do
  echo "Publishing newer client: otomi-api-$type"
  cd vendors/client/otomi-api/$type
  npm publish --access public
  cd -
done
exit 0