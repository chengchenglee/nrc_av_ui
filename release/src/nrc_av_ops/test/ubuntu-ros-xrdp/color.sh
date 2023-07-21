#!/bin/bash

## --------------------- Color  Variables -------------------- ##
black="30"
red="31"
green="32"
yellow="33"
blue="34"
pink="35"
teal="36"
white="37"
## ----------------------------------------------------------- ##

## --------------------- Effect Variables -------------------- ##
bold="1m"
faint="2m"
italic="3m"
underline="4m"
blink="5m"
# unknown="6m"  # blink?
highlight="7m"
hidden="8m"
strikethrough="9m"
## ----------------------------------------------------------- ##

## ------------------------ Functions ------------------------ ##
function getColorCode() {
    local colorText=$1
    local color=""
    case $colorText in
        "red")
            color=$red;;
        "green")
            color=$green;;
        "yellow")
            color=$yellow;;
        "blue")
            color=$blue;;
        "pink")
            color=$pink;;
        "teal")
            color=$teal;;
        "white")
            color=$white;;
        *)
            color=$black;;
    esac
    echo "$color"
}

function Color() {
    local text=$1
    local color=""
    color=$(getColorCode "${2:-black}")
    if [ $# -le 2 ] ; then
        printf "%b%sm%b%b" "\033[0;" "$color" "$text" "\033[0m"
    else
        local res="$text"
        for i in "${@:3}"; do
            local option=""
            case $i in
                "-b") 
                    option=$bold ;;
                "-f")
                    option=$faint ;;
                "-i") 
                    option=$italic ;;
                "-u")
                    option=$underline ;;
                "--blink")
                    option=$blink ;;
                "-h")
                    option=$highlight ;;
                "--hide")
                    option=$hidden ;;
                "-s")
                    option=$strikethrough ;;
                *) 
                    continue ;;
            esac
            printf -v res "%b%s;%s%b" "\033[" "$color" "$option" "$res"
        done
        printf "%s%b" "$res" "\033[0m"
    fi
}
## ----------------------------------------------------------- ##

## testing
# echo "$(Color "Hi, I'm Hoang:" green -b -i -u)" "$(Color "Hello" red)"