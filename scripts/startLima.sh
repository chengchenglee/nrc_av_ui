#!/bin/bash

RPI_IP="192.168.1.10"

#Interval between checks (in seconds)
CHECK_INTERVAL=30


#check internet connection
check_internet() {
    if ping -c 1 8.8.8.8 &> /dev/null
    then
        echo "Internet connetion: OK"
        return 0
    else 
        echo "Internet conneciton: FAILED"
        return 1
    fi
}


# Check if the Raspberry Pi is on the network
check_rpi() {
    if ping -c 1 $RPI_IP &> /dev/null
    then
        echo "Raspberry Pi is on the network: OK"
        return 0
    else
        echo "Raspberry Pi is not on the network: FAILED"
        return 1
    fi
}


while true
do
    if check_internet && check_rpi
    then
        echo "All checks passed. Running the process..."
        # then start av agent
        rosrun nrc_av_ui av_ui.py
        exit 0
    else
        echo "One or more checks failed. Retrying in $CHECK_INTERVAL seconds..."
        sleep $CHECK_INTERVAL
    fi
done



