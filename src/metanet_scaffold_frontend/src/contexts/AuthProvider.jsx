/**
 * AuthProvider Context
 * 
 * Centralized authentication state management for:
 * - Metanet Platform connection (SDK credentials)
 * - Backend authentication (Appwrite user registration)
 * - Secure credential storage
 * - Auto-derivation of app-specific keys
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { authOrRegister } from '../services/appwriteAuth';

const AuthContext = createContext(null);

// Secure storage keys
const STORAGE_KEYS = {
  BSV_ADDRESS: 'metanet_bsv_address',
  PRINCIPAL: 'metanet_principal',
  GENERIC_SEED: 'metanet_app_private_key', // genericUseSeed from SDK
  APP_PUBLIC_KEY: 'metanet_app_public_key', // Derived from genericUseSeed
  USER_DATA: 'metanet_user', // Backend user info
  AUTHENTICATED: 'metanet_authenticated' // Backend auth flag
};

export function AuthProvider({ children }) {
  // Metanet Platform connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionData, setConnectionData] = useState(null);
  
  // Backend authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // Loading states
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Derive app-specific public key from genericUseSeed
   */
  const derivePublicKey = (genericUseSeed) => {
    return CryptoJS.SHA256(genericUseSeed).toString();
  };

  /**
   * Check and restore connection state from localStorage
   */
  useEffect(() => {
    const checkStoredAuth = () => {
      const bsvAddress = localStorage.getItem(STORAGE_KEYS.BSV_ADDRESS);
      const genericSeed = localStorage.getItem(STORAGE_KEYS.GENERIC_SEED);
      const principal = localStorage.getItem(STORAGE_KEYS.PRINCIPAL);
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      const authenticated = localStorage.getItem(STORAGE_KEYS.AUTHENTICATED);

      console.log('[AuthProvider] Checking stored auth:', {
        hasBsvAddress: !!bsvAddress,
        hasGenericSeed: !!genericSeed,
        hasPrincipal: !!principal,
        hasUserData: !!userData,
        authenticated
      });

      // Check Metanet connection
      if (bsvAddress && genericSeed) {
        setIsConnected(true);
        setConnectionData({
          bsvAddress,
          rootPrincipal: principal,
          genericUseSeed: genericSeed
        });

        // Ensure public key is derived and stored
        const storedPublicKey = localStorage.getItem(STORAGE_KEYS.APP_PUBLIC_KEY);
        if (!storedPublicKey) {
          const publicKey = derivePublicKey(genericSeed);
          localStorage.setItem(STORAGE_KEYS.APP_PUBLIC_KEY, publicKey);
          console.log('[AuthProvider] Derived and stored public key');
        }
      }

      // Check backend authentication
      if (authenticated === 'true' && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setIsAuthenticated(true);
          setUser(parsedUser);
        } catch (err) {
          console.error('[AuthProvider] Failed to parse user data:', err);
        }
      }
    };

    checkStoredAuth();
  }, []);

  /**
   * Handle Metanet SDK connection
   * Called after successful SDK.connect()
   */
  const handleConnection = (sdkConnectionData) => {
    console.log('[AuthProvider] Handling connection:', sdkConnectionData);

    const { bsvAddress, rootPrincipal, genericUseSeed } = sdkConnectionData;

    if (!bsvAddress || !genericUseSeed) {
      throw new Error('Invalid connection data: missing bsvAddress or genericUseSeed');
    }

    // Store Metanet credentials
    localStorage.setItem(STORAGE_KEYS.BSV_ADDRESS, bsvAddress);
    localStorage.setItem(STORAGE_KEYS.GENERIC_SEED, genericUseSeed);
    
    if (rootPrincipal) {
      localStorage.setItem(STORAGE_KEYS.PRINCIPAL, rootPrincipal);
    }

    // Derive and store app-specific public key
    const publicKey = derivePublicKey(genericUseSeed);
    localStorage.setItem(STORAGE_KEYS.APP_PUBLIC_KEY, publicKey);

    // Update state
    setIsConnected(true);
    setConnectionData({
      bsvAddress,
      rootPrincipal,
      genericUseSeed,
      appPublicKey: publicKey
    });

    console.log('[AuthProvider] Connection stored successfully', {
      bsvAddress: bsvAddress.substring(0, 10) + '...',
      publicKey: publicKey.substring(0, 16) + '...'
    });

    return { bsvAddress, publicKey };
  };

  /**
   * Authenticate with backend (auto-register if needed)
   * Uses the unified authOrRegister endpoint
   */
  const authenticate = async (userData = {}) => {
    if (!isConnected || !connectionData) {
      throw new Error('Must connect to Metanet first');
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      console.log('[AuthProvider] Authenticating with backend...');

      const result = await authOrRegister(connectionData, userData);

      if (result.success) {
        // Store backend authentication
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        localStorage.setItem(STORAGE_KEYS.AUTHENTICATED, 'true');

        setIsAuthenticated(true);
        setUser(result.user);

        console.log('[AuthProvider] Backend authentication successful', {
          isNewUser: result.isNewUser,
          username: result.user.username || 'N/A',
          role: result.user.role
        });

        return {
          success: true,
          isNewUser: result.isNewUser,
          user: result.user
        };
      }

      throw new Error(result.error || 'Authentication failed');

    } catch (err) {
      console.error('[AuthProvider] Authentication error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  /**
   * Disconnect and clear all credentials
   */
  const disconnect = () => {
    console.log('[AuthProvider] Disconnecting...');

    // Clear all stored credentials
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    // Reset state
    setIsConnected(false);
    setConnectionData(null);
    setIsAuthenticated(false);
    setUser(null);
    setError(null);

    console.log('[AuthProvider] Disconnected and cleared all credentials');
  };

  /**
   * Get signing credentials for authenticated requests
   */
  const getSigningCredentials = () => {
    const genericSeed = localStorage.getItem(STORAGE_KEYS.GENERIC_SEED);
    const publicKey = localStorage.getItem(STORAGE_KEYS.APP_PUBLIC_KEY);

    if (!genericSeed || !publicKey) {
      throw new Error('Not authenticated - no signing credentials available');
    }

    return {
      privateKey: genericSeed,
      publicKey
    };
  };

  /**
   * Sign a payload for authenticated API requests
   */
  const signPayload = (payload) => {
    const { privateKey, publicKey } = getSigningCredentials();

    const dataToSign = {
      appPublicKey: publicKey,
      ...payload,
      timestamp: Date.now()
    };

    // Sign with HMAC-SHA256 (matches backend expectation)
    const message = JSON.stringify(dataToSign);
    const signature = CryptoJS.HmacSHA256(message, privateKey).toString();

    return {
      ...dataToSign,
      signature
    };
  };

  const value = {
    // Connection state
    isConnected,
    connectionData,
    
    // Backend auth state
    isAuthenticated,
    user,
    isAuthenticating,
    error,
    
    // Methods
    handleConnection,
    authenticate,
    disconnect,
    getSigningCredentials,
    signPayload,
    
    // Utilities
    derivePublicKey
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthProvider;
