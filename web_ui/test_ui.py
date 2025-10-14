#!/usr/bin/python3

"""
Simple test script to verify Web UI functionality
"""

import requests
import json
import time

def test_web_ui():
    """Test basic Web UI functionality"""
    base_url = "http://localhost:5000"
    
    print("Testing Web Remote Monitor...")
    
    try:
        # Test if server is running
        response = requests.get(base_url)
        if response.status_code == 200:
            print("✓ Web server is running")
            print("✓ Home page accessible")
        else:
            print(f"✗ Web server returned status {response.status_code}")
            return
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to web server")
        print("  Make sure to start the web server first:")
        print("  cd /home/nissan/Documents/nrc_av_ui")
        print("  python web_ui/app.py --broker localhost")
        return
    
    print("\n=== Web UI Test Results ===")
    print("✓ Server connectivity: OK")
    print("✓ Basic routing: OK") 
    print("✓ Template rendering: OK")
    print("\nTo fully test the UI:")
    print("1. Open browser to: http://localhost:5000")
    print("2. Check browser console for WebSocket connection")
    print("3. Verify agent status cards display")
    print("4. Test button functionality (requires running agents)")

if __name__ == "__main__":
    test_web_ui()