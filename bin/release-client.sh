#!/usr/bin/env sh
set -e
for type in 'axios'; do
  echo "Publishing newer client: otomi-api-$type"
  cd vendors/client/otomi-api/$type
  npm publish --access public
  cd -
done
exit 0