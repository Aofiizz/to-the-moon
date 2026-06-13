#!/bin/sh
set -e

# Run Prisma migrations / DB push to ensure database schema exists
echo "Applying database migrations..."
npx prisma db push --skip-generate

# Seed the database (will skip if admin user already exists)
echo "Seeding database..."
node dist/db/seed.js

# Run the command passed to CMD (defaults to starting the Express server)
echo "Starting backend server..."
exec "$@"
