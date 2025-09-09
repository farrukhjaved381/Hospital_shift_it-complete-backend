#!/bin/bash

# Test script for Hospital Project Authentication API
BASE_URL="http://localhost:3001"

echo "🏥 Hospital Project Authentication API Test"
echo "=========================================="

# Test 1: Health check
echo -e "\n1. Testing health check..."
curl -X GET "$BASE_URL" -H "Content-Type: application/json" -s | jq '.' || echo "Health check endpoint not accessible"

# Test 2: Register a new user
echo -e "\n2. Testing user registration..."
REGISTER_RESPONSE=$(curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser123",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "role": "STUDENT"
  }' -s)

echo "$REGISTER_RESPONSE" | jq '.'

# Extract access token for further tests
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken // empty')

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
  echo "✅ Registration successful! Access token received."
  
  # Test 3: Login with the same user
  echo -e "\n3. Testing user login..."
  LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "emailOrUsername": "test@example.com",
      "password": "password123"
    }' -s)
  
  echo "$LOGIN_RESPONSE" | jq '.'
  
  # Test 4: Access protected endpoint
  echo -e "\n4. Testing protected endpoint (Get Profile)..."
  curl -X POST "$BASE_URL/auth/profile" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" -s | jq '.'
  
  # Test 5: Get all users (admin only - should fail for STUDENT)
  echo -e "\n5. Testing admin-only endpoint (should fail for STUDENT role)..."
  curl -X GET "$BASE_URL/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" -s | jq '.'
    
else
  echo "❌ Registration failed!"
fi

echo -e "\n=========================================="
echo "🏥 Test completed!"
