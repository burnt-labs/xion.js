#!/bin/bash

echo "🚀 Setting up Backend Session project..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing"
    echo "   Especially set your ENCRYPTION_KEY and other required values"
    read -p "Press Enter to continue after editing .env file..."
fi

# Generate encryption key if not set
if ! grep -q "ENCRYPTION_KEY=" .env || grep -q "your-base64-encoded-aes-256-key-here" .env; then
    echo "🔑 Generating encryption key..."
    pnpm run generate-key
    echo "📝 Please copy the generated key to your .env file"
    read -p "Press Enter to continue after updating .env with the encryption key..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
pnpm run db:build

# Push database schema
echo "🗄️  Setting up database..."
pnpm run db:push

# Seed database
echo "🌱 Seeding database..."
pnpm run db:seed

echo "✅ Setup complete!"
echo ""
echo "🎉 You can now start the development server:"
echo "   pnpm run dev"
