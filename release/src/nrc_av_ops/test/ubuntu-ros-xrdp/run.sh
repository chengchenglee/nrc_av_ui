#!/bin/bash

CUR_DIR=$(pwd)
CREATE_USERS_PATH=$CUR_DIR/resources/createusers.txt
STARTUP_PATH=$CUR_DIR/resources/startup.sh
SSH_PRIVATE_KEY_PATH=$CUR_DIR/resources/.ssh/hoang.pham
SSH_PUBLIC_KEY_PATH=$CUR_DIR/resources/.ssh/hoang.pham.pub

# shellcheck source=/dev/null
source "$CUR_DIR"/color.sh

# --------------------- 0. Check dependencies --------------------- #
config=$1
if [ ! -f "$config" ]; then
    Color "config file $config not valid\n" red
    exit 2
fi

test_json=$(echo "{ }" | jq)
if [ "$test_json" != "{}" ]; then
    Color "jq not installed\n" red
    exit 1
fi

if [ ! -f "$CREATE_USERS_PATH" ]; then
    Color "File $CREATE_USERS_PATH not found\n" red
    exit 2
fi

if [ ! -f "$STARTUP_PATH" ]; then
    Color "File $STARTUP_PATH not found\n" red
    exit 2
fi

if [ ! -f "$SSH_PRIVATE_KEY_PATH" ]; then
    Color "File $SSH_PRIVATE_KEY_PATH not found\n" red
    exit 2
fi

if [ ! -f "$SSH_PUBLIC_KEY_PATH" ]; then
    Color "File $SSH_PUBLIC_KEY_PATH not found\n" red
    exit 2
fi
# ----------------------------------------------------------------- #

# 1. Check image "ubuntu-ros-xrdp" exist in system, if not build it #
imageName="nissan/ubuntu-ros-xrdp"
isImageExist=$(docker image ls | grep -c $imageName)
if [ "$isImageExist" -eq 0 ]; then
    sh -c "docker build -f ./Dockerfile -t $imageName ."
fi
# ----------------------------------------------------------------- #

# ------------------ 2. Loop and create container ----------------- #
json=$(cat "$config")
for conf in $(echo "$json" | jq -r '.[] | @base64'); do
    _jq() {
        echo "$conf" | base64 --decode | jq -r "$1"
    }
    name=$(_jq '.name')
    xrdp_exposed_port=$(_jq '.xrdp_port')
    ssh_exposed_port=$(_jq '.ssh_port')

    echo "$(Color "Starting:" yellow -b -i)" "$(Color "$name - $xrdp_exposed_port - $ssh_exposed_port" yellow)"
    isRunning=$(docker container ls | grep -c "$name")
    if [ "$isRunning" -eq 1 ]; then
        docker container rm "$name" -f
    fi
    docker run \
        -dit \
        --name "$name" \
        --restart=always \
        --privileged \
        -p "$xrdp_exposed_port":3389 \
        -p "$ssh_exposed_port":22 \
        -v "$CREATE_USERS_PATH":/root/createusers.txt:ro \
        -v "$STARTUP_PATH":/root/startup.sh:ro \
        -v "$SSH_PRIVATE_KEY_PATH":/root/.ssh/id_rsa:ro \
        -v "$SSH_PUBLIC_KEY_PATH":/root/.ssh/id_rsa.pub:ro \
        -e TZ="Asia/Ho_Chi_Minh" \
        $imageName
done
# ----------------------------------------------------------------- #
