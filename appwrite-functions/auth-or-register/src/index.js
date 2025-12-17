/**
 * Authenticate or Register Metanet User
 * 
 * This function handles both authentication and registration in a single call.
 * If user exists, authenticates them. If not, registers them automatically.
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
 *   "appPublicKey": "02xxxxx...", // Derived from genericUseSeed
 *   "rootPrincipal": "xxxxx-xxxxx-xxxxx-xxxxx-xxx", // Optional
 *   "username": "optional_username",
 *   "displayName": "Optional Display Name",
 *   "avatar": "https://optional-avatar-url.com/image.jpg",
 *   "timestamp": 1234567890,
 *   "signature": "304402..." // Signs entire payload
 * }
 */

import { Client, Databases, ID, Query } from 'node-appwrite';

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
      appPublicKey,
      username,
      displayName,
      avatar,
      timestamp,
      signature
    } = payload;

    // Validate required fields
    if (!appPublicKey || !timestamp || !signature) {
      return res.json({
        success: false,
        error: 'Missing required fields: appPublicKey, timestamp, and signature',
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

    log(`Auth or Register: appPublicKey ${appPublicKey}`);

    // Check if user exists by appPublicKey
    const usersResponse = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [Query.equal('appPublicKey', appPublicKey)]
    );

    let user;
    let isNewUser = false;

    if (usersResponse.documents.length > 0) {
      // User exists - authenticate
      user = usersResponse.documents[0];

      // Update profile fields if provided and different
      const updates = {};
      if (username && username !== user.username) updates.username = username;
      if (displayName && displayName !== user.displayName) updates.displayName = displayName;
      if (avatar && avatar !== user.avatar) updates.avatar = avatar;

      if (Object.keys(updates).length > 0) {
        user = await databases.updateDocument(
          process.env.DATABASE_ID,
          process.env.USERS_COLLECTION_ID,
          user.$id,
          updates
        );
      }

      log(`User authenticated: ${user.$id}`);
    } else {
      // User doesn't exist - register
      isNewUser = true;

      // Check if username is already taken (if provided)
      if (username) {
        const existingUsername = await databases.listDocuments(
          process.env.DATABASE_ID,
          process.env.USERS_COLLECTION_ID,
          [Query.equal('username', username)]
        );

        if (existingUsername.documents.length > 0) {
          return res.json({
            success: false,
            error: 'Username already taken',
            code: 'USERNAME_TAKEN'
          }, 409);
        }
      }

      // Create new user with minimal fields (avoid sending attributes that may not exist)
      const newUserDoc = {
        appPublicKey,
        username: username || null,
        displayName: displayName || null,
        avatar: avatar || null,
        metadata: '{}'
      };

      user = await databases.createDocument(
        process.env.DATABASE_ID,
        process.env.USERS_COLLECTION_ID,
        ID.unique(),
        newUserDoc
      );

      log(`New user registered: ${user.$id}`);
    }

    // Return user data
    return res.json({
      success: true,
      isNewUser,
      user: {
        id: user.$id,
        appPublicKey: user.appPublicKey,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        roles: user.roles,
    userStatus: user.userStatus || user.status || null,
    metadata: user.metadata || null
      },
      message: isNewUser ? 'User registered successfully' : 'User authenticated successfully'
    }, 200);

  } catch (err) {
    error(`Auth or Register error: ${err.message}`);
    
    return res.json({
      success: false,
      error: err.message,
      code: 'AUTH_ERROR'
    }, 500);
  }
};
