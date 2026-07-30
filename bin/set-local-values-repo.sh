#!/usr/bin/env bash
set -euo pipefail
readonly apl_core_test_fixtures="$HOME/workspace/linode/apl-core/tests/fixtures"
readonly env_dir="$HOME/workspace/linode/values-ofld1"
readonly tmp_otomi_dir="/tmp/otomi"

function create_bare_git_repo {
    rm -rf "$env_dir"
    mkdir -p "$(dirname "$env_dir")"
    cp -R "$apl_core_test_fixtures" "$env_dir"
    cd "$env_dir"
    git init
    git add .
    git commit -a -m 'init'
    # Mark this repo as bare so the local_env_dir can push to env_dir repo
    git config --bool core.bare true
    echo "The values bare repo has been successfully set up at $env_dir"
}

function clean_tmp_otomi {
    rm -rf "$tmp_otomi_dir"
    mkdir -p "$tmp_otomi_dir"
    echo "The temporary otomi directory has been cleaned up at $tmp_otomi_dir"
}

create_bare_git_repo
clean_tmp_otomi
