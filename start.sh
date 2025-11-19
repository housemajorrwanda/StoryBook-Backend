#!/bin/sh

echo "🔧 Generating Prisma client..."
npx prisma generate || {
  echo "❌ Failed to generate Prisma client"
  exit 1
}

echo "🗄️  Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Migration failed or no pending migrations"
}

echo "🚀 Starting application..."
exec node dist/src/main

