# Bunny CDN File Upload Guide

## Overview

The scaffold includes a complete, secure implementation for uploading files (images, videos, documents) to Bunny CDN storage. Storage credentials are kept on the backend, and upload URLs are generated server-side with user authentication.

**Features:**
- Upload images, videos, and documents of all types
- Secure: credentials never exposed to frontend
- Fast: direct upload to Bunny CDN (not through your server)
- Organized: namespace-based content organization (uploads, blogs, feed, etc.)
- Database integration: metadata automatically saved to Appwrite

## Security Architecture

```
Frontend → Appwrite Function → Bunny CDN Storage
   ↓            ↓                      ↓
 No creds   Has creds           Receives file
   ↓            ↓                      ↓
Display ← Database metadata ← Save after upload
```

1. **Frontend**: Requests signed upload URL (no storage password exposed)
2. **Appwrite Function**: Verifies user, generates unique file path, creates signed URL
3. **Bunny CDN**: Receives direct upload from frontend
4. **Database**: File metadata saved with namespace for organization

## Environment Variables

### Backend (Appwrite Function)
```bash
BUNNY_STORAGE_ZONE=your-storage-zone
BUNNY_STORAGE_PASSWORD=your-storage-password
BUNNY_STORAGE_REGION=de  # de, ny, la, sg, syd
BUNNY_HOSTNAME=your-cdn-hostname.b-cdn.net
```

### Frontend (.env)
```bash
# CDN configuration (safe for frontend)
VITE_BUNNY_STORAGE_ZONE=your-storage-zone
VITE_BUNNY_ACCESS_KEY=your-access-key
VITE_BUNNY_HOSTNAME=your-cdn-hostname.b-cdn.net

# Optional: File size limits
VITE_MAX_FILE_SIZE=52428800  # 50MB default
VITE_MAX_IMAGE_SIZE=10485760  # 10MB default
VITE_MAX_VIDEO_SIZE=524288000  # 500MB default
```

## Quick Start

### 1. Upload Any File

```jsx
import { uploadFile } from './services/bunnycdn';

async function handleUpload(file) {
  try {
    const result = await uploadFile(file);
    console.log('File uploaded:', result.file.url);
    console.log('Database entry:', result.content);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### 2. Upload Image

```jsx
import { uploadImage } from './services/bunnycdn';

async function handleImageUpload(imageFile) {
  try {
    const result = await uploadImage(imageFile);
    
    // Use the CDN URL
    setProfilePicture(result.file.url);
    
  } catch (error) {
    console.error('Image upload failed:', error);
  }
}
```

### 3. Upload Video

```jsx
import { uploadVideo } from './services/bunnycdn';

async function handleVideoUpload(videoFile) {
  try {
    const result = await uploadVideo(videoFile);
    
    // Use the CDN URL in a video player
    console.log('Video URL:', result.file.url);
    
  } catch (error) {
    console.error('Video upload failed:', error);
  }
}
```

### 4. Using the FileUpload Component

```jsx
import FileUpload from './components/FileUpload';

function MyPage() {
  const handleUploadComplete = (result) => {
    console.log('Upload complete:', result);
    console.log('CDN URL:', result.file.url);
    console.log('Database ID:', result.content.$id);
  };

  return (
    <div>
      <h2>Upload Files</h2>
      <FileUpload 
        onUploadComplete={handleUploadComplete}
        onUploadError={(err) => console.error(err)}
      />
    </div>
  );
}
```

The FileUpload component:
- Shows upload area with drag-and-drop
- Displays upload progress
- Shows preview after upload
- Lists all uploaded files in a grid
- Auto-reloads list after upload

## File Organization

### Namespace System

Files are organized using namespaces for different content types:

```javascript
// Upload to 'uploads' namespace (default)
await uploadFile(file);  // namespace: 'uploads'

// List files from 'uploads' namespace
const uploadedFiles = await listContent('uploads');

// You can extend this for other content types:
// - 'blogs' for blog post media
// - 'feed' for social feed content
// - 'avatars' for user profile pictures
// - any custom namespace
```

### File Path Structure

Files are automatically organized with unique paths:

```
{userId}/images/1735012345678_a1b2c3_profile.jpg
{userId}/videos/1735012567890_d4e5f6_intro.mp4
{userId}/files/1735012789012_g7h8i9_document.pdf
```

Pattern: `{userId}/{fileType}/{timestamp}_{random}_{filename}`

This ensures:
- No file name collisions
- Easy user-based organization
- Traceable uploads by timestamp

## Response Format

### Successful Upload

```javascript
{
  success: true,
  file: {
    name: "user123/images/1735012345678_a1b2c3_profile.jpg",
    originalName: "profile.jpg",
    url: "https://your-cdn.b-cdn.net/user123/images/1735012345678_a1b2c3_profile.jpg",
    type: "image",
    contentType: "image/jpeg",
    size: 245678
  },
  content: {
    $id: "content_document_id",
    userId: "user123",
    contentId: "user123/images/1735012345678_a1b2c3_profile.jpg",
    namespace: "uploads",
    status: "active",
    metadata: { originalName: "profile.jpg", contentType: "image/jpeg", size: 245678 },
    $createdAt: "2024-01-15T12:30:45.678Z"
  },
  message: "File uploaded successfully"
}
```

### List Content Response

```javascript
{
  success: true,
  namespace: "uploads",
  contents: [
    {
      $id: "...",
      userId: "user123",
      contentId: "user123/images/...",
      namespace: "uploads",
      status: "active",
      metadata: { originalName: "photo.jpg", contentType: "image/jpeg", size: 123456 },
      $createdAt: "2024-01-15T12:30:45.678Z"
    }
  ],
  total: 1
}
```

## Advanced Usage

### List User's Uploaded Content

```jsx
import { listContent } from './services/bunnycdn';

async function loadMyFiles() {
  try {
    // List files from 'uploads' namespace
    const result = await listContent('uploads');
    
    console.log('Total files:', result.total);
    console.log('Files:', result.contents);
    
    // Display files
    result.contents.forEach(content => {
      const cdnUrl = `https://${BUNNY_HOSTNAME}/${content.contentId}`;
      console.log(cdnUrl);
    });
    
  } catch (error) {
    console.error('Failed to list content:', error);
  }
}
```

### Upload with Progress Tracking

```jsx
import { uploadVideo } from './services/bunnycdn';

async function uploadWithProgress(file) {
  let lastProgress = 0;

  const result = await uploadVideo(file, (progress) => {
    if (progress - lastProgress >= 10) {
      console.log(`Upload progress: ${progress}%`);
      lastProgress = progress;
    }
  });

  return result;
}
```

### Batch Upload Multiple Files

```jsx
import { uploadImage } from './services/bunnycdn';

async function uploadMultiple(files) {
  const uploads = files.map(file => uploadImage(file));
  
  try {
    const results = await Promise.all(uploads);
    console.log('All files uploaded:', results);
    return results;
  } catch (error) {
    console.error('Batch upload failed:', error);
    throw error;
  }
}
```

## Error Handling

### Common Errors

```javascript
try {
  await uploadFile(file);
} catch (error) {
  if (error.message.includes('too large')) {
    alert('File is too large. Please choose a smaller file.');
  } else if (error.message.includes('authentication')) {
    alert('Please log in to upload files.');
  } else if (error.message.includes('generate upload URL')) {
    alert('Server error. Please try again later.');
  } else if (error.message.includes('namespace')) {
    alert('Please add namespace attribute to Content collection in Appwrite console.');
  } else {
    alert('Upload failed: ' + error.message);
  }
}
```

### Validation Before Upload

```javascript
import { uploadImage } from './services/bunnycdn';

function validateAndUpload(file) {
  // Check file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  // Check size (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image must be smaller than 10MB');
  }

  // Check dimensions (optional)
  const img = new Image();
  img.onload = async () => {
    if (img.width > 4096 || img.height > 4096) {
      throw new Error('Image dimensions too large');
    }
    await uploadImage(file);
  };
  img.src = URL.createObjectURL(file);
}
```

## CDN URL Management

### Get CDN URL for Existing File

```javascript
import { getCDNUrl } from './services/bunnycdn';

const fileUrl = getCDNUrl('user123/images/photo.jpg');
// Returns: https://your-cdn.b-cdn.net/user123/images/photo.jpg
```

### Check Configuration

```javascript
import { isBunnyConfigured } from './services/bunnycdn';

if (!isBunnyConfigured()) {
  console.warn('Bunny CDN not configured');
}
```

## Database Integration

The system automatically saves file metadata to Appwrite after upload:

### Content Collection Schema

```javascript
{
  userId: "user_id",           // Who uploaded it
  contentId: "path/to/file",   // Bunny CDN path
  namespace: "uploads",        // Content organization
  status: "active",            // active/deleted/etc
  metadata: {                  // File details
    originalName: "photo.jpg",
    contentType: "image/jpeg",
    size: 123456
  },
  $createdAt: "timestamp"      // Auto-generated
}
```

### Query Content

Files are automatically queried by:
- User ID (only see your own files)
- Namespace (organize by content type)
- Creation date (newest first)

## Best Practices

### 1. File Organization
- Use namespaces for different content types ('uploads', 'blogs', 'avatars')
- Original filenames preserved in metadata
- Unique paths prevent collisions
- User-based folders enable easy management

### 2. Size Limits
- Images: 10MB (configurable via `VITE_MAX_IMAGE_SIZE`)
- Videos: 500MB (configurable via `VITE_MAX_VIDEO_SIZE`)
- Files: 50MB (configurable via `VITE_MAX_FILE_SIZE`)
- Validate on frontend before upload to save bandwidth

### 3. Security
- Upload URLs expire in 1 hour
- User authentication required for all operations
- Signature verification prevents unauthorized uploads
- Storage password never exposed to frontend

### 4. Performance
- Upload directly to Bunny CDN (not through your server)
- Use CDN URLs in your app (global edge network)
- Files served from nearest edge location
- Enable CDN caching headers

### 5. User Experience
- Show upload progress bar
- Display preview/thumbnail after upload
- Handle errors gracefully with user-friendly messages
- Validate files before uploading
- Show list of uploaded files

## Troubleshooting

### Upload URL Generation Fails

Check Appwrite function environment variables:
```bash
node scripts/setup-functions.js
# Or manually in Appwrite Console → Functions → generate-bunny-upload-url → Settings → Environment Variables
```

Required variables:
- `BUNNY_STORAGE_ZONE`
- `BUNNY_STORAGE_PASSWORD`
- `BUNNY_STORAGE_REGION`
- `BUNNY_HOSTNAME`
- `CONTENT_COLLECTION_ID`

### Upload to Bunny CDN Fails

1. Verify storage zone exists in Bunny Dashboard
2. Check storage password is correct (not API key)
3. Verify AccessKey is correct
4. Check file size doesn't exceed limits
5. Verify region setting matches your storage zone

### File Not Saving to Database

1. Check `namespace` attribute exists in Content collection:
   - Go to Appwrite Console → Databases → main_database → Content
   - Attributes should include: `namespace` (string, 50, default: 'uploads')
   - Add index: `idx_namespace` on `namespace` field
2. Verify `CONTENT_COLLECTION_ID` is in function environment
3. Check function logs for errors

### CDN URL Not Working

1. Verify hostname in environment: `VITE_BUNNY_HOSTNAME`
2. Check file was actually uploaded (check Bunny Dashboard → Storage Zones)
3. Wait a few seconds for CDN propagation
4. Try accessing the file directly in browser

### Content List Empty

1. Ensure namespace attribute added to Content collection
2. Check files were uploaded successfully (check Bunny Dashboard)
3. Verify save-content action completed (check function logs)
4. Check user authentication (only see your own files)

## Complete Example

```jsx
import { useState } from 'react';
import { uploadImage, uploadVideo } from './services/bunnycdn';
import FileUpload from './components/FileUpload';

## Complete Example

```jsx
import { useState, useEffect } from 'react';
import { listContent } from './services/bunnycdn';
import FileUpload from './components/FileUpload';

function MediaGallery() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const result = await listContent('uploads');
      setFiles(result.contents);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (result) => {
    console.log('Upload complete:', result);
    // Reload the list
    loadFiles();
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">My Files</h1>
      
      {/* Upload Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Upload Files</h2>
        <FileUpload 
          onUploadComplete={handleUploadComplete}
          onUploadError={(err) => console.error(err)}
        />
      </section>

      {/* Files Grid */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Uploaded Files ({files.length})
        </h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : files.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file) => {
              const cdnUrl = `https://${import.meta.env.VITE_BUNNY_HOSTNAME}/${file.contentId}`;
              const isImage = file.metadata?.contentType?.startsWith('image/');
              const isVideo = file.metadata?.contentType?.startsWith('video/');
              
              return (
                <div key={file.$id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  {/* Thumbnail */}
                  <div className="mb-3 bg-gray-100 rounded aspect-video flex items-center justify-center overflow-hidden">
                    {isImage && (
                      <img src={cdnUrl} alt={file.metadata.originalName} className="w-full h-full object-cover" />
                    )}
                    {isVideo && (
                      <video src={cdnUrl} className="w-full h-full object-cover" />
                    )}
                    {!isImage && !isVideo && (
                      <div className="text-gray-400 text-4xl">📄</div>
                    )}
                  </div>
                  
                  {/* File Info */}
                  <h3 className="font-medium truncate mb-2">
                    {file.metadata?.originalName || 'Unknown file'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {(file.metadata?.size / 1024).toFixed(1)} KB
                  </p>
                  
                  {/* Actions */}
                  <a 
                    href={cdnUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View File →
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default MediaGallery;
```

## Summary

✅ **Simple & Secure**: Upload any file type to Bunny CDN storage  
✅ **Fast**: Direct upload to CDN (not through your server)  
✅ **Organized**: Namespace-based content organization (uploads, blogs, avatars, etc.)  
✅ **Database Integration**: Metadata automatically saved to Appwrite  
✅ **User-Friendly**: Upload component with progress, preview, and file list  
✅ **Production-Ready**: No TODOs, fully functional

**What's Included:**
- Image uploads with preview
- Video uploads (served via CDN, not streaming)
- Document uploads (PDFs, ZIP, etc.)
- Automatic database integration
- File list with thumbnails
- Progress tracking
- Error handling
- Namespace organization
