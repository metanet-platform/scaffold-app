/**
 * Admin Demo Component
 * 
 * Demonstrates admin functionality:
 * - Register connected user as admin
 * - Grant admin role to users
 */

import { useState } from 'react';
import { Functions, Client } from 'appwrite';
import { useAuth } from '../contexts/AuthProvider';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const functions = new Functions(client);

export default function AdminDemo() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const registerAsAdmin = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!auth.isConnected) {
        throw new Error('Not connected to Metanet. Please connect first using the button above.');
      }

      // Step 1: Authenticate/register user first if not already authenticated
      if (!auth.isAuthenticated) {
        console.log('[AdminDemo] User not authenticated, registering first...');
        await auth.authenticate({
          appPublicKey: localStorage.getItem('metanet_app_public_key')
        });
        console.log('[AdminDemo] User registered/authenticated successfully');
      }

      // Step 2: Grant admin role
      console.log('[AdminDemo] Granting admin role...');
      
      // Sign the request to grant admin role using AuthProvider
      const signedRequest = auth.signPayload({
        role: 'admin'
      });

      console.log('[AdminDemo] Granting admin role:', signedRequest);

      // Call Appwrite function to grant admin role
      const response = await functions.createExecution(
        'grant-user-role',
        JSON.stringify(signedRequest),
        false
      );

      console.log('[AdminDemo] Response:', response);

      // Handle empty response body
      if (!response.responseBody || response.responseBody.trim() === '') {
        throw new Error(`Function failed with status ${response.responseStatusCode}. Check function logs.`);
      }

      const responseData = JSON.parse(response.responseBody);

      if (responseData.success) {
        setResult({
          success: true,
          message: 'Admin role granted successfully!',
          user: responseData.user
        });
        
        // Refresh user data in AuthProvider
        if (auth.user) {
          await auth.authenticate({
            appPublicKey: localStorage.getItem('metanet_app_public_key')
          });
        }
      } else {
        throw new Error(responseData.error || 'Failed to grant admin role');
      }

    } catch (err) {
      console.error('[AdminDemo] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        Admin Registration
      </h3>
      
      {!auth.isConnected && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 text-sm">
            ⚠️ Please connect to Metanet first using the "Connect to Metanet" button above.
          </p>
        </div>
      )}

      {auth.isConnected && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm">
            ✅ Connected - BSV Address: {auth.connectionData?.bsvAddress?.substring(0, 10)}...
          </p>
        </div>
      )}
      
      <p className="text-gray-600 mb-4">
        Register the currently connected user as an admin.
      </p>

      <button
        onClick={registerAsAdmin}
        disabled={loading || !auth.isConnected}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : '🛡️ Register as Admin'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 font-semibold">{result.message}</p>
          {result.user && (
            <div className="mt-2 text-sm text-gray-700">
              <p><strong>User:</strong> {result.user.username || result.user.appPublicKey?.substring(0, 10) + '...'}</p>
              <p><strong>Role:</strong> {result.user.role || 'N/A'}</p>
              <p><strong>Status:</strong> {result.user.status || 'N/A'}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h4 className="font-semibold text-gray-700 mb-2">ℹ️ Info</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Admin users can upload files to Bunny CDN</li>
          <li>• Admin users can grant roles to other users</li>
          <li>• This is for testing purposes only</li>
          <li>• In production, implement proper admin authorization</li>
        </ul>
      </div>
    </div>
  );
}
