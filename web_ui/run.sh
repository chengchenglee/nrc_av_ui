#!/bin/bash

# Get absolute path to project root directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Install required Python packages
pip3 install flask flask-socketio eventlet

# Set up Python path
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"
export FLASK_APP="${SCRIPT_DIR}/app.py"
export FLASK_ENV=development
export FLASK_DEBUG=1

# Run the web application from the web_ui directory
cd "${SCRIPT_DIR}"
python3 -m flask run --host=0.0.0.0 "$@"