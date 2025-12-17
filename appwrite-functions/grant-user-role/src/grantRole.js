/**
 * Grant User Role
 * 
 * This function grants or updates user roles (admin only).
 * 
 * Expected payload:
 * {
 *   "adminPrincipal": "xxxxx-xxxxx-xxxxx-xxxxx-xxx",
 *   "targetPrincipal": "xxxxx-xxxxx-xxxxx-xxxxx-xxx",
 *   "newRole": "moderator",
 *   "permissions": ["read:all", "write:all"], // optional custom permissions
 *   "expiresAt": "2025-12-31T23:59:59Z" // optional expiration
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
      adminPrincipal, 
      targetPrincipal, 
      newRole,
      permissions,
      expiresAt
    } = payload;

    // Validate required fields
    if (!adminPrincipal || !targetPrincipal || !newRole) {
      return res.json({
        success: false,
        error: 'Missing required fields: adminPrincipal, targetPrincipal, and newRole',
        code: 'MISSING_FIELDS'
      }, 400);
    }

    log(`Admin ${adminPrincipal} attempting to grant role ${newRole} to ${targetPrincipal}`);

    // Verify admin has permission
    const adminUsers = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [Query.equal('metanetPrincipal', adminPrincipal)]
    );

    if (adminUsers.documents.length === 0) {
      return res.json({
        success: false,
        error: 'Admin user not found',
        code: 'ADMIN_NOT_FOUND'
      }, 404);
    }

    const admin = adminUsers.documents[0];

    if (admin.role !== 'admin') {
      return res.json({
        success: false,
        error: 'Insufficient permissions. Admin role required.',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, 403);
    }

    // Get target user
    const targetUsers = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [Query.equal('metanetPrincipal', targetPrincipal)]
    );

    if (targetUsers.documents.length === 0) {
      return res.json({
        success: false,
        error: 'Target user not found',
        code: 'TARGET_NOT_FOUND'
      }, 404);
    }

    const targetUser = targetUsers.documents[0];

    // Update user's role
    await databases.updateDocument(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      targetUser.$id,
      {
        role: newRole
      }
    );

    // Create or update role assignment
    const existingRoles = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.ROLES_COLLECTION_ID,
      [
        Query.equal('userPrincipal', targetPrincipal),
        Query.equal('roleName', newRole)
      ]
    );

    const defaultPermissions = {
      'admin': ['read:all', 'write:all', 'delete:all', 'manage:users', 'manage:roles'],
      'moderator': ['read:all', 'write:all', 'delete:own', 'moderate:content'],
      'user': ['read:own', 'write:own', 'delete:own']
    };

    const rolePermissions = permissions || defaultPermissions[newRole] || ['read:own'];

    if (existingRoles.documents.length > 0) {
      // Update existing role
      await databases.updateDocument(
        process.env.DATABASE_ID,
        process.env.ROLES_COLLECTION_ID,
        existingRoles.documents[0].$id,
        {
          permissions: JSON.stringify(rolePermissions),
          grantedBy: adminPrincipal,
          grantedAt: new Date().toISOString(),
          expiresAt: expiresAt || null
        }
      );
    } else {
      // Create new role assignment
      await databases.createDocument(
        process.env.DATABASE_ID,
        process.env.ROLES_COLLECTION_ID,
        ID.unique(),
        {
          userPrincipal: targetPrincipal,
          roleName: newRole,
          permissions: JSON.stringify(rolePermissions),
          grantedBy: adminPrincipal,
          grantedAt: new Date().toISOString(),
          expiresAt: expiresAt || null
        }
      );
    }

    log(`Role ${newRole} granted successfully to user ${targetPrincipal}`);

    return res.json({
      success: true,
      message: `Role ${newRole} granted successfully`,
      user: {
        id: targetUser.$id,
        metanetPrincipal: targetUser.metanetPrincipal,
        username: targetUser.username,
        newRole: newRole,
        permissions: rolePermissions
      }
    }, 200);

  } catch (err) {
    error(`Grant role error: ${err.message}`);
    
    return res.json({
      success: false,
      error: err.message,
      code: 'GRANT_ROLE_ERROR'
    }, 500);
  }
};
