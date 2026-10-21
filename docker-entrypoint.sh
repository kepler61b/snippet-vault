#!/bin/sh
set -e

echo "=== Initializing SnippetVault Database ==="
mkdir -p /app/data

# Sync database schema with SQLite in /app/data
npx prisma db push --skip-generate

echo "=== Starting SnippetVault Web Application ==="
exec node server.js
