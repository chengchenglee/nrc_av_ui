#!/bin/bash

CURDIR=$(pwd)
PROJECT_NAME="nrc_av_deploy_prod"

# shellcheck source=/dev/null
source "$CURDIR"/../color.sh

function stopDocker() {
    local name=$1
    docker-compose -f ./docker-compose.yml --env-file ./.env.production -p $PROJECT_NAME down --remove-orphans --rmi local -v "$name"
}

function stopAndRemoveFrontend() {
    stopDocker "frontend_service"
}

function stopAndRemoveBackend() {
    stopDocker "backend_service"
}

function stopAndRemoveDatabase() {
    stopDocker "backend_db"
}

function stopAndRemoveAll() {
    docker-compose -f ./docker-compose.yml --env-file ./.env.production -p $PROJECT_NAME down --remove-orphans --rmi local -v
}

function deployProduction() {
    git submodule update --remote
    docker-compose -f ./docker-compose.yml --env-file ./.env.production -p $PROJECT_NAME up -d --build --always-recreate-deps
}

function migrateDatabase() {
    docker-compose -f ./docker-compose.yml --env-file ./.env.production -p $PROJECT_NAME up -d flyway_service_dev
}

function handleOption() {
    local opt=$1
    case $opt in
    1) stopAndRemoveFrontend ;;
    2) stopAndRemoveBackend ;;
    3) stopAndRemoveDatabase ;;
    4) stopAndRemoveAll ;;
    5) deployProduction ;;
    6) migrateDatabase ;;
    0)
        clear
        exit 0
        ;;
    *) Color "Wrong option." red ;;
    esac
}

menu() {
    printf "\n"
    echo "+-------- Docker Manager --------+"
    echo "| $(Color '1)' green) Stop & Remove Front-end     |"
    echo "| $(Color '2)' green) Stop & Remove Back-end      |"
    echo "| $(Color '3)' green) Stop & Remove Database      |"
    echo "| $(Color '4)' green) Stop & Remove all           |"
    echo "| $(Color '5)' green) Deploy Production           |"
    echo "| $(Color '6)' green) Migrate Database            |"
    echo "| $(Color '0)' green) Exit                        |"
    echo "+--------------------------------+"
    Color "Choose an option: " blue

    read -r opt
    handleOption "$opt"
    menu
}

menu
