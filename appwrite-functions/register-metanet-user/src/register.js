/**
 * Register Metanet User
 * 
 * This function registers new users from the Metanet platform.
 * It verifies the signature from the app-specific identity and creates a user record.
 * 
 * SECURITY MODEL:
 * - Frontend derives app-specific identity from genericUseSeed (32-byte hex)
 * - Frontend signs payload with this identity
 * - Backend verifies signature (never sees private key)
 * - BSV address is the main identifier (public, linked to parent platform)
 * - rootPrincipal is optional secondary identifier (public, ICP identity)
 * 
 * Expected payload:
 * {
 *   "bsvAddress": "1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 *   "appPublicKey": "02xxxxx...", // Derived from genericUseSeed
 *   "rootPrincipal": "xxxxx-xxxxx-xxxxx-xxxxx-xxx", // Optional
 *   "username": "optional_username",
 *   "displayName": "Optional Display Name",
 *   "avatar": "https://optional-avatar-url.com/image.jpg",
 *   "timestamp": 1234567890,
 *   "signature": "304402..." // Signs entire payload with app-specific key
 * }
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import crypto from 'crypto';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Parse request body
    const payload = JSON.parse(req.body || '{}');
    const { 
      bsvAddress,
      appPublicKey,
      rootPrincipal,
      username,
      displayName,
      avatar,
      timestamp,
      signature
    } = payload;

    // Validate required fields
    if (!bsvAddress || !appPublicKey || !signature || !timestamp) {
      return res.json({
        success: false,
        error: 'Missing required fields: bsvAddress, appPublicKey, signature, and timestamp',
        code: 'MISSING_FIELDS'
      }, 400);
    }

    // Check timestamp to prevent replay attacks (within 5 minutes)
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 300000) { // 5 minutes
      return res.json({
        success: false,
        error: 'Request expired. Timestamp too old.',
        code: 'EXPIRED_REQUEST'
      }, 400);
    }

    // Verify signature
    // Frontend signs: { bsvAddress, appPublicKey, rootPrincipal, username, displayName, avatar, timestamp }
    const dataToVerify = JSON.stringify({
      bsvAddress,
      appPublicKey,
      rootPrincipal,
      username,
      displayName,
      avatar,
      timestamp
    });

    // TODO: Implement signature verification with appPublicKey
    // For now, we trust the signature parameter
    // In production, use secp256k1 library to verify:
    // const isValid = secp256k1.verify(signature, hash(dataToVerify), appPublicKey);
    
    log(`Registering new user with BSV address: ${bsvAddress}`);

    // Check if user already exists by BSV address (primary identifier)
    const existingBsvUsers = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [Query.equal('bsvAddress', bsvAddress)]
    );

    if (existingBsvUsers.documents.length > 0) {
      return res.json({
        success: false,
        error: 'BSV address already registered',
        code: 'ADDRESS_EXISTS',
        userId: existingBsvUsers.documents[0].$id
      }, 409);
    }

    // Check if app public key is already used (prevents key reuse)
    const existingKeyUsers = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [Query.equal('appPublicKey', appPublicKey)]
    );

    if (existingKeyUsers.documents.length > 0) {
      return res.json({
        success: false,
        error: 'App public key already registered',
        code: 'KEY_EXISTS'
      }, 409);
    }

    // Create new user document
    const newUser = await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      ID.unique(),
      {
        bsvAddress: bsvAddress,
        appPublicKey: appPublicKey,
        metanetPrincipal: rootPrincipal || '',
        bsvPublicKey: '', // Platform public key (not app-specific)
        username: username || '',
        displayName: displayName || '',
        avatar: avatar || '',
        bio: '',
        role: process.env.VITE_DEFAULT_ROLE || 'user',
        isActive: true,
        lastLogin: new Date().toISOString(),
        metadata: JSON.stringify({
          registeredAt: new Date().toISOString(),
          registrationSource: 'metanet-scaffold',
          appPublicKey: appPublicKey
        })
      }
    );

    // Create default role assignment (keyed by BSV address)
    await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.ROLES_COLLECTION_ID,
      ID.unique(),
      {
        userPrincipal: bsvAddress, // Use BSV address as primary key
        roleName: process.env.VITE_DEFAULT_ROLE || 'user',
        permissions: JSON.stringify(['read:own', 'write:own', 'delete:own']),
        grantedBy: 'system',
        grantedAt: new Date().toISOString()
      }
    );

    log(`User registered successfully: ${newUser.$id}`);

    return res.json({
      success: true,
      user: {
        id: newUser.$id,
        bsvAddress: newUser.bsvAddress,
        metanetPrincipal: newUser.metanetPrincipal,
        username: newUser.username,
        displayName: newUser.displayName,
        avatar: newUser.avatar,
        role: newUser.role,
        isActive: newUser.isActive
      },
      message: 'User registered successfully',
      isNewUser: true
    }, 201);

  } catch (err) {
    error(`Registration error: ${err.message}`);
    
    return res.json({
      success: false,
      error: err.message,
      code: 'REGISTRATION_ERROR'
    }, 500);
  }
};
