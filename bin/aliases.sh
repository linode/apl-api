function drun() {
  docker run --rm -e NPM_TOKEN=$NPM_TOKEN -v $PWD:/tmp/sh -w /tmp/sh busybox sh -c "$@"
}
