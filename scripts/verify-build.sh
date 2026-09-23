#!/usr/bin/env bash
# Local build verification script prior to pushing to Vercel/Render
set -e

echo "🔍 Starting AgroPulso Local Build Verification..."

echo "1. Checking TypeScript Types (pnpm check)..."
pnpm check

echo "2. Running Unit Tests (pnpm test)..."
pnpm test

echo "3. Building Client & Server Bundles (pnpm build)..."
pnpm build

echo "4. Verifying Client Assets Output (dist/index.html)..."
if [ ! -f "dist/index.html" ]; then
  echo "❌ Error: dist/index.html is missing!"
  exit 1
fi

echo "5. Verifying Server Bundle Output (dist/server/index.js)..."
if [ ! -f "dist/server/index.js" ]; then
  echo "❌ Error: dist/server/index.js is missing!"
  exit 1
fi

echo "✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!"
echo "The repository is 100% ready for Vercel and Render deployment."
