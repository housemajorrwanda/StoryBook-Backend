#!/bin/sh

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "🔧 Generating Prisma client..."
npx prisma generate || {
  echo "❌ Failed to generate Prisma client"
  exit 1
}

# Function to wait for database to be ready
wait_for_database() {
  echo "⏳ Waiting for database to be ready..."
  MAX_RETRIES=30
  RETRY_COUNT=0
  RETRY_DELAY=2
  
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # Try to connect to database using Prisma migrate status (lightweight check)
    if npx prisma migrate status > /dev/null 2>&1; then
      echo "✅ Database is ready!"
      return 0
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "⏳ Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES). Retrying in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
    fi
  done
  
  echo "❌ ERROR: Database connection timeout after $((MAX_RETRIES * RETRY_DELAY)) seconds"
  echo "Please check that:"
  echo "  1. DATABASE_URL is correct"
  echo "  2. Database service is running"
  echo "  3. Network connectivity is available"
  return 1
}

# Wait for database to be ready
wait_for_database || {
  exit 1
}

echo "🗄️  Running database migrations..."
npx prisma migrate deploy || {
  echo "❌ ERROR: Database migrations failed"
  echo "This is a critical error. The application cannot start without successful migrations."
  exit 1
}

echo "✅ Migrations completed successfully"

echo "🚀 Starting application..."
exec node dist/src/main

