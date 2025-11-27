#!/bin/sh

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env file..."
    set -a  # Automatically export all variables
    source .env
    set +a
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Available environment variables:"
    printenv | grep -E "(DATABASE|NODE_ENV|PORT)" || echo "No related env vars found"
    exit 1
fi

# Show which database we're connecting to (for debugging)
CLEAN_DB_URL=$(echo "$DATABASE_URL" | sed 's/:[^:]*@/:***@/')
echo "🔗 Database URL: $CLEAN_DB_URL"
echo "🌐 Environment: $NODE_ENV"

echo "🔧 Generating Prisma client..."
npx prisma generate || {
    echo "❌ Failed to generate Prisma client"
    exit 1
}

# Database wait function
wait_for_database() {
    echo "⏳ Waiting for database to be ready..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    RETRY_DELAY=2
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        echo "🔍 Testing database connection (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
        
        # Use a temporary file for the SQL command to avoid redirection issues
        echo "SELECT 1;" > /tmp/test_query.sql
        if npx prisma db execute --file /tmp/test_query.sql --schema ./prisma/schema.prisma > /dev/null 2>&1; then
            echo "✅ Database is ready and responsive!"
            rm -f /tmp/test_query.sql
            return 0
        fi
        rm -f /tmp/test_query.sql
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "⏳ Database not ready yet. Retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    echo "❌ ERROR: Database connection timeout after $((MAX_RETRIES * RETRY_DELAY)) seconds"
    return 1
}

# Wait for database to be ready
wait_for_database || {
    exit 1
}

echo "🗄️  Running database migrations..."
npx prisma migrate deploy || {
    echo "❌ ERROR: Database migrations failed"
    npx prisma migrate status
    exit 1
}

echo "✅ Migrations completed successfully"

echo "🚀 Starting application..."
exec node dist/src/main