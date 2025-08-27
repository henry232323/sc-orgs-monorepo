#!/bin/bash

# Build script for frontend
# This script handles dependency installation and building

set -e

echo "🔧 Installing dependencies..."
yarn install --frozen-lockfile=false

echo "🏗️ Building frontend..."
yarn build

echo "✅ Build completed successfully!"