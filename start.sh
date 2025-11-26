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

echo "🗄️  Running database migrations..."
npx prisma migrate deploy || {
  echo "❌ ERROR: Database migrations failed"
  echo "This is a critical error. The application cannot start without successful migrations."
  exit 1
}

echo "✅ Migrations completed successfully"

echo "🚀 Starting application..."
exec node dist/src/main

