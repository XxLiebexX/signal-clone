#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- Building Next.js static frontend ---"
cd ../frontend
npm install
npm run build
cd ../backend

echo "--- Installing Python backend dependencies ---"
pip install -r requirements.txt
