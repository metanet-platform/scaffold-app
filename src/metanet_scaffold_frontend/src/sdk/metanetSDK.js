/**
 * Metanet Platform SDK
 * 
 * Complete SDK for interacting with the Metanet platform from iframed apps.
 * Provides type-safe methods for all available platform features:
 * - Connection & Authentication
 * - BSV & ICP Payments
 * - Token Swaps
 * - Transaction History
 * - Geolocation
 * - QR Scanning
 * - Link Opening
 * - Clipboard Operations
 * - Post Creation
 * 
 * @module MetanetSDK
 */

import CryptoJS from 'crypto-js';

class MetanetSDK {
  constructor() {
    this.eventTarget = new EventTarget();
    this.responseCallbacks = new Map();
    this.isConnected = false;
    this.connectionData = null;
    
    // Trusted origins for production security
    this.trustedOrigins = [
      'https://www.metanet.page',
      'https://www.metanet.ninja',
      'http://localhost:3000', // Development
      'http://localhost:5173'  // Development
    ];
    
    // Listen for responses from parent window
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        this._handlePlatformResponse(event);
      });
    }
  }

  /**
   * Internal: Handle responses from platform
   * @private
   */
  _handlePlatformResponse(event) {
    // SECURITY: Check origin in production
    if (import.meta.env.PROD && !this.trustedOrigins.includes(event.origin)) {
      console.warn('[MetanetSDK] Rejected message from untrusted origin:', event.origin);
      return;
    }
    
    // Log raw event data
    console.log('[MetanetSDK] Raw event.data:', event.data);
    
    // Response structure: entire event.data is the response
    // { command: 'ninja-app-command', type: 'xxx-response', payload: ref, ...other data at root }
    const responseData = event.data;
    const { command, type } = responseData;
    
    console.log('[MetanetSDK] Parsed:', { command, type, hasData: !!responseData });
    
    // Only process ninja-app-command responses
    if (command !== 'ninja-app-command') {
      return;
    }
    
    // Debug logging
    console.log('[MetanetSDK] Processing response type:', type);
    
    // Trigger response callbacks for this type, passing entire response
    if (type && this.responseCallbacks.has(type)) {
      const callbacks = this.responseCallbacks.get(type);
      callbacks.forEach(callback => callback(responseData));
    }
    
    // Trigger event listeners
    this.eventTarget.dispatchEvent(new CustomEvent(type, { 
      detail: responseData 
    }));
  }

  /**
   * Internal: Send command to parent platform
   * @private
   */
  _sendCommand(commandObj) {
    try {
      console.log('[MetanetSDK] Sending command:', commandObj);
      window.parent.postMessage(
        { command: 'ninja-app-command', detail: commandObj },
        '*'
      );
    } catch (err) {
      console.error('MetanetSDK: Error sending command:', err);
      throw err;
    }
  }

  /**
   * Internal: Generate unique reference ID
   * @private
   */
  _generateRef() {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==========================================
  // CONNECTION & AUTHENTICATION
  // ==========================================

  /**
   * Connect to Metanet platform and get user identity
   * @param {Object} options - Connection options
   * @param {string} options.navbg - Navigation background color (optional)
   * @returns {Promise<Object>} Connection data with identity, keys, and wallet info
   */
  async connect(options = {}) {
    const ref = this._generateRef();
    
    console.log('[MetanetSDK] Initiating connection with ref:', ref);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[MetanetSDK] Connection timeout after 30s');
        this.off('connection-response', handler);
        reject(new Error('Connection timeout - no response from platform'));
      }, 30000);

      const handler = (responseData) => {
        console.log('[MetanetSDK] Connection response handler called');
        console.log('[MetanetSDK] Full response data:', responseData);
        console.log('[MetanetSDK] Response keys:', Object.keys(responseData));
        
        // Response structure based on actual platform response
        const { 
          payload, 
          icIdentityPackage,
          genericUseSeed, 
          signature, 
          appPageSchema 
        } = responseData;
        
        // Extract data from payload object
        const wallet = payload?.wallet;
        const appId = payload?.appId;
        const timestamp = payload?.timestamp;
        const anonymous = payload?.anonymous;
        const icDelegation = payload?.icDelegation;
        const ref = payload?.ref;
        
        console.log('[MetanetSDK] Extracted fields:', { 
          ref, 
          wallet,
          appId,
          timestamp,
          anonymous,
          hasIcDelegation: !!icDelegation,
          hasGenericUseSeed: !!genericUseSeed
        });
        
        console.log('[MetanetSDK] Wallet contents:', {
          address: wallet?.address,
          publicKeyHex: wallet?.publicKeyHex,
          rootPrincipal: wallet?.rootPrincipal,
          walletKeys: wallet ? Object.keys(wallet) : 'no wallet'
        });
        
        if (ref) { // payload contains the ref
          clearTimeout(timeout);
          this.off('connection-response', handler);
          
          this.isConnected = true;
          
          // Extract wallet data
          const bsvAddress = wallet?.address;
          const bsvPublicKey = wallet?.publicKeyHex;
          const rootPrincipal = wallet?.rootPrincipal;
          
          this.connectionData = {
            appId,
            timestamp,
            anonymous: anonymous || false,
            rootPrincipal,
            bsvAddress,
            bsvPublicKey,
            icDelegation,
            icDelegationPrivateKey: icIdentityPackage?.privateKey,
            genericUseSeed,
            signature,
            appPageSchema,
            // Store raw response for debugging
            _raw: responseData
          };
          
          // Store authentication data in localStorage for API calls
          if (genericUseSeed) {
            localStorage.setItem('metanet_app_private_key', genericUseSeed);
            // Derive and store public key for authentication
            const publicKey = CryptoJS.SHA256(genericUseSeed).toString();
            localStorage.setItem('metanet_app_public_key', publicKey);
          }
          if (bsvAddress) {
            localStorage.setItem('metanet_bsv_address', bsvAddress);
          }
          if (rootPrincipal) {
            localStorage.setItem('metanet_principal', rootPrincipal);
          }
          
          console.log('[MetanetSDK] Connection successful!', {
            bsvAddress: this.connectionData.bsvAddress,
            principal: this.connectionData.rootPrincipal?.slice(0, 20),
            anonymous: this.connectionData.anonymous,
            hasGenericUseSeed: !!this.connectionData.genericUseSeed,
            fullData: this.connectionData
          });
          
          resolve(this.connectionData);
        } else {
          console.warn('[MetanetSDK] Response ref mismatch or no payload:', payload?.ref, 'expected:', ref);
        }
      };

      this.on('connection-response', handler);
      
      this._sendCommand({
        type: 'connection',
        ref,
        navbg: options.navbg || null
      });
    });
  }

  /**
   * Get current connection status
   * @returns {boolean} Whether connected to platform
   */
  isUserConnected() {
    return this.isConnected;
  }

  /**
   * Get stored connection data
   * @returns {Object|null} Connection data or null if not connected
   */
  getConnectionData() {
    return this.connectionData;
  }

  /**
   * Disconnect from Metanet and clear stored data
   */
  disconnect() {
    this.isConnected = false;
    this.connectionData = null;
    
    // Clear stored auth data
    localStorage.removeItem('metanet_app_private_key');
    localStorage.removeItem('metanet_bsv_address');
    localStorage.removeItem('metanet_principal');
    
    console.log('[MetanetSDK] Disconnected and cleared auth data');
  }

  // ==========================================
  // PAYMENTS
  // ==========================================

  /**
   * Request BSV payment
   * @param {Array<Object>} recipients - Payment recipients
   * @param {string} recipients[].address - BSV address (optional if reason provided)
   * @param {number} recipients[].value - Amount in satoshis
   * @param {string} recipients[].reason - Payment reason/description
   * @param {string} recipients[].note - Optional note
   * @returns {Promise<Object>} Payment result with txid and success status
   */
  async payBSV(recipients) {
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('pay-response', handler);
        reject(new Error('Payment timeout'));
      }, 60000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('pay-response', handler);
          
          if (payload.success) {
            resolve(payload);
          } else {
            reject(new Error(payload.error || 'Payment failed'));
          }
        }
      };

      this.on('pay-response', handler);
      
      this._sendCommand({
        type: 'pay',
        ref,
        recipients
      });
    });
  }

  /**
   * Request ICP token payment
   * @param {string} ledgerId - ICP ledger canister ID
   * @param {string} recipient - Recipient principal or account
   * @param {number} amount - Amount in token's smallest unit
   * @param {string} memo - Optional memo
   * @returns {Promise<Object>} Payment result
   */
  async payICP(ledgerId, recipient, amount, memo = '') {
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('pay-response', handler);
        reject(new Error('Payment timeout'));
      }, 60000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('pay-response', handler);
          
          if (payload.success) {
            resolve(payload);
          } else {
            reject(new Error(payload.error || 'Payment failed'));
          }
        }
      };

      this.on('pay-response', handler);
      
      this._sendCommand({
        type: 'pay',
        ref,
        token: {
          protocol: 'ICP',
          specification: { ledgerId }
        },
        recipients: [
          {
            address: recipient,
            value: amount,
            note: memo
          }
        ]
      });
    });
  }

  // ==========================================
  // TOKEN OPERATIONS
  // ==========================================

  /**
   * Get token transaction history for BSV
   * @param {Object} options - Query options
   * @param {number} options.offset - Starting position (default: 0)
   * @param {number} options.limit - Number of transactions (default: 50, max: 100)
   * @returns {Promise<Object>} Transaction history with pagination
   */
  async getBSVHistory(options = {}) {
    const { offset = 0, limit = 50 } = options;
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('token-history-response', handler);
        reject(new Error('Request timeout'));
      }, 30000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('token-history-response', handler);
          
          if (payload.success) {
            resolve(payload);
          } else {
            reject(new Error(payload.error || 'Failed to fetch BSV history'));
          }
        }
      };

      this.on('token-history-response', handler);
      
      this._sendCommand({
        type: 'token-history',
        ref,
        offset,
        limit
      });
    });
  }

  /**
   * Get token transaction history for ICP tokens
   * @param {string} indexCanisterId - ICP index canister ID
   * @param {Object} options - Query options
   * @param {number} options.offset - Starting position (default: 0)
   * @param {number} options.limit - Number of transactions (default: 50, max: 100)
   * @returns {Promise<Object>} Transaction history with pagination
   */
  async getICPTokenHistory(indexCanisterId, options = {}) {
    const { offset = 0, limit = 50 } = options;
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('token-history-response', handler);
        reject(new Error('Request timeout'));
      }, 30000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('token-history-response', handler);
          
          if (payload.success) {
            resolve(payload);
          } else {
            reject(new Error(payload.error || 'Failed to fetch ICP token history'));
          }
        }
      };

      this.on('token-history-response', handler);
      
      this._sendCommand({
        type: 'token-history',
        ref,
        token: {
          protocol: 'ICP',
          specification: {
            indexCanisterId
          }
        },
        offset,
        limit
      });
    });
  }

  /**
   * Legacy method - Get token transaction history
   * @deprecated Use getBSVHistory() or getICPTokenHistory() instead
   * @param {string} tokenId - Token identifier
   * @param {number} limit - Number of transactions to fetch
   * @returns {Promise<Array>} Transaction history
   */
  async getTokenHistory(tokenId, limit = 50) {
    console.warn('[MetanetSDK] getTokenHistory() is deprecated. Use getBSVHistory() or getICPTokenHistory() instead.');
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('token-history-response', handler);
        reject(new Error('Request timeout'));
      }, 30000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('token-history-response', handler);
          
          if (payload.success) {
            resolve(payload.history || payload.transactions || []);
          } else {
            reject(new Error(payload.error || 'Failed to fetch history'));
          }
        }
      };

      this.on('token-history-response', handler);
      
      this._sendCommand({
        type: 'token-history',
        ref,
        tokenId,
        limit
      });
    });
  }

  /**
   * Authorize token swap
   * @param {Object} swapParams - Swap parameters
   * @param {string} swapParams.fromToken - Source token ID
   * @param {string} swapParams.toToken - Destination token ID
   * @param {number} swapParams.amount - Amount to swap
   * @param {number} swapParams.minReceive - Minimum amount to receive
   * @returns {Promise<Object>} Swap authorization result
   */
  async authorizeSwap(swapParams) {
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('authorise-swap-response', handler);
        reject(new Error('Swap authorization timeout'));
      }, 60000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('authorise-swap-response', handler);
          
          if (payload.success) {
            resolve(payload);
          } else {
            reject(new Error(payload.error || 'Swap authorization failed'));
          }
        }
      };

      this.on('authorise-swap-response', handler);
      
      this._sendCommand({
        type: 'authorise-swap',
        ref,
        ...swapParams
      });
    });
  }

  /**
   * Execute token swap purchase
   * @param {Object} buyParams - Buy parameters
   * @param {string} buyParams.token - Token to buy
   * @param {number} buyParams.amount - Amount to buy
   * @param {string} buyParams.paymentMethod - Payment method
   * @returns {Promise<Object>} Buy result
   */
  async swapBuy(buyParams) {
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('swap-buy-response', handler);
        reject(new Error('Swap buy timeout'));
      }, 60000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('swap-buy-response', handler);
          
          if (payload.success) {
            resolve(payload);
          } else {
            reject(new Error(payload.error || 'Swap buy failed'));
          }
        }
      };

      this.on('swap-buy-response', handler);
      
      this._sendCommand({
        type: 'swap-buy',
        ref,
        ...buyParams
      });
    });
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================

  /**
   * Get full transaction details (raw hex + BUMP proof)
   * @param {string} txid - Transaction ID
   * @returns {Promise<Object>} Transaction data with raw hex and BUMP proof
   */
  async getFullTransaction(txid) {
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('full-transaction-response', handler);
        reject(new Error('Transaction fetch timeout'));
      }, 30000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('full-transaction-response', handler);
          
          if (payload.success) {
            resolve({
              txid: payload.txid,
              rawHex: payload.tx_hex,
              bumpHex: payload.bump_hex
            });
          } else {
            reject(new Error(payload.error || 'Failed to fetch transaction'));
          }
        }
      };

      this.on('full-transaction-response', handler);
      
      this._sendCommand({
        type: 'full-transaction',
        ref,
        txid
      });
    });
  }

  // ==========================================
  // GEOLOCATION
  // ==========================================

  /**
   * Request user's geolocation
   * @param {Object} options - Geolocation options
   * @param {boolean} options.watch - Whether to continuously watch position
   * @param {boolean} options.highAccuracy - Request high accuracy
   * @returns {Promise<Object>} Location data
   */
  async getGeolocation(options = {}) {
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('geolocation-response', handler);
        reject(new Error('Geolocation timeout'));
      }, 30000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          if (!options.watch) {
            clearTimeout(timeout);
            this.off('geolocation-response', handler);
          }
          
          if (payload.success) {
            resolve({
              latitude: payload.latitude,
              longitude: payload.longitude,
              accuracy: payload.accuracy,
              altitude: payload.altitude,
              heading: payload.heading,
              speed: payload.speed,
              timestamp: payload.timestamp
            });
          } else {
            clearTimeout(timeout);
            this.off('geolocation-response', handler);
            reject(new Error(payload.error || 'Geolocation failed'));
          }
        }
      };

      this.on('geolocation-response', handler);
      
      this._sendCommand({
        type: 'geolocation',
        ref,
        watch: options.watch || false,
        highAccuracy: options.highAccuracy || false
      });
    });
  }

  /**
   * Stop watching geolocation
   */
  stopGeolocation() {
    this._sendCommand({
      type: 'geolocation-stop'
    });
  }

  /**
   * Listen for geolocation updates
   * @param {Function} callback - Callback function receiving location data
   * @returns {Function} Cleanup function to stop listening
   */
  onGeolocation(callback) {
    const handler = ({ payload }) => {
      if (payload) {
        callback(payload);
      }
    };
    
    this.on('geolocation-response', handler);
    
    // Return cleanup function
    return () => {
      this.off('geolocation-response', handler);
    };
  }

  // ==========================================
  // QR SCANNING
  // ==========================================

  /**
   * Start QR code scanning
   * @param {Object} options - Scanner options
   * @returns {Promise<Object>} Scanner session with ref
   */
  async scanQRCode(options = {}) {
    const ref = this._generateRef();
    
    this._sendCommand({
      type: 'qr-scan',
      ref,
      ...options
    });
    
    // Return ref for tracking responses
    return { ref };
  }
  
  /**
   * Listen for QR scan responses (sent for each scan attempt)
   * @param {Function} callback - Callback receiving scan data
   * @returns {Function} Cleanup function
   */
  onQRScanResponse(callback) {
    const handler = ({ payload }) => {
      callback(payload);
    };
    
    this.on('qr-scan-response', handler);
    
    return () => {
      this.off('qr-scan-response', handler);
    };
  }
  
  /**
   * Listen for QR scan stop (when user closes scanner)
   * @param {Function} callback - Callback receiving stop notification
   * @returns {Function} Cleanup function
   */
  onQRScanStop(callback) {
    const handler = ({ payload }) => {
      callback(payload);
    };
    
    this.on('qr-scan-stop-response', handler);
    
    return () => {
      this.off('qr-scan-stop-response', handler);
    };
  }

  /**
   * Stop QR code scanning
   */
  stopQRScan() {
    this._sendCommand({
      type: 'qr-scan-stop'
    });
  }

  // ==========================================
  // CONTENT CREATION
  // ==========================================

  /**
   * Create a post on Metanet platform
   * @param {Object} postData - Post data
   * @param {string} postData.content - Post content
   * @param {Array} postData.media - Media attachments
   * @param {Object} postData.metadata - Additional metadata
   * @returns {Promise<Object>} Created post result
   */
  async createPost(postData) {
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('create-post-response', handler);
        reject(new Error('Create post timeout'));
      }, 30000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('create-post-response', handler);
          
          if (payload.success) {
            resolve(payload);
          } else {
            reject(new Error(payload.error || 'Post creation failed'));
          }
        }
      };

      this.on('create-post-response', handler);
      
      this._sendCommand({
        type: 'create-post',
        ref,
        ...postData
      });
    });
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  /**
   * Open URL (internal or external)
   * @param {string} url - URL to open
   * @returns {Promise<boolean>} Whether link was opened successfully
   */
  async openLink(url) {
    const ref = this._generateRef();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('open-link-response', handler);
        reject(new Error('Open link timeout'));
      }, 10000);

      const handler = ({ payload }) => {
        if (payload.ref === ref) {
          clearTimeout(timeout);
          this.off('open-link-response', handler);
          
          resolve(payload.success);
        }
      };

      this.on('open-link-response', handler);
      
      this._sendCommand({
        type: 'open-link',
        ref,
        url
      });
    });
  }

  /**
   * Write text to clipboard
   * @param {string} text - Text to copy
   */
  writeClipboard(text) {
    this._sendCommand({
      type: 'write-clipboard',
      text
    });
  }

  // ==========================================
  // EVENT HANDLING
  // ==========================================

  /**
   * Listen for platform events
   * @param {string} eventType - Event type to listen for
   * @param {Function} callback - Callback function
   */
  on(eventType, callback) {
    if (!this.responseCallbacks.has(eventType)) {
      this.responseCallbacks.set(eventType, []);
    }
    this.responseCallbacks.get(eventType).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback to remove
   */
  off(eventType, callback) {
    if (this.responseCallbacks.has(eventType)) {
      const callbacks = this.responseCallbacks.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Listen for event once
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  once(eventType, callback) {
    const wrappedCallback = (...args) => {
      this.off(eventType, wrappedCallback);
      callback(...args);
    };
    this.on(eventType, wrappedCallback);
  }
}

// Export singleton instance
const metanetSDK = new MetanetSDK();

// Version check - ensure new methods are loaded
console.log('[MetanetSDK] Loaded v2.0 with getBSVHistory and getICPTokenHistory methods');

export default metanetSDK;
export { MetanetSDK };
