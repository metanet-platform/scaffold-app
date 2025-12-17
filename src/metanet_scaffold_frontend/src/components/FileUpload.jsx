/**
 * File Upload Component
 * 
 * Example component showing how to upload files to Bunny CDN
 * Supports images, videos, and general files
 */

import { useState, useEffect } from 'react';
import { uploadImage, uploadVideo, uploadFile, listContent } from '../services/bunnycdn';

export default function FileUpload({ 
  type = 'file', // 'image', 'video', or 'file'
  onUploadComplete,
  onUploadError 
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [contentList, setContentList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Load content list on mount
  useEffect(() => {
    loadContentList();
  }, []);

  const loadContentList = async () => {
    setLoadingList(true);
    try {
      const result = await listContent('uploads');
      setContentList(result.contents || []);
    } catch (err) {
      console.error('Failed to load content list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      let result;

      // Choose upload method based on type
      switch (type) {
        case 'image':
          result = await uploadImage(file, (percent) => setProgress(percent));
          break;
        case 'video':
          result = await uploadVideo(file, (percent) => setProgress(percent));
          break;
        default:
          result = await uploadFile(file, (percent) => setProgress(percent));
      }

      setUploadedFile(result.file);
      setProgress(100);
      
      // Reload content list
      await loadContentList();
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      
      if (onUploadError) {
        onUploadError(err);
      }
    } finally {
      setUploading(false);
    }
  };

  const getAcceptedTypes = () => {
    switch (type) {
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      default:
        return '*/*';
    }
  };

  const getMaxSize = () => {
    switch (type) {
      case 'image':
        return '10MB';
      case 'video':
        return '500MB';
      default:
        return '50MB';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="file-upload">
      <div className="upload-area">
        <input
          type="file"
          onChange={handleFileSelect}
          accept={getAcceptedTypes()}
          disabled={uploading}
          className="file-input"
        />
        
        {!uploading && !uploadedFile && (
          <div className="upload-prompt">
            <svg className="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="upload-text">
              Click to upload {type}
            </p>
            <p className="upload-hint">
              Max size: {getMaxSize()}
            </p>
          </div>
        )}

        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="progress-text">{progress}%</p>
          </div>
        )}

        {uploadedFile && (
          <div className="upload-success">
            <svg className="success-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="success-text">Upload complete!</p>
            <p className="file-name">{uploadedFile.originalName}</p>
            
            {type === 'image' && (
              <img 
                src={uploadedFile.url} 
                alt={uploadedFile.originalName}
                className="uploaded-preview"
              />
            )}
            
            {type === 'video' && (
              <video 
                src={uploadedFile.url} 
                controls
                className="uploaded-preview"
              />
            )}
            
            <a 
              href={uploadedFile.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="view-file-link"
            >
              View File
            </a>
          </div>
        )}

        {error && (
          <div className="upload-error">
            <svg className="error-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="error-text">{error}</p>
          </div>
        )}
      </div>

      {/* Content List */}
      {contentList.length > 0 && (
        <div className="content-list">
          <h3 className="content-list-title">
            Your Uploads ({contentList.length})
          </h3>
          <div className="content-grid">
            {contentList.map((content) => (
              <div key={content.id} className="content-item">
                {content.metadata.fileType === 'image' && (
                  <img
                    src={content.cdnUrl}
                    alt={content.metadata.fileName}
                    className="content-thumbnail"
                  />
                )}
                {content.metadata.fileType === 'video' && (
                  <video
                    src={content.cdnUrl}
                    className="content-thumbnail"
                  />
                )}
                {content.metadata.fileType !== 'image' && content.metadata.fileType !== 'video' && (
                  <div className="content-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                  </div>
                )}
                <div className="content-info">
                  <p className="content-name">{content.metadata.fileName}</p>
                  <p className="content-size">{formatFileSize(content.metadata.fileSize)}</p>
                  <a
                    href={content.cdnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="content-link"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loadingList && (
        <div className="loading-list">
          <p>Loading uploads...</p>
        </div>
      )}

      <style>{`
        .file-upload {
          width: 100%;
          max-width: 500px;
        }

        .upload-area {
          border: 2px dashed #cbd5e0;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          transition: all 0.2s;
          position: relative;
        }

        .upload-area:hover {
          border-color: #4299e1;
          background-color: #f7fafc;
        }

        .file-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .file-input:disabled {
          cursor: not-allowed;
        }

        .upload-prompt {
          pointer-events: none;
        }

        .upload-icon {
          margin: 0 auto 1rem;
          color: #4299e1;
        }

        .upload-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }

        .upload-hint {
          font-size: 0.875rem;
          color: #718096;
        }

        .upload-progress {
          padding: 1rem 0;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background-color: #4299e1;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: #4299e1;
        }

        .upload-success {
          padding: 1rem 0;
        }

        .success-icon {
          margin: 0 auto 1rem;
          color: #48bb78;
        }

        .success-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }

        .file-name {
          font-size: 0.875rem;
          color: #718096;
          margin-bottom: 1rem;
          word-break: break-all;
        }

        .uploaded-preview {
          max-width: 100%;
          max-height: 300px;
          border-radius: 4px;
          margin: 1rem 0;
        }

        .view-file-link {
          display: inline-block;
          padding: 0.5rem 1rem;
          background-color: #4299e1;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          transition: background-color 0.2s;
        }

        .view-file-link:hover {
          background-color: #3182ce;
        }

        .upload-error {
          padding: 1rem;
          background-color: #fed7d7;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .error-icon {
          color: #f56565;
          flex-shrink: 0;
        }

        .error-text {
          color: #c53030;
          font-size: 0.875rem;
          text-align: left;
        }

        .content-list {
          margin-top: 2rem;
        }

        .content-list-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 1rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        .content-item {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .content-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .content-thumbnail {
          width: 100%;
          height: 150px;
          object-fit: cover;
          background-color: #f7fafc;
        }

        .content-placeholder {
          width: 100%;
          height: 150px;
          background-color: #f7fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a0aec0;
        }

        .content-info {
          padding: 0.75rem;
        }

        .content-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #2d3748;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .content-size {
          font-size: 0.75rem;
          color: #718096;
          margin-bottom: 0.5rem;
        }

        .content-link {
          display: inline-block;
          font-size: 0.75rem;
          color: #4299e1;
          text-decoration: none;
          font-weight: 600;
        }

        .content-link:hover {
          text-decoration: underline;
        }

        .loading-list {
          margin-top: 2rem;
          text-align: center;
          color: #718096;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
