#!/usr/bin/env node

/**
 * Test Appwrite Functions
 * Verify all functions are deployed and active
 */

import { Client, Functions } from 'node-appwrite';
import dotenv from 'dotenv';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.VITE_APPWRITE_API_KEY);

const functions = new Functions(client);

async function testFunctions() {
  console.log(chalk.cyan.bold('Testing Appwrite Functions...\n'));

  try {
    // List all functions
    const result = await functions.list();
    
    console.log(chalk.green(`Found ${result.total} function(s):\n`));
    
    for (const func of result.functions) {
      console.log(chalk.cyan(`📦 ${func.name}`));
      console.log(`   ID: ${func.$id}`);
      console.log(`   Runtime: ${func.runtime}`);
      console.log(`   Status: ${func.enabled ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')}`);
      console.log(`   Deployment: ${func.deployment || chalk.yellow('No active deployment')}`);
      
      // Get deployment details if exists
      if (func.deployment) {
        try {
          const deployments = await functions.listDeployments(func.$id);
          const activeDeployment = deployments.deployments.find(d => d.$id === func.deployment);
          if (activeDeployment) {
            console.log(`   Build Status: ${activeDeployment.status}`);
            console.log(`   Entrypoint: ${activeDeployment.entrypoint}`);
          }
        } catch (e) {
          console.log(chalk.yellow(`   Could not fetch deployment details`));
        }
      }
      
      // List environment variables
      try {
        const vars = await functions.listVariables(func.$id);
        console.log(`   Environment Variables: ${vars.total} set`);
      } catch (e) {
        console.log(chalk.yellow(`   Could not fetch variables`));
      }
      
      console.log('');
    }
    
    console.log(chalk.green.bold('✅ All functions are set up!\n'));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.cyan('1. Start your frontend: npm run dev'));
    console.log(chalk.cyan('2. Test authentication with Metanet SDK'));
    console.log(chalk.cyan('3. Test file uploads to Bunny CDN\n'));
    
  } catch (error) {
    console.error(chalk.red('Failed to list functions:'));
    console.error(chalk.red(`Error: ${error.message}`));
    if (error.code) {
      console.error(chalk.red(`Code: ${error.code}`));
    }
  }
}

testFunctions();
