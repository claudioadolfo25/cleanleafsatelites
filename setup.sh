#!/bin/bash
set -e

echo "🚀 Configurando entorno de Cleanleaf MVP..."

# 1. Instalar dependencias
echo "📦 Instalando dependencias..."
pnpm install

# 2. Copiar .env.example a .env.local (si no existe)
if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    echo "📝 Copiando .env.example a .env.local..."
    cp .env.example .env.local
  fi
fi

# 3. Instalar dependencias de desarrollo
echo "🛠️  Instalando herramientas de desarrollo..."
pnpm add -D @types/node @types/react @types/react-dom

# 4. Ejecutar migraciones de database (si aplica)
if [ -n "$DATABASE_URL" ]; then
  echo "🗄️  Ejecutando migraciones..."
  pnpm db:push || echo "⚠️ Migraciones omitidas (database no disponible en build local)"
fi

# 5. Ejecutar tests
echo "🧪 Ejecutando tests..."
pnpm test

# 6. Ejecutar typecheck
echo "✅ Ejecutando typecheck..."
pnpm check

echo "✨ Entorno configurado exitosamente."
