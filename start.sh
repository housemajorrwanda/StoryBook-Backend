#!/bin/sh

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env file..."
    set -a
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

# Database wait function - uses PostgreSQL client directly for better reliability
wait_for_database() {
    echo "⏳ Waiting for database to be ready..."
    MAX_RETRIES=60
    RETRY_COUNT=0
    RETRY_DELAY=2
    
    # Extract connection details from DATABASE_URL
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:/]*\).*/\1/p' | head -1)
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p' | head -1)
    if [ -z "$DB_PORT" ]; then
        DB_PORT="5432"
    fi
    
    echo "🔍 Extracted connection details - Host: $DB_HOST, Port: $DB_PORT"
    
    # First try using pg_isready (faster, just checks if server is accepting connections)
    if command -v pg_isready >/dev/null 2>&1; then
        echo "🔍 Checking database server availability with pg_isready..."
        while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
                echo "✅ Database server is accepting connections!"
                break
            fi
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo "⏳ Database server not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES). Retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
            fi
        done
    fi
    
    # Reset counter for actual connection test
    RETRY_COUNT=0
    
    # Now test actual database connection using psql
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        echo "🔍 Testing database connection (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
        
        # Try using psql directly (more reliable than Prisma db execute)
        if command -v psql >/dev/null 2>&1; then
            if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
                echo "✅ Database connection successful!"
                return 0
            fi
        else
            # Fallback to Prisma if psql not available (use echo pipe for sh compatibility)
            if echo "SELECT 1;" | npx prisma db execute --stdin --schema ./prisma/schema.prisma >/dev/null 2>&1; then
                echo "✅ Database connection successful!"
                return 0
            fi
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "⏳ Database not ready yet. Retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    echo "⚠️  WARNING: Database connection timeout after $((MAX_RETRIES * RETRY_DELAY)) seconds"
    echo "🔗 Database URL: $CLEAN_DB_URL"
    echo "💡 The application will start, but database operations may fail until connection is established."
    echo "💡 This is normal for Railway deployments where database may take longer to become available."
    return 0  # Don't fail startup - let the app retry connections
}

# Wait for database to be ready (non-blocking - app will retry)
wait_for_database

echo "🗄️  Running database migrations..."
# Run migrations with retry logic
MIGRATION_RETRIES=3
MIGRATION_RETRY_COUNT=0
MIGRATION_SUCCESS=false

while [ $MIGRATION_RETRY_COUNT -lt $MIGRATION_RETRIES ]; do
    if npx prisma migrate deploy; then
        echo "✅ Migrations completed successfully"
        MIGRATION_SUCCESS=true
        break
    else
        MIGRATION_RETRY_COUNT=$((MIGRATION_RETRY_COUNT + 1))
        if [ $MIGRATION_RETRY_COUNT -lt $MIGRATION_RETRIES ]; then
            echo "⚠️  Migration attempt $MIGRATION_RETRY_COUNT failed. Retrying in 5s..."
            sleep 5
        else
            echo "⚠️  WARNING: Database migrations failed after $MIGRATION_RETRIES attempts"
            echo "💡 The application will start anyway. Migrations can be run manually later."
            echo "📋 Migration status:"
            npx prisma migrate status || true
        fi
    fi
done

echo "🚀 Starting application..."
# Start the application
exec node dist/src/main