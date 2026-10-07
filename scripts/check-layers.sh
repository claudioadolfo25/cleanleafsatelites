#!/usr/bin/env bash
# Layer import boundary check script
# Rules:
# - client/src cannot import runtime values from server/ or supabase/ (type-only imports allowed)
# - shared/ cannot import from server/ or client/
set -e

echo "== Layer Boundary Validation =="

ERRORS=0

# 1. Check client/src runtime value imports (excluding 'import type')
if git grep -nE "^import [^{\"]*from ['\"](\.\./)*server/|^import [^{\"]*from ['\"](\.\./)*supabase/" client/src/ 2>/dev/null | grep -v "import type"; then
  echo "FAIL: client/src imports runtime values from server/ or supabase/"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS: client/src layer boundaries clean"
fi

# 2. Check shared/ imports
if git grep -nE "from ['\"](\.\./)*server/|from ['\"](\.\./)*client/" shared/ 2>/dev/null; then
  echo "FAIL: shared/ imports from server/ or client/"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS: shared/ layer boundaries clean"
fi

if [ $ERRORS -gt 0 ]; then
  echo "Layer check failed with $ERRORS error(s)."
  exit 1
fi

echo "All layer boundary checks passed successfully."
