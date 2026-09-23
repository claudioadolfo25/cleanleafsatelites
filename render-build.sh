#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🔨 Building AgroPulso Backend..."
corepack enable && corepack prepare pnpm@10.4.1 --activate
pnpm install --frozen-lockfile
pnpm build:server

echo "✅ Build completed successfully"
