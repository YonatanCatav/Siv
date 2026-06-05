#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🎮 Starting Siv..."
echo ""

# Backend setup
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  echo "📦 Creating Python venv..."
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

# Frontend setup
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend deps..."
  npm install
fi

# Start both
echo "🚀 Starting backend on :8000 and frontend on :5173"
echo ""
echo "   Backend:  http://localhost:8001"
echo "   Frontend: http://localhost:5173"
echo ""

# Start backend in background
cd "$ROOT/backend"
source .venv/bin/activate
python main.py &
BACKEND_PID=$!

# Start frontend
cd "$ROOT/frontend"
npm run dev

# Cleanup
kill $BACKEND_PID 2>/dev/null || true
