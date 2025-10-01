#!/bin/bash

# Get absolute path to project root directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Create necessary directories if they don't exist
mkdir -p "${SCRIPT_DIR}/templates"
mkdir -p "${SCRIPT_DIR}/static"

# Uninstall existing packages to avoid conflicts
# pip3 uninstall -y flask flask-socketio python-socketio python-engineio eventlet

# # Install required Python packages with specific versions
# pip3 install -U flask==2.3.3 \
#             flask-socketio==5.3.6 \
#             python-socketio==5.10.0 \
#             python-engineio==4.8.0 \
#             eventlet==0.33.3

# Set up environment variables
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"
export FLASK_APP="${SCRIPT_DIR}/app.py"
export FLASK_ENV=development
export FLASK_DEBUG=1

# Run the web application from the web_ui directory
cd "${SCRIPT_DIR}"

# Parse broker argument
BROKER="emqx"
while getopts ":b:" opt; do
    case $opt in
        b) BROKER="$OPTARG"
        ;;
        \?) echo "Invalid option -$OPTARG" >&2
        ;;
    esac
done

# Start the application
exec python3 -u app.py -b "$BROKER"