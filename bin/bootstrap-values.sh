#!/usr/bin/env bash
set -eo pipefail

dir=values
echo "Bootstrapping values at $PWD/$dir"
rm -rf "$dir"
mkdir -p "$dir"
curl -s -L https://github.com/redkubes/otomi-core/archive/refs/heads/master.zip | tar --strip-components=3 -C "$dir" -zxf - otomi-core-master/tests/fixtures
cd "$dir"
{ git init; git checkout -b main; git add "*"; git commit -a -m'init'; } >> /dev/null

echo "Success"