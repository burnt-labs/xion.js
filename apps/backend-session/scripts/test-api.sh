#!/bin/bash

echo "🧪 Testing Backend Session API..."

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s http://localhost:3002/api/health | jq '.'

echo -e "\n2. Testing wallet connect endpoint..."
curl -s -X POST http://localhost:3002/api/wallet/connect \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "permissions": {"contracts": [], "bank": [], "stake": false}}' | jq '.'

echo -e "\n3. Testing wallet status endpoint..."
curl -s "http://localhost:3002/api/wallet/status?username=testuser" | jq '.'

echo -e "\n4. Testing wallet disconnect endpoint..."
curl -s -X DELETE http://localhost:3002/api/wallet/disconnect \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}' | jq '.'

echo -e "\n✅ API tests completed!"
