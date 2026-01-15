#!/bin/bash
# Template Mode Development Server
#
# Starts the development server with template data pre-loaded.
# This is for visual testing and development only.

set -e

# Ensure we're in development mode
export NODE_ENV=development
export NEXT_PUBLIC_TEMPLATE_MODE=true

echo "🔧 Template Mode - Starting development server..."

# Check if database is accessible
echo "📊 Checking database connection..."
npx prisma db push --skip-generate 2>/dev/null || {
    echo "❌ Database not accessible. Please run 'npm run docker:up' first."
    exit 1
}

# Seed template data (idempotent)
echo "🌱 Seeding template data..."
npx tsx prisma/seed-template.ts

# Start the dev server
echo "🚀 Starting Next.js dev server in template mode..."
echo "   Open http://localhost:3000/constellation to view"
echo ""
exec next dev
