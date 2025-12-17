/**
 * Metanet Helper Utilities
 * 
 * Utilities to automatically handle common patterns when using Metanet SDK
 */

import metanetSDK from '../sdk/metanetSDK';

/**
 * Intercept all link clicks and use openLink SDK method
 * This ensures links are opened via platform with user approval
 * 
 * Usage: Call once in your app initialization
 * 
 * @example
 * useEffect(() => {
 *   interceptLinks();
 * }, []);
 */
export function interceptLinks() {
  const handleClick = (e) => {
    // Check if the click target is a link
    const link = e.target.closest('a');
    
    if (link && link.href) {
      const href = link.getAttribute('href');
      
      // Skip internal navigation (hash links, relative paths without protocol)
      if (href.startsWith('#') || href.startsWith('/') && !href.startsWith('//')) {
        return; // Let React Router handle it
      }
      
      // Skip if link has download attribute
      if (link.hasAttribute('download')) {
        return;
      }
      
      // Check if target="_blank" or external link
      const isExternalOrNewWindow = link.target === '_blank' || 
                                    link.href.startsWith('http://') || 
                                    link.href.startsWith('https://') ||
                                    link.href.startsWith('//');
      
      if (isExternalOrNewWindow && metanetSDK.isConnected) {
        e.preventDefault();
        e.stopPropagation();
        
        metanetSDK.openLink(link.href)
          .then(result => {
            console.log('Link opened via platform:', result);
          })
          .catch(err => {
            console.error('Failed to open link:', err);
            // Fallback: try to open normally if platform fails
            window.open(link.href, link.target || '_blank');
          });
      }
    }
  };
  
  // Add click listener to document
  document.addEventListener('click', handleClick, true);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('click', handleClick, true);
  };
}

/**
 * Copy text to clipboard using Metanet SDK
 * Automatically falls back to native clipboard API if not connected
 * 
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 * 
 * @example
 * await copyToClipboard('Hello World');
 */
export async function copyToClipboard(text) {
  if (!text) {
    console.warn('copyToClipboard: No text provided');
    return false;
  }
  
  try {
    if (metanetSDK.isConnected) {
      // Use Metanet platform clipboard (works even without window.clipboard)
      metanetSDK.writeClipboard(text);
      console.log('Copied to clipboard via Metanet SDK');
      return true;
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      // Fallback to native Clipboard API
      await navigator.clipboard.writeText(text);
      console.log('Copied to clipboard via native API');
      return true;
    } else {
      // Legacy fallback using textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      console.log('Copied to clipboard via execCommand');
      return success;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Hook to listen for continuous geolocation updates
 * 
 * @param {Function} onUpdate - Callback for location updates
 * @param {Function} onError - Error callback
 * @returns {Object} { start, stop } - Control functions
 * 
 * @example
 * const { start, stop } = useGeolocationUpdates(
 *   (location) => console.log('Location:', location),
 *   (error) => console.error('Location error:', error)
 * );
 * 
 * await start({ enableHighAccuracy: true, continuous: true });
 */
export function useGeolocationUpdates(onUpdate, onError) {
  let isTracking = false;
  
  const handleUpdate = ({ payload }) => {
    if (payload.latitude && payload.longitude) {
      onUpdate(payload);
    }
  };
  
  const start = async (options = {}) => {
    if (isTracking) {
      console.warn('Geolocation tracking already active');
      return;
    }
    
    // Listen for updates
    metanetSDK.on('geolocation-update', handleUpdate);
    
    try {
      const initialLocation = await metanetSDK.getGeolocation({
        ...options,
        continuous: true
      });
      isTracking = true;
      onUpdate(initialLocation);
    } catch (err) {
      metanetSDK.off('geolocation-update', handleUpdate);
      if (onError) onError(err);
      throw err;
    }
  };
  
  const stop = () => {
    if (isTracking) {
      metanetSDK.stopGeolocation();
      metanetSDK.off('geolocation-update', handleUpdate);
      isTracking = false;
    }
  };
  
  return { start, stop };
}

/**
 * Hook to listen for QR scan results
 * 
 * @param {Function} onResult - Callback for successful scan results (auto-stops scanner)
 * @param {Function} onError - Error callback
 * @returns {Object} { start, stop } - Control functions
 * 
 * @example
 * const { start, stop } = useQRScanner(
 *   (data) => console.log('Scanned:', data),
 *   (error) => console.error('Scan error:', error)
 * );
 * 
 * await start();
 */
export function useQRScanner(onResult, onError) {
  let isScanning = false;
  let currentRef = null;
  let cleanupResponse = null;
  let cleanupStop = null;
  
  const handleResponse = (payload) => {
    if (!isScanning || (currentRef && payload.ref !== currentRef)) return;
    
    if (payload.success && payload.scanData) {
      // Success - extract data and auto-stop
      const data = payload.scanData.parsed || payload.scanData.rawValue;
      
      // Stop scanner
      stop();
      
      // Call success callback
      if (onResult) {
        onResult(data);
      }
    } else if (!payload.success && payload.scanData === null) {
      // Failed scan attempt (no data) - keep scanning
      console.log('QR scan attempt failed, continuing...');
    }
  };
  
  const handleStopResponse = (payload) => {
    if (!isScanning || (currentRef && payload.ref !== currentRef)) return;
    
    // User closed scanner manually
    isScanning = false;
    currentRef = null;
    
    if (cleanupResponse) {
      cleanupResponse();
      cleanupResponse = null;
    }
    if (cleanupStop) {
      cleanupStop();
      cleanupStop = null;
    }
    
    if (onError) {
      onError(new Error(payload.message || 'Scan cancelled by user'));
    }
  };
  
  const start = async (options = {}) => {
    if (isScanning) {
      console.warn('QR scanner already active');
      return;
    }
    
    try {
      // Start scanner and get ref
      const { ref } = await metanetSDK.scanQRCode(options);
      currentRef = ref;
      isScanning = true;
      
      // Listen for scan responses
      cleanupResponse = metanetSDK.onQRScanResponse(handleResponse);
      
      // Listen for user closing scanner
      cleanupStop = metanetSDK.onQRScanStop(handleStopResponse);
      
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  };
  
  const stop = () => {
    if (isScanning) {
      metanetSDK.stopQRScan();
      isScanning = false;
      currentRef = null;
      
      if (cleanupResponse) {
        cleanupResponse();
        cleanupResponse = null;
      }
      if (cleanupStop) {
        cleanupStop();
        cleanupStop = null;
      }
    }
  };
  
  return { start, stop };
}

export default {
  interceptLinks,
  copyToClipboard,
  useGeolocationUpdates,
  useQRScanner
};
