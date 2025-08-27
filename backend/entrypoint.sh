#!/bin/sh

# Docker entrypoint script for debugging SC-Orgs backend
# Usage: docker run -it <image> [command]
# If no command is provided, it will run the default application

echo "=== SC-Orgs Backend Docker Environment ==="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "Yarn version: $(yarn --version)"
echo ""

# Check if a custom command was provided
if [ $# -eq 0 ]; then
    echo "No command provided, running default application..."
    
    echo "Checking if dist/index.js exists..."
    if [ -f "/app/dist/index.js" ]; then
        echo "✅ dist/index.js found, starting application..."
        exec node dist/index.js
    else
        echo "❌ dist/index.js still not found after build!"
        echo "Build failed - checking for errors..."
        exit 1
    fi
else
    echo "Running custom command: $@"
    exec "$@"
fi
