#!/bin/bash

# Deploy script for Linode server
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
    echo "✅ Loaded .env.production"
else
    echo "❌ .env.production not found!"
    exit 1
fi

# Build and start services
echo "📦 Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "🔄 Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo "📊 Service status:"
docker compose -f docker-compose.prod.yml ps

# Check if services are running
if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo "🌐 Frontend: http://$(hostname -I | awk '{print $1}')"
    echo "🔧 Backend API: http://$(hostname -I | awk '{print $1}')/api"
else
    echo "❌ Some services failed to start. Check logs:"
    docker compose -f docker-compose.prod.yml logs
    exit 1
fi
