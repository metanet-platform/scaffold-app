# ⚡ Quick Start Guide

Get your Metanet app running in **5 minutes**!

---

## 🚀 Setup (2 minutes)

```bash
# 1. Navigate to scaffold
cd /Users/expertmac/Desktop/Workplace/metanet_apps/metanet-scaffold

# 2. Install dependencies
npm install

# 3. Run interactive setup
npm run setup
```

The setup wizard will ask you for:
- App name
- Appwrite endpoint (pre-filled)
- Appwrite project ID (pre-filled)
- Appwrite API key (pre-filled)
- Bunny CDN credentials (optional)

**OR** manually copy `.env.example` to `.env` and fill in your values.

---

## 🗄️ Initialize Backend (1 minute)

```bash
npm run init:all
```

This automatically creates:
- ✅ Main database
- ✅ Users collection (with proper schema)
- ✅ Content collection
- ✅ Roles collection
- ✅ Storage buckets (files, images, videos)
- ✅ Proper permissions

**Safe to run multiple times** - it checks if resources exist first.

---

## 💻 Start Development (30 seconds)

```bash
npm run dev
```

Your app is now running at: **http://localhost:5500**

---

## 🎯 Test Authentication (1 minute)

### Option 1: In iframe (recommended)
Embed your app in Metanet platform to test full SDK:
```html
<iframe src="http://localhost:5500" />
```

### Option 2: Standalone
The SDK will work standalone but won't have platform features until embedded.

---

## 📝 Add Your Code

### 1. Use Metanet SDK
```javascript
import { useMetanet } from './contexts/MetanetProvider';

function MyComponent() {
  const { 
    connect,
    payBSV,
    scanQRCode,
    getGeolocation 
  } = useMetanet();
  
  // Use any SDK method!
}
```

### 2. Authenticate Users
```javascript
import { authenticateUser, registerUser } from './services/appwriteAuth';

// After connecting to Metanet
const connectionData = await connect();

// Try to authenticate
try {
  const authResult = await authenticateUser(connectionData);
  console.log('Authenticated!', authResult.user);
} catch (error) {
  // If not registered, register first
  if (error.message === 'USER_NOT_REGISTERED') {
    const registerResult = await registerUser(connectionData);
    console.log('Registered!', registerResult.user);
  }
}
```

### 3. Make Payments
```javascript
const result = await payBSV([
  {
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    value: 10000, // satoshis
    reason: 'App purchase'
  }
]);
console.log('Payment TX:', result.txid);
```

### 4. Scan QR Codes
```javascript
const qrData = await scanQRCode();
console.log('Scanned:', qrData);
```

---

## 🚢 Deploy to Production (2 minutes)

```bash
# 1. Build
npm run build

# 2. Deploy to DFinity IC mainnet
dfx deploy --network ic
```

Your app is now live on the Internet Computer! 🎉

---

**Time to first working app: ~5 minutes** ⚡

**Happy coding!** 🎉
