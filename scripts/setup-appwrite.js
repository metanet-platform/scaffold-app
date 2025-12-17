#!/usr/bin/env node

/**
 * Appwrite Setup Script
 * Creates database, collections, and buckets with proper permissions
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.VITE_APPWRITE_API_KEY);

const databases = new Databases(client);

export async function setupAppwrite() {
  console.log(chalk.cyan.bold('Setting up Appwrite backend...\n'));

  try {
    // 1. Create Database
    await createDatabase();
    
    // 2. Create Collections
    await createCollections();
    
    console.log(chalk.green.bold('\n✅ Appwrite setup complete!\n'));
    console.log(chalk.cyan('Database and collections are ready.'));
    console.log(chalk.cyan('Files will be stored on Bunny CDN (not Appwrite Storage).\n'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed:'), error.message);
    process.exit(1);
  }
}

async function createDatabase() {
  const spinner = ora('Creating main database...').start();
  
  try {
    const databaseId = process.env.DATABASE_ID;
    
    try {
      await databases.get(databaseId);
      spinner.info(`Database "${databaseId}" already exists`);
    } catch (error) {
      if (error.code === 404) {
        await databases.create(databaseId, 'Main Database');
        spinner.succeed('Database created successfully');
      } else {
        throw error;
      }
    }
  } catch (error) {
    spinner.fail('Failed to create database');
    throw error;
  }
}

async function createCollections() {
  const databaseId = process.env.DATABASE_ID;
  
  // Users Collection
  const usersSpinner = ora('Creating users collection...').start();
  try {
    const usersCollectionId = process.env.USERS_COLLECTION_ID;
    
    try {
      await databases.getCollection(databaseId, usersCollectionId);
      usersSpinner.info('Users collection already exists');
    } catch (error) {
      if (error.code === 404) {
        await databases.createCollection(
          databaseId,
          usersCollectionId,
          'Users',
          [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
          ]
        );
        
        usersSpinner.text = 'Creating user attributes...';
        
        // Primary authentication key (derived from genericUseSeed)
        await databases.createStringAttribute(databaseId, usersCollectionId, 'appPublicKey', 255, true);
        
        // Profile information
        await databases.createStringAttribute(databaseId, usersCollectionId, 'username', 100, false);
        await databases.createStringAttribute(databaseId, usersCollectionId, 'displayName', 255, false);
        await databases.createStringAttribute(databaseId, usersCollectionId, 'avatar', 2000, false);
        
        // Roles assigned to user (JSON array of role names)
        await databases.createStringAttribute(databaseId, usersCollectionId, 'roles', 1000, false);
        
        // Status (optional with default)
        await databases.createStringAttribute(databaseId, usersCollectionId, 'status', 50, false, 'active');
        
        // Additional metadata (JSON)
        await databases.createStringAttribute(databaseId, usersCollectionId, 'metadata', 10000, false);
        
        usersSpinner.text = 'Creating user indexes...';
        
        // Create indexes
        await databases.createIndex(databaseId, usersCollectionId, 'idx_app_public_key', 'unique', ['appPublicKey'], ['ASC']);
        await databases.createIndex(databaseId, usersCollectionId, 'idx_username', 'key', ['username'], ['ASC']);
        await databases.createIndex(databaseId, usersCollectionId, 'idx_status', 'key', ['status'], ['ASC']);
        
        usersSpinner.succeed('Users collection created with attributes and indexes');
      } else {
        throw error;
      }
    }
  } catch (error) {
    usersSpinner.fail('Failed to create users collection');
    throw error;
  }
  
  // Content Collection
  const contentSpinner = ora('Creating content collection...').start();
  try {
    const contentCollectionId = process.env.CONTENT_COLLECTION_ID;
    
    try {
      await databases.getCollection(databaseId, contentCollectionId);
      contentSpinner.info('Content collection already exists');
    } catch (error) {
      if (error.code === 404) {
        await databases.createCollection(
          databaseId,
          contentCollectionId,
          'Content',
          [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
          ]
        );
        
        contentSpinner.text = 'Creating content attributes...';
        
        // User reference (Appwrite document ID from Users collection)
        await databases.createStringAttribute(databaseId, contentCollectionId, 'userId', 255, true);
        
        // Content ID (Bunny CDN identifier - URL generated on the fly)
        await databases.createStringAttribute(databaseId, contentCollectionId, 'contentId', 255, false);
        
        // Namespace (uploads, blogs, feed, etc.)
        await databases.createStringAttribute(databaseId, contentCollectionId, 'namespace', 50, false, 'uploads');
        
        // Status
        await databases.createStringAttribute(databaseId, contentCollectionId, 'status', 50, false, 'draft');
        
        // Metadata (JSON: title, description, contentType, thumbnailUrl, fileSize, mimeType, tags, views, likes, etc.)
        await databases.createStringAttribute(databaseId, contentCollectionId, 'metadata', 10000, false);
        
        contentSpinner.text = 'Creating content indexes...';
        
        // Create indexes
        await databases.createIndex(databaseId, contentCollectionId, 'idx_user_id', 'key', ['userId'], ['ASC']);
        await databases.createIndex(databaseId, contentCollectionId, 'idx_namespace', 'key', ['namespace'], ['ASC']);
        await databases.createIndex(databaseId, contentCollectionId, 'idx_status', 'key', ['status'], ['ASC']);
        
        contentSpinner.succeed('Content collection created with attributes and indexes');
      } else {
        throw error;
      }
    }
  } catch (error) {
    contentSpinner.fail('Failed to create content collection');
    throw error;
  }
  
  // Roles Collection (Permission Definitions)
  const rolesSpinner = ora('Creating roles collection...').start();
  try {
    const rolesCollectionId = process.env.ROLES_COLLECTION_ID;
    
    try {
      await databases.getCollection(databaseId, rolesCollectionId);
      rolesSpinner.info('Roles collection already exists');
    } catch (error) {
      if (error.code === 404) {
        await databases.createCollection(
          databaseId,
          rolesCollectionId,
          'Roles',
          [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users())
          ]
        );
        
        rolesSpinner.text = 'Creating role attributes...';
        
        // Role definition (independent of users)
        await databases.createStringAttribute(databaseId, rolesCollectionId, 'name', 50, true);
        
        // Permissions (JSON array of permission strings)
        await databases.createStringAttribute(databaseId, rolesCollectionId, 'permissions', 10000, false);
        
        rolesSpinner.text = 'Creating role indexes...';
        
        // Create indexes
        await databases.createIndex(databaseId, rolesCollectionId, 'idx_role_name', 'unique', ['name'], ['ASC']);
        
        rolesSpinner.succeed('Roles collection created with attributes and indexes');
      } else {
        throw error;
      }
    }
  } catch (error) {
    rolesSpinner.fail('Failed to create roles collection');
    throw error;
  }
  
  console.log(chalk.green.bold('\n✅ Appwrite setup complete!\n'));
  console.log(chalk.cyan('Schema Summary:'));
  console.log(chalk.white('  Users: appPublicKey (auth), username, displayName, avatar, roles (array), userStatus, metadata'));
  console.log(chalk.white('  Content: userId, contentId (Bunny CDN), contentStatus, metadata'));
  console.log(chalk.white('  Roles: name (unique), permissions (JSON array)'));
  console.log(chalk.white('\n  Note: All tables have automatic $createdAt and $updatedAt timestamps\n'));
  console.log(chalk.cyan('Files will be stored on Bunny CDN.\n'));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupAppwrite();
}
