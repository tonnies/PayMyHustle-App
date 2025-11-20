#!/bin/bash

# Setup script for local D1 database
# This ensures the database schema is properly initialized

echo "Setting up local D1 database..."

# Kill any running wrangler processes
pkill -f "wrangler pages dev" 2>/dev/null || true
sleep 2

# Remove old database to ensure clean state
echo "Cleaning old database..."
rm -rf .wrangler/state/v3/d1 2>/dev/null || true

# Run migrations
echo "Running migrations..."
npx wrangler d1 execute paymyhustle-db --local --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute paymyhustle-db --local --file=./migrations/0002_recurring_invoices.sql
npx wrangler d1 execute paymyhustle-db --local --file=./migrations/0003_multiple_banking_details.sql

echo "✅ Database setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run build && npx wrangler pages dev dist --d1=DB=paymyhustle-db --port 8788 --persist"
