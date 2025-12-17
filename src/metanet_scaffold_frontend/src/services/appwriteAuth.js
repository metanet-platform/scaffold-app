/**
 * Authentication Service
 * 
 * Handles user authentication using Metanet SDK + Appwrite backend
 * Implements cryptographic authentication (no passwords!)
 */

import { Client, Account, Databases, Functions } from 'appwrite';
import CryptoJS from 'crypto-js';

// Check if Appwrite is configured
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || '';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

const client = new Client();

// Only set endpoint and project if they are configured
if (APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID) {
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);
}

const account = new Account(client);
const databases = new Databases(client);
const functions = new Functions(client);

/**
 * Check if Appwrite is configured
 * @returns {boolean}
 */
export function isAppwriteConfigured() {
  return !!(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID);
}

/**
 * Derive app-specific keypair from genericUseSeed
 * @param {string} genericUseSeed - 32-byte hex from Metanet SDK
 * @returns {Object} { privateKey, publicKey }
 */
function deriveAppKeypair(genericUseSeed) {
  // In production, use proper secp256k1 library
  // This is a simplified example
  const privateKey = genericUseSeed;
  const publicKey = CryptoJS.SHA256(genericUseSeed).toString();
  
  return { privateKey, publicKey };
}

/**
 * Sign payload with app private key
 * @param {Object} payload - Data to sign
 * @param {string} privateKey - App private key
 * @returns {string} Signature
 */
function signPayload(payload, privateKey) {
  // In production, use proper secp256k1 signing
  // This is a simplified example
  const message = JSON.stringify(payload);
  const signature = CryptoJS.HmacSHA256(message, privateKey).toString();
  
  return signature;
}

/**
 * Authenticate or register user in one call
 * @param {Object} connectionData - Data from Metanet SDK connect()
 * @param {Object} userData - Optional user data for registration (username, displayName, avatar)
 * @returns {Promise<Object>} Result with isNewUser flag and user data
 */
export async function authOrRegister(connectionData, userData = {}) {
  try {
    const { bsvAddress, genericUseSeed, rootPrincipal } = connectionData;
    
    // Derive app-specific keypair
    const { privateKey, publicKey } = deriveAppKeypair(genericUseSeed);
    
    // Create payload with optional user data
    const payload = {
      bsvAddress,
      appPublicKey: publicKey,
      rootPrincipal: rootPrincipal || '',
      username: userData.username || '',
      displayName: userData.displayName || '',
      avatar: userData.avatar || '',
      timestamp: Date.now()
    };
    
    // Sign the payload
    const signature = signPayload(payload, privateKey);
    
    // Call unified Appwrite function
    const response = await functions.createExecution(
      'auth-or-register',
      JSON.stringify({ ...payload, signature }),
      false
    );
    
    console.log('[authOrRegister] Full response:', {
      status: response.responseStatusCode,
      body: response.responseBody,
      logs: response.logs,
      errors: response.errors
    });

    // Handle empty response
    if (!response.responseBody || response.responseBody.trim() === '') {
      console.error('[authOrRegister] Empty response. Function logs:', response.logs);
      console.error('[authOrRegister] Function errors:', response.errors);
      throw new Error(`Function failed with status ${response.responseStatusCode}. Check console for logs.`);
    }
    
    const result = JSON.parse(response.responseBody);
    
    if (result.success) {
      // Store app keypair locally
      localStorage.setItem('metanet_app_private_key', privateKey);
      localStorage.setItem('metanet_app_public_key', publicKey);
      localStorage.setItem('metanet_bsv_address', bsvAddress);
      localStorage.setItem('metanet_user', JSON.stringify(result.user));
      
      return {
        ...result,
        isNewUser: result.isNewUser // Backend tells us if this was registration or auth
      };
    } else {
      throw new Error(result.error || 'Authentication/Registration failed');
    }
    
  } catch (error) {
    console.error('Auth/Register error:', error);
    throw error;
  }
}

/**
 * @deprecated Use authOrRegister() instead
 * Register new user
 */
export async function registerUser(connectionData, userData = {}) {
  return authOrRegister(connectionData, userData);
}

/**
 * @deprecated Use authOrRegister() instead
 * Authenticate existing user
 */
export async function authenticateUser(connectionData) {
  return authOrRegister(connectionData);
}

/**
 * Get current authenticated user from local storage
 * @returns {Object|null} User data or null
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem('metanet_user');
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem('metanet_app_private_key');
}

/**
 * Logout user
 */
export function logout() {
  localStorage.removeItem('metanet_app_private_key');
  localStorage.removeItem('metanet_app_public_key');
  localStorage.removeItem('metanet_bsv_address');
  localStorage.removeItem('metanet_user');
}

/**
 * Sign any request for authenticated API calls
 * @param {Object} requestData - Data to sign
 * @returns {Object} { requestData, appPublicKey, signature, timestamp }
 */
export function signRequest(requestData) {
  const privateKey = localStorage.getItem('metanet_app_private_key');
  const publicKey = localStorage.getItem('metanet_app_public_key');
  
  if (!privateKey || !publicKey) {
    throw new Error('Not authenticated');
  }
  
  const payload = {
    ...requestData,
    timestamp: Date.now()
  };
  
  const signature = signPayload(payload, privateKey);
  
  return {
    appPublicKey: publicKey,
    ...payload,
    signature
  };
}

export default {
  authOrRegister,
  registerUser, // deprecated, kept for compatibility
  authenticateUser, // deprecated, kept for compatibility
  getCurrentUser,
  isAuthenticated,
  logout,
  signRequest
};
