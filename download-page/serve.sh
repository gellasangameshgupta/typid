#!/bin/bash
# Simple script to test the download page locally

echo "Starting download page test server..."
echo "Open your browser to: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8000
