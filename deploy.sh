#!/bin/bash

# HouseMajor Deployment Script
echo "🚀 Starting HouseMajor deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo ".env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "Please update .env with your production values before continuing."
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed. Please fix errors and try again."
    exit 1
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Run database migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

if [ $? -ne 0 ]; then
    echo "Database migration failed. Please check your DATABASE_URL."
    echo "Make sure your PostgreSQL database is running and accessible."
fi

echo "Deployment preparation complete!"
echo ""
echo "To start the application:"
echo "   npm run start:prod"
echo ""
echo "API Documentation will be available at:"
echo "   http://localhost:3009/api/docs"
echo ""
echo "Health check endpoint:"
echo "   http://localhost:3009/api/v1/health"
