#!/usr/bin/env bash
set -exuo pipefail
source .env
BIN_NAME=$(basename "$0")
COMMAND_NAME=$1

info="(add '-d' to daemonize, or 'logs' for logs on pre-daemonized stack)"
sub_help () {
    echo "Usage: $BIN_NAME <command>"
    echo
    echo "Commands:"
    echo "   help               This help message"
    echo "   up                 Start standalone docker-compose version of web without dependent services $info"
    echo "   up-all             Start docker-compose version of web with dependent services $info"
    echo "   up-deps            Start docker-compose version of only dependent services $info"
    echo "   down               Stop and clean docker-compose containers"
}


sub_up () {
    docker-compose -f docker-compose.yml up ${1-}
}

sub_up-all () {
    local files='-f docker-compose.yml -f docker-compose-deps.yml'
    [ "$USE_SOPS" == "0" ] && echo "The USE_SOPS=$USE_SOPS prevents running deps" && files='-f docker-compose.yml'

    docker-compose $files up ${1-}
}

sub_up-deps () {
    [ "$USE_SOPS" == "0" ] && echo "The USE_SOPS=$USE_SOPS prevents running deps" && exit 0
    docker-compose -f docker-compose-deps.yml up ${1-}
}

sub_down () {
    docker-compose -f docker-compose.yml -f docker-compose-deps.yml down --remove-orphans
}

case $COMMAND_NAME in
    "" | "-h" | "--help")
        sub_help
        ;;
    *)
        shift
        sub_${COMMAND_NAME} $@
        if [ $? = 127 ]; then
            echo "'$COMMAND_NAME' is not a known command or has errors." >&2
            sub_help
            exit 1
        fi
        ;;
esac
