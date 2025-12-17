/**
 * Bunny CDN Service
 * 
 * Handles file uploads to Bunny CDN via Appwrite function
 * Keeps storage credentials secure on backend
 */

import { Functions, Client } from 'appwrite';
import { signRequest } from './appwriteAuth';

// Initialize Appwrite client
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || '';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

let functions = null;

// Only initialize if Appwrite is configured
if (APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID) {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);
  
  functions = new Functions(client);
}

/**
 * Upload file to Bunny CDN
 * @param {File} file - File object from input
 * @param {string} fileType - 'video', 'image', or 'file'
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Upload result with CDN URL
 */
export async function uploadToBunny(file, fileType = 'file', onProgress) {
  try {
    // Check if Appwrite is configured
    if (!functions) {
      throw new Error('Appwrite is not configured. Please set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID in .env');
    }

    // Step 1: Get signed upload URL from Appwrite function
    const uploadUrlRequest = signRequest({
      action: 'generate-upload-url',
      fileName: file.name,
      fileType: fileType,
      contentType: file.type
    });

    const response = await functions.createExecution(
      'generate-bunny-upload-url',
      JSON.stringify(uploadUrlRequest),
      false
    );

    // Check if function execution succeeded
    if (response.status === 'failed' || response.statusCode >= 400) {
      console.error('[BunnyCDN] Function execution failed:', {
        status: response.status,
        statusCode: response.statusCode,
        stderr: response.stderr
      });
      const errorMsg = response.stderr || response.logs || response.errors || 'Function execution failed';
      throw new Error(`Appwrite function failed: ${errorMsg}`);
    }

    // Parse the response body
    const responseBody = response.responseBody || response.response;
    
    if (!responseBody) {
      throw new Error('Empty response from Appwrite function');
    }

    const result = JSON.parse(responseBody);

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate upload URL');
    }

    const { upload, file: fileInfo } = result;

    // Step 2: Upload file directly to Bunny CDN
    const uploadResponse = await fetch(upload.uploadUrl, {
      method: upload.method,
      headers: upload.headers,
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    console.log('[BunnyCDN] Upload successful, saving content metadata...');

    // Step 3: Save content metadata to database
    const saveContentRequest = signRequest({
      action: 'save-content',
      contentId: fileInfo.contentId,
      fileName: file.name,
      fileType: fileType,
      contentType: file.type,
      fileSize: file.size,
      namespace: 'uploads'
    });

    const saveResponse = await functions.createExecution(
      'generate-bunny-upload-url',
      JSON.stringify(saveContentRequest),
      false
    );

    console.log('[BunnyCDN] Save response:', saveResponse);
    console.log('[BunnyCDN] Save response body:', saveResponse.responseBody);
    console.log('[BunnyCDN] Save response status:', saveResponse.status, saveResponse.statusCode);

    if (saveResponse.status === 'failed' || saveResponse.statusCode >= 400) {
      console.error('[BunnyCDN] Save content failed:', saveResponse);
      throw new Error('Failed to save content metadata');
    }

    const saveResult = JSON.parse(saveResponse.responseBody);

    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save content');
    }

    console.log('[BunnyCDN] Content saved:', saveResult.content);

    // Step 4: Return file information with database record
    return {
      success: true,
      file: {
        id: saveResult.content.id,
        name: file.name,
        originalName: file.name,
        url: saveResult.content.cdnUrl,
        contentId: saveResult.content.contentId,
        type: fileType,
        contentType: file.type,
        size: file.size
      },
      message: 'File uploaded and saved successfully'
    };

  } catch (error) {
    console.error('Bunny upload error:', error);
    throw error;
  }
}

/**
 * Upload image to Bunny CDN
 * @param {File} imageFile - Image file
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Upload result
 */
export async function uploadImage(imageFile, onProgress) {
  // Validate image type
  if (!imageFile.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Check size (max 10MB for images)
  const maxSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760;
  if (imageFile.size > maxSize) {
    throw new Error(`Image too large. Max size: ${maxSize / 1024 / 1024}MB`);
  }

  return uploadToBunny(imageFile, 'image', onProgress);
}

/**
 * Upload video to Bunny CDN
 * @param {File} videoFile - Video file
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Upload result with file info and database record
 */
export async function uploadVideo(videoFile, onProgress) {
  // Validate video type
  if (!videoFile.type.startsWith('video/')) {
    throw new Error('File must be a video');
  }

  // Check size (max 500MB for videos)
  const maxSize = parseInt(import.meta.env.VITE_MAX_VIDEO_SIZE) || 524288000;
  if (videoFile.size > maxSize) {
    throw new Error(`Video too large. Max size: ${maxSize / 1024 / 1024}MB`);
  }

  return uploadToBunny(videoFile, 'video', onProgress);
}

/**
 * Upload general file to Bunny CDN
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFile(file, onProgress) {
  // Check size (max 50MB for files)
  const maxSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 52428800;
  if (file.size > maxSize) {
    throw new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
  }

  return uploadToBunny(file, 'file', onProgress);
}

/**
 * Get CDN URL for a file
 * @param {string} fileName - File name/path
 * @returns {string} Full CDN URL
 */
export function getCDNUrl(fileName) {
  const hostname = import.meta.env.VITE_BUNNY_HOSTNAME;
  return `https://${hostname}/${fileName}`;
}

/**
 * List content from a namespace
 * @param {string} namespace - Namespace to list content from (default: 'uploads')
 * @returns {Promise<Object>} List of content items
 */
export async function listContent(namespace = 'uploads') {
  try {
    // Check if Appwrite is configured
    if (!functions) {
      throw new Error('Appwrite is not configured');
    }

    const listRequest = signRequest({
      action: 'list-content',
      namespace: namespace
    });

    console.log('[BunnyCDN] Listing content in namespace:', namespace);

    const response = await functions.createExecution(
      'generate-bunny-upload-url',
      JSON.stringify(listRequest),
      false
    );

    if (response.status === 'failed' || response.statusCode >= 400) {
      throw new Error('Failed to list content');
    }

    const result = JSON.parse(response.responseBody);

    if (!result.success) {
      throw new Error(result.error || 'Failed to list content');
    }

    console.log('[BunnyCDN] Content list:', result);

    return {
      success: true,
      namespace: result.namespace,
      contents: result.contents,
      total: result.total
    };

  } catch (error) {
    console.error('List content error:', error);
    throw error;
  }
}

/**
 * Check if Bunny CDN is configured
 * @returns {boolean}
 */
export function isBunnyConfigured() {
  return !!(
    import.meta.env.VITE_BUNNY_STORAGE_ZONE &&
    import.meta.env.VITE_BUNNY_HOSTNAME
  );
}

export default {
  uploadToBunny,
  uploadImage,
  uploadVideo,
  uploadFile,
  listContent,
  getCDNUrl,
  isBunnyConfigured
};
