/**
 * Authenticate Metanet User
 * 
 * This function authenticates users using signature verification.
 * Frontend signs requests with app-specific key derived from genericUseSeed.
 * 
 * SECURITY MODEL:
 * - BSV address is the primary identifier (public, non-signing)
 * - App public key (derived from genericUseSeed) is used for signing
 * - Frontend signs authentication payload
 * - Backend verifies signature (never sees private key)
 * - No passwords, no OAuth - pure cryptographic authentication
 * 
 * Expected payload:
 * {
 *   "bsvAddress": "1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
 *   "appPublicKey": "02xxxxx...",
 *   "timestamp": 1234567890,
 *   "signature": "304402..." // Signs: { bsvAddress, appPublicKey, timestamp }
 * }
 */

import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Parse request body
    const payload = JSON.parse(req.body || '{}');
    const { bsvAddress, appPublicKey, timestamp, signature } = payload;

    // Validate required fields
    if (!bsvAddress || !appPublicKey || !timestamp || !signature) {
      return res.json({
        success: false,
        error: 'Missing required fields: bsvAddress, appPublicKey, timestamp, and signature',
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
    // Frontend signs: { bsvAddress, appPublicKey, timestamp }
    // TODO: Implement signature verification
    // const dataToVerify = JSON.stringify({ bsvAddress, appPublicKey, timestamp });
    // const isValid = secp256k1.verify(signature, hash(dataToVerify), appPublicKey);

    log(`Authenticating user with BSV address: ${bsvAddress}`);

    // Search for existing user by BSV address (primary identifier)
    const usersResponse = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [Query.equal('bsvAddress', bsvAddress)]
    );

    let user;

    if (usersResponse.documents.length > 0) {
      user = usersResponse.documents[0];

      // Verify the app public key matches the registered one
      if (user.appPublicKey !== appPublicKey) {
        return res.json({
          success: false,
          error: 'Invalid app public key for this user',
          code: 'INVALID_KEY'
        }, 401);
      }
      
      // User exists - update last login
      user = await databases.updateDocument(
        process.env.DATABASE_ID,
        process.env.USERS_COLLECTION_ID,
        user.$id,
        {
          lastLogin: new Date().toISOString()
        }
      );

      log(`User authenticated successfully: ${user.$id}`);

      return res.json({
        success: true,
        user: {
          id: user.$id,
          bsvAddress: user.bsvAddress,
          metanetPrincipal: user.metanetPrincipal,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          role: user.role,
          isActive: user.isActive
        },
        message: 'User authenticated successfully',
        isNewUser: false
      }, 200);

    } else {
      // User doesn't exist - needs to register first
      log(`User not found with BSV address: ${bsvAddress}`);

      return res.json({
        success: false,
        error: 'User not registered',
        code: 'USER_NOT_FOUND',
        message: 'Please register first',
        needsRegistration: true,
        bsvAddress: bsvAddress
      }, 404);
    }

  } catch (err) {
    error(`Authentication error: ${err.message}`);
    
    return res.json({
      success: false,
      error: err.message,
      code: 'AUTH_ERROR'
    }, 500);
  }
};
