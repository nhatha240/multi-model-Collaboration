#!/bin/bash
set -e

echo "=== Multi-Model Collaboration Setup ==="

# Check .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — please add your API keys before continuing."
  echo "  nano .env"
  exit 1
fi

# Backend
echo ""
echo ">>> Installing backend dependencies..."
cd backend
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

.venv/bin/pip install -q -r requirements.txt
echo "Backend ready."
cd ..

# Frontend
echo ""
echo ">>> Installing frontend dependencies..."
cd frontend
npm install --silent
echo "Frontend ready."
cd ..

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Start the backend:   cd backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo "Start the frontend:  cd frontend && npm run dev"
echo ""
echo "Or run both at once: ./start.sh"
