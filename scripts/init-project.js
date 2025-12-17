#!/usr/bin/env node

/**
 * Interactive Project Initialization Script
 * Sets up your Metanet Scaffold project with Appwrite backend
 */

import prompts from 'prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.cyan.bold('\n🚀 Metanet Scaffold - Project Initialization\n'));

const questions = [
  {
    type: 'text',
    name: 'appName',
    message: 'What is your app name?',
    initial: 'My Metanet App'
  },
  {
    type: 'text',
    name: 'appwriteEndpoint',
    message: 'Appwrite endpoint URL:',
    initial: 'https://fra.cloud.appwrite.io/v1'
  },
  {
    type: 'text',
    name: 'appwriteProjectId',
    message: 'Appwrite project ID:',
    initial: '691b539c001abbd9caed'
  },
  {
    type: 'password',
    name: 'appwriteApiKey',
    message: 'Appwrite API key:',
    initial: 'standard_21e3d51e4526f83cff4f28e4b135db3f558865f3b08d62852e46bb05c0e1677c7ac2012c33c1255d6c8be047a818bc239261708d03cebae8bec470253ddfc84f3db4845c00757ab3f7b7b778886781ea82905c5bc9c86e70a742916f48e954680cae19e565fb711276a37f313db17ae1fcdfffae5ee9cf34085d2f35d11754eb'
  },
  {
    type: 'text',
    name: 'bunnyStorageZone',
    message: 'Bunny CDN storage zone (optional):',
    initial: ''
  },
  {
    type: 'text',
    name: 'bunnyAccessKey',
    message: 'Bunny CDN access key (optional):',
    initial: ''
  },
  {
    type: 'confirm',
    name: 'setupAppwrite',
    message: 'Do you want to automatically set up Appwrite collections and functions?',
    initial: true
  }
];

(async () => {
  try {
    const response = await prompts(questions);

    if (!response.appwriteProjectId || !response.appwriteApiKey) {
      console.log(chalk.red('\n❌ Appwrite credentials are required!\n'));
      process.exit(1);
    }

    // Create .env file
    const envContent = `# Metanet Scaffold - Environment Configuration
# Generated on ${new Date().toISOString()}

# ----------------
# Appwrite Config
# ----------------
VITE_APPWRITE_ENDPOINT=${response.appwriteEndpoint}
VITE_APPWRITE_PROJECT_ID=${response.appwriteProjectId}
VITE_APPWRITE_API_KEY=${response.appwriteApiKey}

# Appwrite Database & Collections (will be created by setup script)
DATABASE_ID=main_database
USERS_COLLECTION_ID=users
CONTENT_COLLECTION_ID=content
ROLES_COLLECTION_ID=roles

# Appwrite Storage Buckets (will be created by setup script)
VITE_APPWRITE_FILES_BUCKET_ID=files
VITE_APPWRITE_IMAGES_BUCKET_ID=images
VITE_APPWRITE_VIDEOS_BUCKET_ID=videos

# ----------------
# Bunny CDN Config
# ----------------
VITE_BUNNY_STORAGE_ZONE=${response.bunnyStorageZone || ''}
VITE_BUNNY_ACCESS_KEY=${response.bunnyAccessKey || ''}
VITE_BUNNY_HOSTNAME=${response.bunnyStorageZone ? `${response.bunnyStorageZone}.b-cdn.net` : ''}

# ----------------
# App Configuration
# ----------------
VITE_APP_NAME=${response.appName}
VITE_APP_VERSION=1.0.0
VITE_DEFAULT_LANGUAGE=en

# Feature Flags
VITE_ENABLE_VIDEO_UPLOAD=true
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_NOTIFICATIONS=true

# ----------------
# Role-Based Access Control
# ----------------
VITE_ROLES=user,moderator,admin
VITE_DEFAULT_ROLE=user

# ----------------
# Security
# ----------------
VITE_MAX_FILE_SIZE=52428800
VITE_MAX_VIDEO_SIZE=524288000
VITE_SESSION_TIMEOUT=86400000

# ----------------
# Development
# ----------------
VITE_DEV_MODE=true
VITE_ENABLE_LOGGING=true
`;

    fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent);
    console.log(chalk.green('✅ .env file created'));

    if (response.setupAppwrite) {
      console.log(chalk.cyan('\n📦 Setting up Appwrite backend...\n'));
      
      // Import and run setup scripts
      const { setupAppwrite } = await import('./setup-appwrite.js');
      await setupAppwrite();
    }

    console.log(chalk.green.bold('\n✨ Project initialization complete!\n'));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white('  1. Review your .env file'));
    console.log(chalk.white('  2. Run: npm run dev'));
    console.log(chalk.white('  3. Start building your app!\n'));

  } catch (error) {
    if (error.message === 'User force closed the prompt with 0 null') {
      console.log(chalk.yellow('\n⚠️  Setup cancelled by user\n'));
    } else {
      console.error(chalk.red('\n❌ Error during initialization:'), error);
    }
    process.exit(1);
  }
})();
