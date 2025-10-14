#!/bin/bash

# Get absolute path to project root directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default broker
BROKER=${1:-"localhost"}

echo "Starting Web Remote Monitor..."
echo "Project root: ${PROJECT_ROOT}"
echo "MQTT Broker: ${BROKER}"

# Set up Python path
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"

# Run the web application
cd "${PROJECT_ROOT}"
python3 web_ui/app.py --broker "${BROKER}"