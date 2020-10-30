function drun() {
  docker run --rm -v $PWD:/tmp/sh -w /tmp/sh busybox sh -c ". bin/aliases.sh && $@"
}

function update_openapi_version() {
  PACKAGE_VERSION=$(cat package.json | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]')
  sed -ri "s/^(\s*)version\s*:\s(.*)$/\1version: $PACKAGE_VERSION/" src/openapi/api.yaml
}

function release_otomi() {
  rm -rf vendors/client/otomi-api/axios >/dev/null
  npm run build:client:otomi
  cd vendors/client/otomi-api/axios
  npm publish
  cd -
}
