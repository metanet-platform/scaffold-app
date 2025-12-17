/**
 * Grant User Role
 * 
 * Grants or updates user roles.
 * For development: allows self-registration as admin
 * For production: should verify admin credentials
 * 
 * Expected payload:
 * {
 *   "appPublicKey": "abc123...",
 *   "bsvAddress": "1xxxxx...",
 *   "role": "admin" | "moderator" | "user",
 *   "timestamp": 1234567890,
 *   "signature": "304402..."
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
    const { 
      appPublicKey,
      role,
      timestamp,
      signature
    } = payload;

    // Validate required fields
    if (!appPublicKey || !role || !timestamp || !signature) {
      return res.json({
        success: false,
        error: 'Missing required fields: appPublicKey, role, timestamp, signature',
        code: 'MISSING_FIELDS'
      }, 400);
    }

    // Validate role
    const validRoles = ['admin', 'moderator', 'user'];
    if (!validRoles.includes(role)) {
      return res.json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        code: 'INVALID_ROLE'
      }, 400);
    }

    // Check timestamp (5 minute window)
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 300000) {
      return res.json({
        success: false,
        error: 'Request expired',
        code: 'EXPIRED_REQUEST'
      }, 400);
    }

    // TODO: Verify signature
    log(`User ${appPublicKey} requesting role: ${role}`);

    // Find user by appPublicKey
    const usersResponse = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [Query.equal('appPublicKey', appPublicKey)]
    );

    if (usersResponse.documents.length === 0) {
      return res.json({
        success: false,
        error: 'User not found. Please register first.',
        code: 'USER_NOT_FOUND'
      }, 404);
    }

    const user = usersResponse.documents[0];

    // Parse existing roles or create new array
    let rolesArray = [];
    try {
      rolesArray = user.roles ? JSON.parse(user.roles) : [];
    } catch (e) {
      rolesArray = [];
    }

    // Authorization logic:
    // 1. If no admins exist in the system, allow first admin self-registration
    // 2. Otherwise, only existing admins can grant roles to others
    
    const isCurrentUserAdmin = rolesArray.includes('admin');
    
    // Check if any admin exists in the system
    const allUsersResponse = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [] // Get all users to check for existing admins
    );
    
    const hasExistingAdmin = allUsersResponse.documents.some(u => {
      try {
        const roles = u.roles ? JSON.parse(u.roles) : [];
        return roles.includes('admin');
      } catch (e) {
        return false;
      }
    });

    // Authorization check
    if (hasExistingAdmin && !isCurrentUserAdmin) {
      return res.json({
        success: false,
        error: 'Only admins can grant roles. First admin can self-assign.',
        code: 'UNAUTHORIZED'
      }, 403);
    }

    if (!hasExistingAdmin) {
      log(`✅ No admins exist - allowing first admin self-registration`);
    } else {
      log(`✅ Admin authorization verified`);
    }
    
    // Add role if not already present
    if (!rolesArray.includes(role)) {
      rolesArray.push(role);
    }

    // Update user roles and ensure status is active
    const updatedUser = await databases.updateDocument(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      user.$id,
      {
        roles: JSON.stringify(rolesArray),
        status: 'active'
      }
    );

    log(`✅ Role updated: ${user.username || user.appPublicKey} → ${rolesArray.join(', ')}`);

    return res.json({
      success: true,
      message: `Role granted successfully`,
      user: {
        $id: updatedUser.$id,
        appPublicKey: updatedUser.appPublicKey,
        username: updatedUser.username || 'User',
        role: rolesArray.join(', '),
        roles: updatedUser.roles,
        status: updatedUser.status
      }
    }, 200);

  } catch (err) {
    error(`Grant role error: ${err.message}`);
    
    return res.json({
      success: false,
      error: err.message,
      code: 'GRANT_ERROR'
    }, 500);
  }
};
