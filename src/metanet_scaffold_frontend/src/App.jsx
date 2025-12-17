import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthProvider';
import { MetanetProvider, useMetanet } from './contexts/MetanetProvider';
import FileUpload from './components/FileUpload';
import AdminDemo from './components/AdminDemo';
import { isAppwriteConfigured } from './services/appwriteAuth';
import { interceptLinks } from './utils/metanetHelpers';
import { 
  ClipboardDemo, 
  LinkOpenDemo, 
  PaymentDemo, 
  ICPPaymentDemo,
  QRScanDemo, 
  GeolocationDemo,
  CreatePostDemo,
  TokenHistoryDemo
} from './components/MetanetDemos';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const appwriteConfigured = isAppwriteConfigured();



  // Automatically intercept all external link clicks to use Metanet openLink
  useEffect(() => {
    const cleanup = interceptLinks();
    return cleanup;
  }, []);

  const handleUploadComplete = (result) => {
    setUploadedFiles(prev => [...prev, result.file]);
  };

  return (
    <AuthProvider>
      <MetanetProvider>
        {/* important to keep the pt-[70px] minimum for top nav spacing of the parent platform of the iframe so that our content doesn't get hidden behind the nav. For our iframe app navigation it is suggested it uses footer menu for best results, in which case an appropriate pb will be needed as well */} 
        <div className="min-h-screen bg-gray-50 pt-[70px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                🚀 Metanet Scaffold
              </h1>
              <p className="text-xl text-gray-600">
                Production-ready scaffold for Metanet apps with Appwrite & Bunny CDN
              </p>
              
              {/* Debug Panel */}
            <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded text-xs text-left">
              <strong>🔍 Configuration Status:</strong>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>Metanet Auto-Connect: <span className={import.meta.env.VITE_METANET_AUTO_CONNECT !== 'false' ? 'text-green-600' : 'text-gray-600'}>{import.meta.env.VITE_METANET_AUTO_CONNECT !== 'false' ? '✓ ON' : '○ OFF'}</span></div>
                <div>Appwrite Endpoint: <span className={import.meta.env.VITE_APPWRITE_ENDPOINT ? 'text-green-600' : 'text-red-600'}>{import.meta.env.VITE_APPWRITE_ENDPOINT ? '✓ Set' : '✗ Missing'}</span></div>
                <div>Appwrite Project: <span className={import.meta.env.VITE_APPWRITE_PROJECT_ID ? 'text-green-600' : 'text-red-600'}>{import.meta.env.VITE_APPWRITE_PROJECT_ID ? '✓ Set' : '✗ Missing'}</span></div>
                <div>Database ID: <span className={import.meta.env.DATABASE_ID ? 'text-green-600' : 'text-red-600'}>{import.meta.env.DATABASE_ID ? '✓ Set' : '✗ Missing'}</span></div>
                <div>Bunny CDN Zone: <span className={import.meta.env.VITE_BUNNY_STORAGE_ZONE ? 'text-green-600' : 'text-yellow-600'}>{import.meta.env.VITE_BUNNY_STORAGE_ZONE ? '✓ Set' : '○ Optional'}</span></div>
                <div>Bunny Hostname: <span className={import.meta.env.VITE_BUNNY_HOSTNAME ? 'text-green-600' : 'text-yellow-600'}>{import.meta.env.VITE_BUNNY_HOSTNAME ? '✓ Set' : '○ Optional'}</span></div>
              </div>
            </div>
            
            {!appwriteConfigured && (
              <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 max-w-2xl mx-auto">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Appwrite not configured.</strong> Set <code className="bg-yellow-100 px-1 rounded">VITE_APPWRITE_ENDPOINT</code> and <code className="bg-yellow-100 px-1 rounded">VITE_APPWRITE_PROJECT_ID</code> in your .env file to enable backend features.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Metanet SDK Demo */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Metanet SDK Status</h2>
              <MetanetSDKDemo />
            </div>

            {/* Admin Demo */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <AdminDemo />
            </div>

            {/* File Upload Demo */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">File Upload Demo</h2>
              {appwriteConfigured ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Upload Image</h3>
                    <FileUpload 
                      type="image" 
                      onUploadComplete={handleUploadComplete}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded">
                  <p>Configure Appwrite in .env to enable file uploads.</p>
                </div>
              )}
            </div>
          </div>

          {/* Metanet SDK Feature Demos */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-12">
            <h2 className="text-2xl font-semibold mb-6">🚀 Metanet SDK Feature Demos</h2>
            <p className="text-sm text-gray-600 mb-6">
              Try all available SDK methods with dummy data. Connect to Metanet first to enable demos.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Clipboard */}
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <ClipboardDemo />
              </div>
              
              {/* Link Open */}
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <LinkOpenDemo />
              </div>
              
              {/* BSV Payment */}
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <PaymentDemo />
              </div>
              
              {/* ICP Payment */}
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <ICPPaymentDemo />
              </div>
              
              {/* QR Scanner */}
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <QRScanDemo />
              </div>
              
              {/* Geolocation */}
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <GeolocationDemo />
              </div>
              
              {/* Create Post */}
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <CreatePostDemo />
              </div>
              
              {/* Token History */}
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <TokenHistoryDemo />
              </div>
            </div>
          </div>

          {/* Uploaded Files Display */}
          {uploadedFiles.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Uploaded Files</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="border rounded p-2">
                    <img src={file.url} alt={file.originalName} className="w-full h-32 object-cover rounded mb-2" />
                    <p className="text-xs text-gray-600 truncate">{file.originalName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </MetanetProvider>
    </AuthProvider>
  );
}

function MetanetSDKDemo() {
  const metanet = useMetanet();
  const [connecting, setConnecting] = React.useState(false);

  const handleManualConnect = async () => {
    setConnecting(true);
    try {
      await metanet.connect();
    } catch (error) {
      console.error('Manual connect failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        {metanet.isConnected ? (
          <div className="space-y-2">
            <p className="flex items-center text-green-600 font-semibold">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              ✓ Connected to Metanet
            </p>
            {metanet.connectionData && (
              <div className="bg-green-50 p-3 rounded text-xs font-mono">
                <p><strong>BSV Address:</strong> {metanet.connectionData.bsvAddress?.slice(0, 30)}...</p>
                <p><strong>Principal:</strong> {metanet.connectionData.rootPrincipal?.slice(0, 30)}...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-center text-yellow-600">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Not connected to Metanet
            </p>
            
            {metanet.isConnecting ? (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                <p className="flex items-center text-blue-700">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Connecting... (Attempt {metanet.connectionAttempts}/3)
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  {metanet.autoConnectEnabled 
                    ? 'Auto-connect attempted. Use button to retry manually.'
                    : 'Click the button below to connect to Metanet platform.'}
                </p>
                <button
                  onClick={handleManualConnect}
                  disabled={connecting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  {connecting ? 'Connecting...' : '🔌 Connect to Metanet'}
                </button>
              </>
            )}
            
            {metanet.error && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                <strong>Error:</strong> {metanet.error}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t">
        <h3 className="font-medium mb-2">Available SDK Methods:</h3>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="bg-blue-50 p-2 rounded">
            <strong>💰 Payments:</strong> BSV payments, ICP token payments (ICP, ckUSDC, ckBTC, ckETH, GLDT)
            <div className="text-[10px] text-gray-600 mt-1">
              • Events: pay-response
            </div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <strong>📊 Token History:</strong> BSV transaction history, ICP token history (with pagination)
            <div className="text-[10px] text-gray-600 mt-1">
              • Events: token-history-response
            </div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <strong> Geolocation:</strong> Get location (progressive accuracy), Continuous tracking, Stop tracking
            <div className="text-[10px] text-gray-600 mt-1">
              • Events: geolocation-response (multiple updates until final)
            </div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <strong>📱 QR Scanner:</strong> Scan QR codes (continuous), Auto-stop on success
            <div className="text-[10px] text-gray-600 mt-1">
              • Events: qr-scan-response (per scan), qr-scan-stop-response (user cancelled)
            </div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <strong>📋 Clipboard:</strong> Write to clipboard (works without window.clipboard API)
            <div className="text-[10px] text-gray-600 mt-1">
              • No response (executes silently)
            </div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <strong>🔗 Links:</strong> Open external links (requires user approval overlay)
            <div className="text-[10px] text-gray-600 mt-1">
              • Events: open-link-response
            </div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <strong>📝 Posts:</strong> Create social media posts with media
            <div className="text-[10px] text-gray-600 mt-1">
              • Events: create-post-response
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <p className="font-semibold mb-1">Response Patterns:</p>
          <ul className="list-disc list-inside space-y-1 text-[10px]">
            <li><strong>Single response:</strong> connection, pay, token-history, open-link, create-post</li>
            <li><strong>No response:</strong> write-clipboard, qr-scan-stop, geolocation-stop</li>
            <li><strong>Continuous events:</strong> geolocation-response (progressive), qr-scan-response (each attempt)</li>
            <li><strong>User cancellation:</strong> qr-scan-stop-response, geolocation-response (final)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
