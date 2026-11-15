#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================"
echo "TeleTrack Desktop Agent (macOS / Linux)"
echo "========================================"

if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not installed. Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "Starting TeleTrack Desktop Agent..."
npm start
