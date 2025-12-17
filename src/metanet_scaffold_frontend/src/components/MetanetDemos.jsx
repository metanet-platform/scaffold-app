/**
 * Metanet SDK Feature Demos
 * Interactive examples of all SDK features with dummy data
 */

import React, { useState } from 'react';
import { useMetanet } from '../contexts/MetanetProvider';
import { copyToClipboard, useQRScanner, useGeolocationUpdates } from '../utils/metanetHelpers';

export function ClipboardDemo() {
  const [text, setText] = useState('Sample text to copy');
  const [status, setStatus] = useState('');

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    setStatus(success ? '✓ Copied to clipboard!' : '✗ Failed to copy');
    setTimeout(() => setStatus(''), 2000);
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">📋 Copy to Clipboard</h4>
      <p className="text-xs text-gray-500">Write to clipboard without window.clipboard API</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Text to copy..."
          className="flex-1 px-3 py-2 border rounded text-sm"
        />
        <button
          onClick={handleCopy}
          disabled={!text}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
        >
          Copy
        </button>
      </div>
      {status && (
        <p className={`text-xs ${status.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
          {status}
        </p>
      )}
    </div>
  );
}

export function LinkOpenDemo() {
  const metanet = useMetanet();
  const [url, setUrl] = useState('https://wikipedia.com');
  const [result, setResult] = useState('');

  const handleOpen = async () => {
    try {
      setResult('⏳ Requesting user approval...');
      const res = await metanet.openLink(url);
      setResult(res.approved ? '✓ User approved, link opened' : '✗ User declined');
    } catch (error) {
      setResult(`✗ Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">🔗 Open External Link</h4>
      <p className="text-xs text-gray-500">Links require user approval in platform</p>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-3 py-2 border rounded text-sm"
        />
        <button
          onClick={handleOpen}
          disabled={!metanet.isConnected || !url}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
        >
          Open
        </button>
      </div>
      {result && (
        <p className={`text-xs ${result.includes('✓') ? 'text-green-600' : 'text-gray-600'}`}>
          {result}
        </p>
      )}
    </div>
  );
}

export function PaymentDemo() {
  const metanet = useMetanet();
  const [amount, setAmount] = useState('1000');
  const [result, setResult] = useState('');

  // Use connected user's BSV address as recipient (send to self)
  const recipientAddress = metanet.connectionData?.bsvAddress || '';

  const handlePay = async () => {
    if (!recipientAddress) {
      setResult('✗ No BSV address available. Connect first.');
      return;
    }
    
    try {
      setResult('⏳ Processing BSV payment...');
      const res = await metanet.payBSV([{ address: recipientAddress, value: parseInt(amount) }]);
      setResult(res.success ? `✓ Payment sent! TX: ${res.txid?.slice(0, 20)}...` : '✗ Payment failed');
    } catch (error) {
      setResult(`✗ Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">💰 BSV Payment</h4>
      <p className="text-xs text-gray-500">Send satoshis to your own BSV address</p>
      <div className="p-2 bg-gray-50 border rounded text-xs font-mono break-all">
        <strong>To:</strong> {recipientAddress || 'Connect to see address'}
      </div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in satoshis"
        className="w-full px-3 py-2 border rounded text-sm"
      />
      <button
        onClick={handlePay}
        disabled={!metanet.isConnected || !recipientAddress || !amount}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
      >
        💰 Send Payment
      </button>
      {result && (
        <p className={`text-xs ${result.includes('✓') ? 'text-green-600' : 'text-gray-600'}`}>
          {result}
        </p>
      )}
    </div>
  );
}

export function ICPPaymentDemo() {
  const metanet = useMetanet();
  const [ledger, setLedger] = useState('ryjl3-tyaaa-aaaaa-aaaba-cai');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('100000');
  const [result, setResult] = useState('');

  const handlePay = async () => {
    try {
      setResult('⏳ Processing ICP payment...');
      const res = await metanet.payICP(ledger, recipient, parseInt(amount), 'Test payment');
      setResult(res.success ? `✓ ICP payment sent! Block: ${res.blockHeight}` : '✗ Payment failed');
    } catch (error) {
      setResult(`✗ Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">🔷 ICP Payment</h4>
      <p className="text-xs text-gray-500">Send tokens to ICP principal</p>
      <input
        type="text"
        value={ledger}
        onChange={(e) => setLedger(e.target.value)}
        placeholder="Ledger canister ID"
        className="w-full px-3 py-2 border rounded text-sm font-mono text-xs"
      />
      <input
        type="text"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient principal"
        className="w-full px-3 py-2 border rounded text-sm font-mono text-xs"
      />
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (e8s)"
        className="w-full px-3 py-2 border rounded text-sm"
      />
      <button
        onClick={handlePay}
        disabled={!metanet.isConnected || !recipient || !amount}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
      >
        🔷 Send ICP
      </button>
      {result && (
        <p className={`text-xs ${result.includes('✓') ? 'text-green-600' : 'text-gray-600'}`}>
          {result}
        </p>
      )}
    </div>
  );
}

export function QRScanDemo() {
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  const scanner = useQRScanner(
    (data) => {
      // Success callback - scanner auto-stops
      setScanning(false);
      setError('');
      
      // Display the scanned data
      if (typeof data === 'object') {
        setResult(JSON.stringify(data, null, 2));
      } else {
        setResult(String(data));
      }
    },
    (err) => {
      // Error callback (user cancelled or error)
      setError(err.message);
      setScanning(false);
    }
  );

  const handleStart = async () => {
    setScanning(true);
    setResult('');
    setError('');
    try {
      await scanner.start();
    } catch (err) {
      setError(err.message);
      setScanning(false);
    }
  };

  const handleStop = () => {
    scanner.stop();
    setScanning(false);
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">📱 QR Code Scanner</h4>
      <p className="text-xs text-gray-500">Scan QR codes - auto-stops on success</p>
      <button
        onClick={scanning ? handleStop : handleStart}
        className={`w-full px-4 py-2 rounded text-sm font-medium ${
          scanning 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {scanning ? '⏹ Stop Scanning' : '📱 Start QR Scan'}
      </button>
      {result && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-xs break-all">
          <strong>✓ Scanned:</strong>
          <pre className="mt-1 whitespace-pre-wrap">{result}</pre>
        </div>
      )}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export function GeolocationDemo() {
  const metanet = useMetanet();
  const [location, setLocation] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const listenerRef = React.useRef(null);

  const handleStart = async () => {
    setTracking(true);
    setError('');
    setIsFinal(false);
    setUpdateCount(0);
    setLocation(null);
    
    try {
      // Setup listener for geolocation updates
      listenerRef.current = metanet.onGeolocation((locData) => {
        setLocation(locData.location);
        setIsFinal(locData.isFinal);
        setUpdateCount(prev => prev + 1);
        
        if (locData.isFinal) {
          setTracking(false);
        }
      });
      
      // Send geolocation request - don't catch errors here since listener handles responses
      metanet.getGeolocation();
      
    } catch (err) {
      setError(err.message);
      setTracking(false);
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    }
  };

  const handleStop = () => {
    setTracking(false);
    if (listenerRef.current) {
      listenerRef.current();
      listenerRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      if (listenerRef.current) {
        listenerRef.current();
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">📍 Geolocation</h4>
      <p className="text-xs text-gray-500">Progressive accuracy tracking (target: ≤100m)</p>
      
      <button
        onClick={tracking ? handleStop : handleStart}
        disabled={!metanet.isConnected}
        className={`w-full px-4 py-2 rounded text-sm font-medium ${
          tracking 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300'
        }`}
      >
        {tracking ? '⏹ Stop Tracking' : '📍 Start Tracking'}
      </button>
      
      {location && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
          <div className="font-semibold text-blue-900">
            {isFinal ? '✓ Final Location (Accurate)' : '⏳ Improving Accuracy...'}
          </div>
          <div><strong>Lat:</strong> {location.latitude?.toFixed(6)}</div>
          <div><strong>Lon:</strong> {location.longitude?.toFixed(6)}</div>
          <div>
            <strong>Accuracy:</strong>{' '}
            <span className={location.accuracy <= 100 ? 'text-green-600 font-semibold' : 'text-orange-600'}>
              {location.accuracy?.toFixed(0)}m
            </span>
            {location.accuracy <= 100 && ' 🎯'}
          </div>
          <div className="text-gray-600 pt-1 border-t border-blue-200">
            Updates received: {updateCount} | Status: {isFinal ? 'Complete' : 'In Progress'}
          </div>
        </div>
      )}
      
      {tracking && !location && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⏳ Requesting location permission and acquiring GPS signal...
        </div>
      )}
      
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export function CreatePostDemo() {
  const metanet = useMetanet();
  const [content, setContent] = useState('Hello from Metanet! 🚀');
  const [result, setResult] = useState('');

  const handlePost = async () => {
    try {
      setResult('⏳ Creating post...');
      const res = await metanet.createPost({ params: {
          nftDescription: content
        } 
      });
      setResult(res.success ? `✓ Post created! ID: ${res.postId}` : '✗ Post failed');
      if (res.success) {
        setContent('');
      }
    } catch (error) {
      setResult(`✗ Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">📝 Create Social Post</h4>
      <p className="text-xs text-gray-500">Post to Metanet social feed</p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows="3"
        className="w-full px-3 py-2 border rounded text-sm"
      />
      <button
        onClick={handlePost}
        disabled={!metanet.isConnected || !content}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
      >
        📝 Create Post
      </button>
      {result && (
        <p className={`text-xs ${result.includes('✓') ? 'text-green-600' : 'text-gray-600'}`}>
          {result}
        </p>
      )}
    </div>
  );
}

export function TokenHistoryDemo() {
  const metanet = useMetanet();
  const [activeTab, setActiveTab] = useState('bsv'); // 'bsv' or 'ckusdc'
  const [bsvHistory, setBsvHistory] = useState(null);
  const [ckusdcHistory, setCkusdcHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(10);

  const handleFetchBSV = async () => {
    try {
      setLoading(true);
      const res = await metanet.getBSVHistory({ offset: 0, limit });
      setBsvHistory(res);
    } catch (error) {
      setBsvHistory({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchCkUSDC = async () => {
    try {
      setLoading(true);
      // ckUSDC index canister ID on mainnet
      const ckUSDCIndexCanisterId = 'qhbym-qaaaa-aaaaa-aaafq-cai';
      const res = await metanet.getICPTokenHistory(ckUSDCIndexCanisterId, { offset: 0, limit });
      setCkusdcHistory(res);
    } catch (error) {
      setCkusdcHistory({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts) => {
    return new Date(ts * 1000).toLocaleString();
  };

  const formatAmount = (amount, decimals = 8) => {
    return (amount / Math.pow(10, decimals)).toFixed(decimals);
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">🔄 Token History</h4>
      <p className="text-xs text-gray-500">Transaction history for BSV & ckUSDC</p>
      
      {/* Tab selector */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('bsv')}
          className={`px-3 py-1 text-xs font-medium ${
            activeTab === 'bsv' 
              ? 'border-b-2 border-blue-600 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          BSV
        </button>
        <button
          onClick={() => setActiveTab('ckusdc')}
          className={`px-3 py-1 text-xs font-medium ${
            activeTab === 'ckusdc' 
              ? 'border-b-2 border-blue-600 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ckUSDC
        </button>
      </div>

      {/* Limit selector */}
      <div className="flex gap-2 items-center">
        <label className="text-xs text-gray-600">Limit:</label>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          className="px-2 py-1 border rounded text-xs"
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
      </div>
      
      {/* Fetch button */}
      <button
        onClick={activeTab === 'bsv' ? handleFetchBSV : handleFetchCkUSDC}
        disabled={!metanet.isConnected || loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? '⏳ Loading...' : `🔄 Get ${activeTab.toUpperCase()} History`}
      </button>
      
      {/* Results display */}
      {activeTab === 'bsv' && bsvHistory && (
        <div className="space-y-2">
          {bsvHistory.success ? (
            <>
              <div className="text-xs text-gray-600">
                <strong>Protocol:</strong> BSV | <strong>Total:</strong> {bsvHistory.transactions?.length || 0}
              </div>
              <div className="max-h-64 overflow-auto border rounded">
                {bsvHistory.transactions && bsvHistory.transactions.length > 0 ? (
                  bsvHistory.transactions.map((tx, i) => (
                    <div key={i} className="p-2 border-b last:border-b-0 text-xs hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-medium ${tx.type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'received' ? '↓' : '↑'} {formatAmount(tx.amount, 8)} BSV
                        </span>
                        <span className="text-gray-500 text-[10px]">{formatTimestamp(tx.ts)}</span>
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono truncate">
                        ID: {tx.id}
                      </div>
                      {tx.note && (
                        <div className="text-[10px] text-gray-500 mt-1">
                          Note: {tx.note}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-gray-500">
                    No transactions found
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              Error: {bsvHistory.error}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'ckusdc' && ckusdcHistory && (
        <div className="space-y-2">
          {ckusdcHistory.success ? (
            <>
              <div className="text-xs text-gray-600">
                <strong>Protocol:</strong> ICP (ckUSDC) | <strong>Total:</strong> {ckusdcHistory.transactions?.length || 0}
              </div>
              <div className="max-h-64 overflow-auto border rounded">
                {ckusdcHistory.transactions && ckusdcHistory.transactions.length > 0 ? (
                  ckusdcHistory.transactions.map((tx, i) => (
                    <div key={i} className="p-2 border-b last:border-b-0 text-xs hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-medium ${tx.type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'received' ? '↓' : '↑'} ${formatAmount(tx.amount, 6)} USDC
                        </span>
                        <span className="text-gray-500 text-[10px]">{formatTimestamp(tx.ts)}</span>
                      </div>
                      <div className="text-[10px] text-gray-600">
                        Index: {tx.id}
                      </div>
                      {tx.from && (
                        <div className="text-[10px] text-gray-500 font-mono truncate mt-1">
                          From: {tx.from.slice(0, 20)}...
                        </div>
                      )}
                      {tx.to && (
                        <div className="text-[10px] text-gray-500 font-mono truncate">
                          To: {tx.to.slice(0, 20)}...
                        </div>
                      )}
                      {tx.note && (
                        <div className="text-[10px] text-gray-500 mt-1">
                          Memo: {tx.note}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-gray-500">
                    No transactions found
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              Error: {ckusdcHistory.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SwapDemo() {
  const metanet = useMetanet();
  const [fromToken, setFromToken] = useState('BSV');
  const [toToken, setToToken] = useState('ICP');
  const [amount, setAmount] = useState('1000');
  const [result, setResult] = useState('');

  const handleSwap = async () => {
    try {
      setResult('⏳ Authorizing swap...');
      const authRes = await metanet.authorizeSwap({
        fromToken,
        toToken,
        amount: parseInt(amount)
      });
      
      if (authRes.authorized) {
        setResult('⏳ Executing swap...');
        const swapRes = await metanet.swapBuy({
          swapId: authRes.swapId,
          amount: parseInt(amount)
        });
        setResult(swapRes.success ? `✓ Swap completed! TX: ${swapRes.txid}` : '✗ Swap failed');
      } else {
        setResult('✗ Swap not authorized');
      }
    } catch (error) {
      setResult(`✗ Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">💱 Token Swap</h4>
      <p className="text-xs text-gray-500">Exchange tokens</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={fromToken}
          onChange={(e) => setFromToken(e.target.value)}
          placeholder="From token"
          className="px-3 py-2 border rounded text-sm"
        />
        <input
          type="text"
          value={toToken}
          onChange={(e) => setToToken(e.target.value)}
          placeholder="To token"
          className="px-3 py-2 border rounded text-sm"
        />
      </div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="w-full px-3 py-2 border rounded text-sm"
      />
      <button
        onClick={handleSwap}
        disabled={!metanet.isConnected || !amount}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
      >
        � Swap Tokens
      </button>
      {result && (
        <p className={`text-xs ${result.includes('✓') ? 'text-green-600' : 'text-gray-600'}`}>
          {result}
        </p>
      )}
    </div>
  );
}
