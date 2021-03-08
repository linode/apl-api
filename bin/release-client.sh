#!/usr/bin/env sh
set -e

PACKAGE_VERSION=$(cat package.json | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]')
sed -ri "s/^(\s*)version\s*:\s(.*)$/\1version: $PACKAGE_VERSION/" src/openapi/api.yaml

for type in 'axios'; do
  echo "Publishing newer client: otomi-api-$type"
  cd vendors/client/otomi-api/$type
  npm publish --access public
  cd -
done
exit 0