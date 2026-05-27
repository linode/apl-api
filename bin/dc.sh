#!/usr/bin/env bash
set -eo pipefail

source .env

bin_name=$(basename "$0")
command=$1

info="(add '-d' to daemonize, or 'logs' for logs on pre-daemonized stack)"
sub_help () {
    echo "Usage: $bin_name <command>"
    echo
    echo "Commands:"
    echo "   help               This help message"
    echo "   up                 Start docker-compose version of web $info"
    echo "   down               Stop and clean docker-compose containers"
}


sub_up () {
    docker-compose -f docker-compose.yml up ${1}
}

sub_down () {
    docker-compose -f docker-compose.yml down --remove-orphans -v
}

case $command in
    "" | "-h" | "--help")
        sub_help
        ;;
    *)
        shift
        sub_${command} "$@"
        if [ $? = 127 ]; then
            echo "'$command' is not a known command or has errors." >&2
            sub_help
            exit 1
        fi
        ;;
esac
