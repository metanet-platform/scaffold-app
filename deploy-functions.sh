#!/bin/bash

# Deploy Appwrite Functions
# Make sure you have Appwrite CLI installed: npm install -g appwrite-cli
# And logged in: appwrite login

echo "🚀 Deploying Appwrite Functions..."

PROJECT_ID="691b539c001abbd9caed"

# Function 1: Authentication
echo ""
echo "📦 Deploying auth-metanet-user..."
cd appwrite-functions/auth-metanet-user
npm install
appwrite functions create \
  --functionId "auth-metanet-user" \
  --name "Authenticate Metanet User" \
  --runtime "node-18.0" \
  --execute "any" \
  --timeout 15 \
  --projectId "$PROJECT_ID" || echo "Function already exists, updating..."

appwrite functions createDeployment \
  --functionId "auth-metanet-user" \
  --entrypoint "src/auth.js" \
  --activate true \
  --projectId "$PROJECT_ID"

cd ../..

# Function 2: Registration
echo ""
echo "📦 Deploying register-metanet-user..."
cd appwrite-functions/register-metanet-user
npm install
appwrite functions create \
  --functionId "register-metanet-user" \
  --name "Register Metanet User" \
  --runtime "node-18.0" \
  --execute "any" \
  --timeout 15 \
  --projectId "$PROJECT_ID" || echo "Function already exists, updating..."

appwrite functions createDeployment \
  --functionId "register-metanet-user" \
  --entrypoint "src/register.js" \
  --activate true \
  --projectId "$PROJECT_ID"

cd ../..

# Function 3: Check Role
echo ""
echo "📦 Deploying check-user-role..."
cd appwrite-functions/check-user-role
npm install
appwrite functions create \
  --functionId "check-user-role" \
  --name "Check User Role" \
  --runtime "node-18.0" \
  --execute "any" \
  --timeout 15 \
  --projectId "$PROJECT_ID" || echo "Function already exists, updating..."

appwrite functions createDeployment \
  --functionId "check-user-role" \
  --entrypoint "src/checkRole.js" \
  --activate true \
  --projectId "$PROJECT_ID"

cd ../..

# Function 4: Grant Role
echo ""
echo "📦 Deploying grant-user-role..."
cd appwrite-functions/grant-user-role
npm install
appwrite functions create \
  --functionId "grant-user-role" \
  --name "Grant User Role" \
  --runtime "node-18.0" \
  --execute "any" \
  --timeout 15 \
  --projectId "$PROJECT_ID" || echo "Function already exists, updating..."

appwrite functions createDeployment \
  --functionId "grant-user-role" \
  --entrypoint "src/grantRole.js" \
  --activate true \
  --projectId "$PROJECT_ID"

cd ../..

# Function 5: Bunny CDN Upload
echo ""
echo "📦 Deploying generate-bunny-upload-url..."
cd appwrite-functions/generate-bunny-upload-url
npm install
appwrite functions create \
  --functionId "generate-bunny-upload-url" \
  --name "Generate Bunny Upload URL" \
  --runtime "node-18.0" \
  --execute "any" \
  --timeout 15 \
  --projectId "$PROJECT_ID" || echo "Function already exists, updating..."

appwrite functions createDeployment \
  --functionId "generate-bunny-upload-url" \
  --entrypoint "src/generateUploadUrl.js" \
  --activate true \
  --projectId "$PROJECT_ID"

cd ../..

echo ""
echo "✅ All functions deployed!"
echo ""
echo "⚠️  Don't forget to set environment variables for each function in Appwrite Console:"
echo "   - APPWRITE_ENDPOINT"
echo "   - APPWRITE_PROJECT_ID"
echo "   - APPWRITE_API_KEY"
echo "   - DATABASE_ID"
echo "   - USERS_COLLECTION_ID"
echo "   - ROLES_COLLECTION_ID"
echo "   - BUNNY_STORAGE_PASSWORD (for bunny upload function)"
echo "   - BUNNY_STORAGE_ZONE"
echo "   - BUNNY_STORAGE_REGION"
echo "   - BUNNY_HOSTNAME"
