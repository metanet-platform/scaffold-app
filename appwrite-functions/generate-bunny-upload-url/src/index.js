/**
 * Content Management Function
 * 
 * Handles all content operations: upload URL generation, save after upload, list, delete
 * 
 * Actions:
 * - "generate-upload-url": Generate authenticated Bunny CDN upload URL
 * - "save-content": Save content metadata to database after successful upload
 * - "list-content": List user's content
 * - "delete-content": Delete content from database and Bunny CDN
 * 
 * Expected payload for generate-upload-url:
 * {
 *   "action": "generate-upload-url",
 *   "appPublicKey": "xxx",
 *   "fileName": "video.mp4",
 *   "fileType": "video",
 *   "contentType": "video/mp4",
 *   "timestamp": 1234567890,
 *   "signature": "xxx"
 * }
 * 
 * Expected payload for save-content:
 * {
 *   "action": "save-content",
 *   "appPublicKey": "xxx",
 *   "contentId": "userId/images/timestamp_hash_file.jpg",
 *   "fileName": "photo.jpg",
 *   "fileType": "image",
 *   "contentType": "image/jpeg",
 *   "fileSize": 12345,
 *   "timestamp": 1234567890,
 *   "signature": "xxx"
 * }
 */

import { Client, Databases, Query, ID } from 'node-appwrite';
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
    const { action, appPublicKey, timestamp, signature } = payload;

    // Validate common required fields
    if (!appPublicKey || !signature || !timestamp) {
      return res.json({
        success: false,
        error: 'Missing required fields: appPublicKey, signature, timestamp',
        code: 'MISSING_FIELDS'
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

    // Route to appropriate handler based on action
    // Default to 'generate-upload-url' for backward compatibility
    const actionType = action || 'generate-upload-url';
    
    if (actionType === 'save-content') {
      return await handleSaveContent(payload, databases, log, error, res);
    }
    
    if (actionType === 'list-content') {
      return await handleListContent(payload, databases, log, error, res);
    }
    
    // Default: generate upload URL
    const { fileName, fileType, contentType } = payload;
    
    // Validate required fields for upload URL generation
    if (!fileName || !fileType) {
      return res.json({
        success: false,
        error: 'Missing required fields: fileName, fileType',
        code: 'MISSING_FIELDS'
      }, 400);
    }

    log(`Generating upload URL for public key: ${appPublicKey.substring(0, 10)}...`);

    // Find user by appPublicKey
    let user = null;
    let userId = null;
    
    try {
      const usersResponse = await databases.listDocuments(
        process.env.DATABASE_ID,
        process.env.USERS_COLLECTION_ID,
        [Query.equal('appPublicKey', appPublicKey)]
      );

      if (usersResponse.documents.length === 0) {
        return res.json({
          success: false,
          error: 'User not registered. Please register first.',
          code: 'USER_NOT_FOUND'
        }, 404);
      }

      user = usersResponse.documents[0];
      
      if (user.status !== 'active') {
        return res.json({
          success: false,
          error: 'User account is not active',
          code: 'USER_INACTIVE'
        }, 403);
      }
      
      userId = user.$id;
      log(`User found: ${user.username || user.appPublicKey.substring(0, 10)}...`);
      
    } catch (dbError) {
      error(`Database error: ${dbError.message}`);
      return res.json({
        success: false,
        error: 'Database error while verifying user',
        code: 'DATABASE_ERROR'
      }, 500);
    }

    // Check if Bunny CDN is configured
    if (!process.env.BUNNY_STORAGE_ZONE || !process.env.BUNNY_STORAGE_PASSWORD) {
      return res.json({
        success: false,
        error: 'Bunny CDN not configured',
        code: 'BUNNY_NOT_CONFIGURED'
      }, 503);
    }

    // Generate unique contentId
    const timestamp_str = Date.now().toString();
    const randomString = crypto.randomBytes(8).toString('hex');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const contentId = `${userId}/${fileType}s/${timestamp_str}_${randomString}_${sanitizedFileName}`;

    // Bunny Storage API endpoint
    // Note: Bunny CDN storage doesn't use region-specific subdomains
    // The region is determined by your storage zone configuration in Bunny dashboard
    const storageZone = process.env.BUNNY_STORAGE_ZONE;
    const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${contentId}`;

    // For video streaming (if enabled)
    let streamingInfo = null;
    if (fileType === 'video' && process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY) {
      streamingInfo = {
        libraryId: process.env.BUNNY_STREAM_LIBRARY_ID,
        enabled: true,
        // Video will be automatically optimized for streaming
        createPullZone: true
      };
    }

    log(`Upload URL generated for: ${contentId}`);

    // Return upload details with Bunny CDN authentication
    return res.json({
      success: true,
      upload: {
        uploadUrl: uploadUrl,
        headers: {
          'AccessKey': process.env.BUNNY_STORAGE_PASSWORD,
          'Content-Type': contentType || 'application/octet-stream'
        },
        method: 'PUT'
      },
      file: {
        contentId: contentId,
        originalName: fileName,
        fileType: fileType,
        contentType: contentType,
        uploadedBy: userId
      },
      streaming: streamingInfo,
      message: 'Upload URL generated successfully. Store contentId in database.'
    }, 200);

  } catch (err) {
    error(`Content management error: ${err.message}`);
    
    return res.json({
      success: false,
      error: err.message,
      code: 'OPERATION_ERROR'
    }, 500);
  }
};

// Handler for save-content action
async function handleSaveContent(payload, databases, log, error, res) {
  const { appPublicKey, contentId, fileName, fileType, contentType, fileSize, namespace } = payload;

  // Validate required field
  if (!contentId) {
    return res.json({
      success: false,
      error: 'Missing required field: contentId',
      code: 'MISSING_FIELDS'
    }, 400);
  }

  // Default namespace to 'uploads' if not provided
  const contentNamespace = namespace || 'uploads';

  log(`Saving content metadata: ${contentId} in namespace: ${contentNamespace}`);

  try {
    // Find user by appPublicKey
    const usersResponse = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [Query.equal('appPublicKey', appPublicKey)]
    );

    if (usersResponse.documents.length === 0) {
      return res.json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, 404);
    }

    const userId = usersResponse.documents[0].$id;

    // Create metadata object
    const metadata = {
      fileName: fileName || 'unnamed',
      fileType: fileType || 'file',
      contentType: contentType || 'application/octet-stream',
      fileSize: fileSize || 0,
      uploadedAt: new Date().toISOString()
    };

    // Create content record in database
    const content = await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.CONTENT_COLLECTION_ID,
      ID.unique(),
      {
        userId: userId,
        contentId: contentId,
        namespace: contentNamespace,
        status: 'active',
        metadata: JSON.stringify(metadata)
      }
    );

    // Generate CDN URL
    const cdnUrl = `https://${process.env.BUNNY_HOSTNAME}/${contentId}`;

    log(`✅ Content saved to database: ${content.$id}`);

    return res.json({
      success: true,
      content: {
        id: content.$id,
        contentId: content.contentId,
        namespace: content.namespace,
        cdnUrl: cdnUrl,
        userId: content.userId,
        status: content.status,
        metadata: metadata,
        createdAt: content.$createdAt
      },
      message: 'Content saved successfully'
    }, 200);

  } catch (saveError) {
    error(`Save content error: ${saveError.message}`);
    return res.json({
      success: false,
      error: saveError.message,
      code: 'SAVE_ERROR'
    }, 500);
  }
}

// Handler for list-content action
async function handleListContent(payload, databases, log, error, res) {
  const { appPublicKey, namespace } = payload;

  // Default namespace to 'uploads' if not provided
  const contentNamespace = namespace || 'uploads';

  log(`Listing content in namespace: ${contentNamespace}`);

  try {
    // Find user by appPublicKey
    const usersResponse = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.USERS_COLLECTION_ID,
      [Query.equal('appPublicKey', appPublicKey)]
    );

    if (usersResponse.documents.length === 0) {
      return res.json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, 404);
    }

    const userId = usersResponse.documents[0].$id;

    // Get user's content in specified namespace
    const contentResponse = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.CONTENT_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('namespace', contentNamespace),
        Query.orderDesc('$createdAt')
      ]
    );

    const contents = contentResponse.documents.map(doc => {
      let metadata = {};
      try {
        metadata = JSON.parse(doc.metadata || '{}');
      } catch (e) {
        metadata = {};
      }

      return {
        id: doc.$id,
        contentId: doc.contentId,
        namespace: doc.namespace,
        cdnUrl: `https://${process.env.BUNNY_HOSTNAME}/${doc.contentId}`,
        status: doc.status,
        metadata: metadata,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt
      };
    });

    log(`✅ Found ${contents.length} content items in namespace: ${contentNamespace}`);

    return res.json({
      success: true,
      namespace: contentNamespace,
      contents: contents,
      total: contents.length
    }, 200);

  } catch (listError) {
    error(`List content error: ${listError.message}`);
    return res.json({
      success: false,
      error: listError.message,
      code: 'LIST_ERROR'
    }, 500);
  }
}

