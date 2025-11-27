#!/bin/bash

# HouseMajor Deployment Script
set -e  # Exit on any error

echo "🚀 Starting HouseMajor deployment..."

# Function to check required commands
check_requirements() {
    echo "🔍 Checking system requirements..."
    local missing=()
    
    for cmd in node npm npx; do
        if ! command -v $cmd &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        echo "❌ Missing required commands: ${missing[*]}"
        exit 1
    fi
    echo "✅ All requirements met"
}

# Function to wait for database
wait_for_database() {
    echo "⏳ Waiting for database to be ready..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    RETRY_DELAY=2
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if npx prisma db execute --stdin --schema ./prisma/schema.prisma <<< "SELECT 1;" > /dev/null 2>&1; then
            echo "✅ Database connection successful!"
            return 0
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "⏳ Database not ready (attempt $RETRY_COUNT/$MAX_RETRIES). Retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    echo "❌ ERROR: Database connection timeout after $((MAX_RETRIES * RETRY_DELAY)) seconds"
    echo "Please check:"
    echo "  1. DATABASE_URL in .env is correct"
    echo "  2. PostgreSQL service is running"
    echo "  3. Network connectivity to database"
    return 1
}

# Check if .env exists
if [ ! -f .env ]; then
    echo "📄 .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your production values before continuing."
    echo "   Required variables:"
    echo "   - DATABASE_URL"
    echo "   - JWT_SECRET" 
    echo "   - PORT (optional, defaults to 3009)"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Check requirements
check_requirements

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi
echo "✅ Build completed successfully"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate
echo "✅ Prisma client generated"

# Wait for database to be ready
wait_for_database || {
    exit 1
}

# Run database migrations
echo "🗄️  Running database migrations..."
if npm run db:migrate; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migration failed!"
    echo "Debug information:"
    npx prisma migrate status
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check DATABASE_URL in .env file"
    echo "2. Ensure database user has necessary permissions"
    echo "3. Verify PostgreSQL service is running"
    echo "4. Check network connectivity to database"
    exit 1
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "To start the application:"
echo "   npm run start:prod"
echo ""
echo "API Documentation will be available at:"
echo "   http://localhost:${PORT:-3009}/api/docs"
echo ""
echo "Health check endpoint:"
echo "   http://localhost:${PORT:-3009}/ping"
echo ""
echo "For production deployment, consider using:"
echo "   PM2: pm2 start dist/src/main.js --name housemajor"
echo "   Docker: docker-compose up -d"
echo "   Systemd: systemctl enable your-service"