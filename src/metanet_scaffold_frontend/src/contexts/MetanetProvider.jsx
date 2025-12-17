/**
 * Metanet SDK Provider
 * 
 * React Context Provider for the Metanet Platform SDK.
 * Provides access to SDK methods and manages connection state.
 * Integrates with AuthProvider for credential management.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import metanetSDK from '../sdk/metanetSDK';
import { useAuth } from './AuthProvider';

const MetanetContext = createContext(null);

// Get auto-connect setting from environment
const AUTO_CONNECT = import.meta.env.VITE_METANET_AUTO_CONNECT !== 'false';

export const MetanetProvider = ({ children }) => {
  const auth = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const retryTimeoutRef = useRef(null);
  const attemptCountRef = useRef(0);

  /**
   * Connect to Metanet platform with retry logic
   * Automatically updates AuthProvider on successful connection
   */
  const connect = useCallback(async (options = {}) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('[MetanetProvider] Connecting to Metanet...');
      const data = await metanetSDK.connect(options);
      
      // Store connection in AuthProvider
      auth.handleConnection(data);
      
      attemptCountRef.current = 0; // Reset attempt counter on success
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      console.log('[MetanetProvider] Connection successful');
      return data;
    } catch (err) {
      console.error('[MetanetProvider] Connection error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [auth]);

  /**
   * Auto-connect with retry (3 attempts, 1 second apart)
   */
  const autoConnect = useCallback(async () => {
    if (autoConnectAttempted || auth.isConnected || attemptCountRef.current >= 3) {
      return;
    }

    attemptCountRef.current++;
    console.log(`[Metanet] Auto-connect attempt ${attemptCountRef.current}/3`);
    
    try {
      await connect();
      console.log('[Metanet] Auto-connect successful');
    } catch (err) {
      console.log(`[Metanet] Auto-connect attempt ${attemptCountRef.current} failed:`, err.message);
      
      // Retry after 1 second if attempts remain
      if (attemptCountRef.current < 3) {
        retryTimeoutRef.current = setTimeout(() => {
          autoConnect();
        }, 1000);
      } else {
        console.log('[Metanet] Auto-connect failed after 3 attempts. Use manual connect button.');
        setAutoConnectAttempted(true);
      }
    }
  }, [autoConnectAttempted, auth.isConnected, connect]);

  /**
   * Initialize auto-connect on mount if enabled
   */
  useEffect(() => {
    if (AUTO_CONNECT && !autoConnectAttempted && !auth.isConnected) {
      autoConnect();
    }

    // Cleanup timeout on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [AUTO_CONNECT, autoConnectAttempted, auth.isConnected, autoConnect]);

  /**
   * Disconnect from platform and clear auth
   */
  const disconnect = useCallback(() => {
    auth.disconnect();
    metanetSDK.isConnected = false;
    metanetSDK.connectionData = null;
    console.log('[MetanetProvider] Disconnected');
  }, [auth]);

  /**
   * Make BSV payment
   */
  const payBSV = useCallback(async (recipients) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.payBSV(recipients);
  }, [auth.isConnected]);

  /**
   * Make ICP payment
   */
  const payICP = useCallback(async (ledgerId, recipient, amount, memo) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.payICP(ledgerId, recipient, amount, memo);
  }, [auth.isConnected]);

  /**
   * Get token history (deprecated - use getBSVHistory or getICPTokenHistory)
   */
  const getTokenHistory = useCallback(async (tokenId, limit) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.getTokenHistory(tokenId, limit);
  }, [auth.isConnected]);

  /**
   * Get BSV transaction history
   */
  const getBSVHistory = useCallback(async (options) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.getBSVHistory(options);
  }, [auth.isConnected]);

  /**
   * Get ICP token transaction history
   */
  const getICPTokenHistory = useCallback(async (indexCanisterId, options) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.getICPTokenHistory(indexCanisterId, options);
  }, [auth.isConnected]);

  /**
   * Authorize token swap
   */
  const authorizeSwap = useCallback(async (swapParams) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.authorizeSwap(swapParams);
  }, [auth.isConnected]);

  /**
   * Execute swap buy
   */
  const swapBuy = useCallback(async (buyParams) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.swapBuy(buyParams);
  }, [auth.isConnected]);

  /**
   * Get full transaction
   */
  const getFullTransaction = useCallback(async (txid) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.getFullTransaction(txid);
  }, [auth.isConnected]);

  /**
   * Get geolocation
   */
  const getGeolocation = useCallback(async (options) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.getGeolocation(options);
  }, [auth.isConnected]);

  /**
   * Listen for geolocation updates
   */
  const onGeolocation = useCallback((callback) => {
    return metanetSDK.onGeolocation(callback);
  }, []);

  /**
   * Scan QR code
   */
  const scanQRCode = useCallback(async (options) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.scanQRCode(options);
  }, [auth.isConnected]);

  /**
   * Stop QR scan
   */
  const stopQRScan = useCallback(() => {
    metanetSDK.stopQRScan();
  }, []);

  /**
   * Listen for QR scan responses
   */
  const onQRScanResponse = useCallback((callback) => {
    return metanetSDK.onQRScanResponse(callback);
  }, []);

  /**
   * Listen for QR scan stop
   */
  const onQRScanStop = useCallback((callback) => {
    return metanetSDK.onQRScanStop(callback);
  }, []);

  /**
   * Create post
   */
  const createPost = useCallback(async (postData) => {
    if (!auth.isConnected) {
      throw new Error('Not connected to Metanet platform');
    }
    return await metanetSDK.createPost(postData);
  }, [auth.isConnected]);

  /**
   * Open link
   */
  const openLink = useCallback(async (url) => {
    return await metanetSDK.openLink(url);
  }, []);

  /**
   * Write to clipboard
   */
  const writeClipboard = useCallback((text) => {
    metanetSDK.writeClipboard(text);
  }, []);

  /**
   * Listen for events
   */
  const on = useCallback((eventType, callback) => {
    metanetSDK.on(eventType, callback);
  }, []);

  /**
   * Remove event listener
   */
  const off = useCallback((eventType, callback) => {
    metanetSDK.off(eventType, callback);
  }, []);

  /**
   * Listen for event once
   */
  const once = useCallback((eventType, callback) => {
    metanetSDK.once(eventType, callback);
  }, []);

  const value = {
    // State - delegated to AuthProvider
    isConnected: auth.isConnected,
    connectionData: auth.connectionData,
    isConnecting,
    error,
    autoConnectEnabled: AUTO_CONNECT,
    connectionAttempts: attemptCountRef.current,
    
    // Auth state
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    
    // Connection
    connect,
    disconnect,
    authenticate: auth.authenticate,
    
    // Payments
    payBSV,
    payICP,
    
    // Tokens
    getTokenHistory,
    getBSVHistory,
    getICPTokenHistory,
    authorizeSwap,
    swapBuy,
    
    // Transactions
    getFullTransaction,
    
    // Geolocation
    getGeolocation,
    onGeolocation,
    stopGeolocation: metanetSDK.stopGeolocation.bind(metanetSDK),
    
    // QR Code
    scanQRCode,
    stopQRScan,
    onQRScanResponse,
    onQRScanStop,
    
    // Content
    createPost,
    
    // Utilities
    openLink,
    writeClipboard,
    
    // Events
    on,
    off,
    once,
    
    // Direct SDK access for advanced usage
    sdk: metanetSDK
  };

  return (
    <MetanetContext.Provider value={value}>
      {children}
    </MetanetContext.Provider>
  );
};

/**
 * useMetanet Hook
 * 
 * Custom hook to access Metanet SDK from any component
 * @returns {Object} Metanet SDK context
 */
export const useMetanet = () => {
  const context = useContext(MetanetContext);
  
  if (!context) {
    throw new Error('useMetanet must be used within MetanetProvider');
  }
  
  return context;
};

export default MetanetProvider;
