#!/bin/bash
# Template Mode Development Server
#
# Starts the development server with template data pre-loaded.
# This is for visual testing and development only.
#
# Usage:
#   npm run dev:template           # Start with existing data (idempotent seed)
#   npm run dev:template -- --reset  # Reset database and start fresh

set -e

# Parse arguments
RESET_DB=false
for arg in "$@"; do
    case $arg in
        --reset)
            RESET_DB=true
            shift
            ;;
    esac
done

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

# Handle reset if requested
if [ "$RESET_DB" = true ]; then
    echo "🗑️  Resetting database (--reset flag provided)..."
    echo "   This will delete ALL data and recreate the schema."

    # Use prisma migrate reset with --force to skip confirmation
    # --skip-seed prevents default seed from running (we'll seed template data instead)
    npx prisma migrate reset --force --skip-seed 2>/dev/null || {
        # If no migrations exist, fall back to db push with force-reset
        echo "   No migrations found, using db push --force-reset..."
        npx prisma db push --force-reset --accept-data-loss
    }

    echo "✅ Database reset complete."
fi

# Seed template data (idempotent unless reset was performed)
echo "🌱 Seeding template data..."
if [ "$RESET_DB" = true ]; then
    # Force reseed after reset
    FORCE_RESEED=true npx tsx prisma/seed-template.ts
else
    npx tsx prisma/seed-template.ts
fi

# Start the dev server
echo "🚀 Starting Next.js dev server in template mode..."
echo "   Open http://localhost:3000/constellation to view"
echo ""
exec next dev
