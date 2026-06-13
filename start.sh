#!/bin/bash

# Get absolute path of this script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Set PATH to local node
export PATH="$SCRIPT_DIR/bin/node-v20.14.0-darwin-arm64/bin:$PATH"

echo "==========================================="
echo "🚀 Starting To The Moon Donation System..."
echo "==========================================="

# Function to kill all background jobs on exit
cleanup() {
  echo ""
  echo "⚠️ Stopping servers..."
  kill $(jobs -p) 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM EXIT

# Start backend server
echo "📦 Starting Backend Express Server..."
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 2

# Start frontend server
echo "🎨 Starting Frontend Vite Server..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
