#!/usr/bin/env node

/**
 * Appwrite Functions Setup Script
 * Creates serverless functions with environment variables and deployments
 */

import { Client, Functions, InputFile } from 'node-appwrite';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import * as tar from 'tar';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.VITE_APPWRITE_API_KEY);

const functions = new Functions(client);

// Base environment variables for all functions
const baseEnvVars = {
  APPWRITE_ENDPOINT: process.env.VITE_APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID: process.env.VITE_APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY: process.env.VITE_APPWRITE_API_KEY,
  DATABASE_ID: process.env.DATABASE_ID,
  USERS_COLLECTION_ID: process.env.USERS_COLLECTION_ID,
  CONTENT_COLLECTION_ID: process.env.CONTENT_COLLECTION_ID,
  ROLES_COLLECTION_ID: process.env.ROLES_COLLECTION_ID,
};

// Bunny CDN environment variables (only for upload function)
const bunnyEnvVars = {
  BUNNY_STORAGE_PASSWORD: process.env.BUNNY_STORAGE_PASSWORD,
  BUNNY_STORAGE_ZONE: process.env.VITE_BUNNY_STORAGE_ZONE,
  BUNNY_STORAGE_REGION: process.env.BUNNY_STORAGE_REGION || '',
  BUNNY_HOSTNAME: process.env.VITE_BUNNY_HOSTNAME,
  BUNNY_STREAM_LIBRARY_ID: process.env.BUNNY_STREAM_LIBRARY_ID || '',
  BUNNY_STREAM_API_KEY: process.env.BUNNY_STREAM_API_KEY || '',
};

const functionsList = [
  {
    id: 'auth-metanet-user',
    name: 'Authenticate Metanet User',
    runtime: 'node-18.0',
    execute: ['any'],
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: 'src/index.js',
    envVars: baseEnvVars
  },
  {
    id: 'register-metanet-user',
    name: 'Register Metanet User',
    runtime: 'node-18.0',
    execute: ['any'],
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: 'src/index.js',
    envVars: baseEnvVars
  },
  {
    id: 'auth-or-register',
    name: 'Auth or Register Metanet User',
    runtime: 'node-18.0',
    execute: ['any'],
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: 'src/index.js',
    envVars: baseEnvVars
  },
  {
    id: 'grant-user-role',
    name: 'Grant User Role',
    runtime: 'node-18.0',
    execute: ['any'],
    timeout: 10,
    enabled: true,
    logging: true,
    entrypoint: 'src/index.js',
    envVars: baseEnvVars
  },
  {
    id: 'generate-bunny-upload-url',
    name: 'Generate Bunny Upload URL',
    runtime: 'node-18.0',
    execute: ['any'],
    timeout: 10,
    enabled: true,
    logging: true,
    entrypoint: 'src/index.js',
    envVars: { ...baseEnvVars, ...bunnyEnvVars }
  }
];

async function createTarGz(sourceDir, outputPath) {
  await tar.create(
    {
      gzip: true,
      file: outputPath,
      cwd: sourceDir
    },
    ['.']
  );
}

async function setupFunctions() {
  console.log(chalk.cyan.bold('Setting up Appwrite Functions...\n'));

  // Get function filter from command line args
  // Usage: node scripts/setup-functions.js [function-id-1] [function-id-2] ...
  const targetFunctions = process.argv.slice(2);
  
  // Filter functions if specific ones are requested
  const functionsToProcess = targetFunctions.length > 0
    ? functionsList.filter(func => targetFunctions.includes(func.id))
    : functionsList;

  if (targetFunctions.length > 0 && functionsToProcess.length === 0) {
    console.log(chalk.red(`No matching functions found for: ${targetFunctions.join(', ')}`));
    console.log(chalk.cyan('\nAvailable function IDs:'));
    functionsList.forEach(func => {
      console.log(chalk.cyan(`  - ${func.id}`));
    });
    process.exit(1);
  }

  if (targetFunctions.length > 0) {
    console.log(chalk.cyan(`Processing ${functionsToProcess.length} function(s): ${functionsToProcess.map(f => f.id).join(', ')}\n`));
  } else {
    console.log(chalk.cyan(`Processing all ${functionsToProcess.length} functions\n`));
  }

  for (const func of functionsToProcess) {
    const spinner = ora(`Processing function: ${func.name}...`).start();
    
    try {
      // Step 1: Check if function exists
      let functionExists = false;
      try {
        await functions.get(func.id);
        functionExists = true;
        spinner.text = `Function "${func.name}" exists, updating deployment...`;
      } catch (error) {
        if (error.code === 404) {
          // Function doesn't exist, create it
          spinner.text = `Creating function "${func.name}"...`;
          await functions.create(
            func.id,
            func.name,
            func.runtime,
            func.execute,
            [],
            '',
            func.timeout,
            func.enabled,
            func.logging,
            func.entrypoint
          );
          spinner.text = `Function "${func.name}" created, setting up...`;
        } else {
          throw error;
        }
      }

      // Step 2: Set environment variables
      for (const [key, value] of Object.entries(func.envVars)) {
        if (value) {
          try {
            await functions.createVariable(func.id, key, value);
          } catch (varError) {
            // Variable might already exist, update it
            if (varError.code === 409) {
              try {
                // Get the variable ID
                const vars = await functions.listVariables(func.id);
                const existingVar = vars.variables.find(v => v.key === key);
                if (existingVar) {
                  await functions.updateVariable(func.id, existingVar.$id, key, value);
                }
              } catch (updateError) {
                console.log(chalk.yellow(`  Warning: Could not update ${key}`));
              }
            }
          }
        }
      }
      spinner.text = `Deploying code for "${func.name}"...`;

      // Step 3: Create deployment with code
      const functionDir = path.join(__dirname, '..', 'appwrite-functions', func.id);
      const tmpDir = mkdtempSync(path.join(tmpdir(), 'appwrite-deploy-'));
      const tarPath = path.join(tmpDir, 'code.tar.gz');
      
      try {
        // Create tar.gz of function code
        await createTarGz(functionDir, tarPath);
        
        // Upload deployment
        const deployment = await functions.createDeployment(
          func.id,
          InputFile.fromPath(tarPath, 'code.tar.gz'),
          true, // activate automatically
          func.entrypoint,
          'npm install' // build commands
        );
        
        spinner.succeed(`✅ Function "${func.name}" deployed successfully (deployment: ${deployment.$id})`);
        
        // Clean up
        rmSync(tmpDir, { recursive: true, force: true });
      } catch (deployError) {
        rmSync(tmpDir, { recursive: true, force: true });
        throw deployError;
      }

    } catch (error) {
      spinner.fail(`❌ Failed to process function: ${func.name}`);
      console.error(chalk.red(`   Error: ${error.message}`));
      if (error.code) {
        console.error(chalk.red(`   Code: ${error.code}`));
      }
      if (error.response) {
        console.error(chalk.red(`   Response: ${JSON.stringify(error.response)}`));
      }
    }
    console.log(''); // Empty line between functions
  }

  console.log(chalk.green.bold('✅ Functions setup complete!\n'));
  console.log(chalk.cyan('All functions deployed and ready to use.'));
  console.log(chalk.cyan(`Test the functions at: ${process.env.VITE_APPWRITE_ENDPOINT}/functions\n`));
}

// Show help
function showHelp() {
  console.log(chalk.cyan.bold('Appwrite Functions Setup Script\n'));
  console.log(chalk.white('Usage:'));
  console.log(chalk.gray('  node scripts/setup-functions.js [function-id-1] [function-id-2] ...\n'));
  console.log(chalk.white('Examples:'));
  console.log(chalk.gray('  node scripts/setup-functions.js                          # Deploy all functions'));
  console.log(chalk.gray('  node scripts/setup-functions.js generate-bunny-upload-url # Deploy only Bunny upload function'));
  console.log(chalk.gray('  node scripts/setup-functions.js auth-metanet-user register-metanet-user # Deploy auth functions\n'));
  console.log(chalk.white('Available function IDs:'));
  functionsList.forEach(func => {
    console.log(chalk.cyan(`  - ${func.id.padEnd(30)} ${chalk.gray(func.name)}`));
  });
  console.log('');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
  } else {
    setupFunctions();
  }
}
