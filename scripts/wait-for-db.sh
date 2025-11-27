#!/bin/bash

MAX_RETRIES=30
RETRY_COUNT=0
RETRY_DELAY=2

echo "⏳ Waiting for database to be ready..."

until npx prisma db execute --stdin --schema ./prisma/schema.prisma <<< "SELECT 1;" > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -gt $MAX_RETRIES ]; then
        echo "❌ ERROR: Database connection failed after $MAX_RETRIES attempts"
        echo "Please check your DATABASE_URL and ensure PostgreSQL is running"
        exit 1
    fi
    echo "⏳ Database not ready (attempt $RETRY_COUNT/$MAX_RETRIES). Retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
done

echo "✅ Database connection successful!"