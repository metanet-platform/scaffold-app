# 🚀 Metanet Scaffold

**Production-ready scaffold for building Metanet platform apps with Appwrite backend, Bunny CDN, and DFinity deployment.**

This scaffold provides everything you need to build a fully functional app that integrates with the Metanet platform, including:

- ✅ Complete Metanet SDK with ALL platform methods
- ✅ Appwrite backend integration with role-based authentication
- ✅ Bunny CDN for file and video storage
- ✅ DFinity IC deployment ready
- ✅ i18n internationalization
- ✅ React Router with protected routes
- ✅ TypeScript support
- ✅ Tailwind CSS styling
- ✅ Production-ready architecture

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Metanet SDK Usage](#metanet-sdk-usage)
- [Appwrite Setup](#appwrite-setup)
- [Bunny CDN Integration](#bunny-cdn-integration)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [Contributing](#contributing)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Or use the interactive setup:

```bash
npm run setup
```

### 3. Initialize Appwrite Backend

Set up your Appwrite database, collections, and storage buckets:

```bash
npm run init:all
```

This will:
- Create main database
- Create users, content, and roles collections
- Create file, image, and video storage buckets
- Set up proper permissions

### 4. Start Development

```bash
npm run dev
```

Your app will be running at `http://localhost:5500`

### 5. Deploy to DFinity

```bash
npm run build
dfx deploy --network ic
```

---

## 📁 Project Structure

```
metanet-scaffold/
├── src/
│   └── metanet_scaffold_frontend/
│       ├── src/
│       │   ├── sdk/
│       │   │   └── metanetSDK.js          # Complete Metanet Platform SDK
│       │   ├── contexts/
│       │   │   ├── MetanetProvider.jsx    # Metanet SDK React Context
│       │   │   └── AuthProvider.jsx       # Authentication Context
│       │   ├── services/
│       │   │   ├── appwriteAuth.js        # Authentication service
│       │   │   └── bunnycdn.js            # Bunny CDN integration
│       │   ├── utils/
│       │   │   └── metanetHelpers.js      # SDK helper utilities
│       │   ├── components/
│       │   │   ├── AdminDemo.jsx          # Admin role demo
│       │   │   ├── FileUpload.jsx         # File upload component
│       │   │   └── MetanetDemos.jsx       # SDK feature demos
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   └── index.css
│       ├── index.html
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       └── postcss.config.js
├── appwrite-functions/                    # Serverless functions
│   ├── auth-metanet-user/
│   ├── auth-or-register/
│   ├── generate-bunny-upload-url/
│   ├── grant-user-role/
│   └── register-metanet-user/
├── scripts/
│   ├── init-project.js                    # Interactive setup
│   ├── setup-appwrite.js                  # Appwrite initialization
│   ├── setup-functions.js                 # Functions deployment
│   └── test-functions.js                  # Function testing
├── .env.example
├── dfx.json
├── deploy-functions.sh
├── package.json
├── LICENSE
├── QUICKSTART.md
├── BUNNY_CDN_USAGE.md
└── README.md
```

---

## 🎯 Metanet SDK Usage

The scaffold includes a **complete, production-ready** Metanet SDK with ALL platform methods.

### Basic Usage

```jsx
import { useMetanet } from './contexts/MetanetProvider';

function MyComponent() {
  const { 
    isConnected, 
    connectionData,
    connect,
    payBSV,
    getGeolocation 
  } = useMetanet();

  // Connect to platform
  const handleConnect = async () => {
    try {
      const data = await connect({ navbg: '#1a1a1a' });
      console.log('Connected:', data);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Connect to Metanet</button>
      ) : (
        <div>
          <p>Connected as: {connectionData.bsvAddress}</p>
          <p>Principal: {connectionData.rootPrincipal}</p>
        </div>
      )}
    </div>
  );
}
```

### Available SDK Methods

#### Connection & Authentication
- `connect(options)` - Connect to Metanet platform
- `disconnect()` - Disconnect from platform
- `isUserConnected()` - Check connection status
- `getConnectionData()` - Get stored connection info

#### Payments
- `payBSV(recipients)` - Make BSV payments
- `payICP(ledgerId, recipient, amount, memo)` - Make ICP token payments

#### Token Operations
- `getTokenHistory(tokenId, limit)` - Get transaction history
- `authorizeSwap(swapParams)` - Authorize token swaps
- `swapBuy(buyParams)` - Execute swap purchases

#### Transactions
- `getFullTransaction(txid)` - Get raw transaction + BUMP proof

#### Geolocation
- `getGeolocation(options)` - Get user location
- `stopGeolocation()` - Stop location tracking

#### QR Code
- `scanQRCode(options)` - Scan QR codes
- `stopQRScan()` - Stop QR scanning

#### Content
- `createPost(postData)` - Create posts on Metanet

#### Utilities
- `openLink(url)` - Open URLs
- `writeClipboard(text)` - Copy to clipboard

#### Event Handling
- `on(eventType, callback)` - Listen for events
- `off(eventType, callback)` - Remove listener
- `once(eventType, callback)` - Listen once

### Example: Making a Payment

```jsx
const handlePayment = async () => {
  try {
    const result = await payBSV([
      {
        address: '1A1zP..EXA..MPLE..ivfNa',
        value: 10000, // satoshis
        reason: 'App purchase',
        note: 'Premium subscription'
      }
    ]);
    
    console.log('Payment successful!', result.txid);
  } catch (error) {
    console.error('Payment failed:', error);
  }
};
```

---

## 🔐 Appwrite Setup

### Database Schema

#### Users Collection
- `bsvAddress` (string, required, indexed) - **Primary identifier** - BSV address from parent platform
- `appPublicKey` (string, required, indexed) - **Signing key** - Derived from genericUseSeed for this app
- `metanetPrincipal` (string, optional, indexed) - **Secondary identifier** - ICP root principal (linkable, non-signing)
- `bsvPublicKey` (string, optional) - Platform BSV public key (linkable, non-signing)
- `username` (string) - Username
- `displayName` (string) - Display name
- `avatar` (string) - Avatar URL
- `bio` (string) - Biography
- `role` (string, required, indexed, default: 'user') - User role
- `isActive` (boolean, required, default: true) - Account status
- `lastLogin` (datetime) - Last login timestamp
- `metadata` (string) - JSON metadata

**Identity Architecture:**
- **bsvAddress**: Primary identifier (public, non-signing) - from parent Metanet platform
- **appPublicKey**: Signing identity (public key derived from `genericUseSeed`) - frontend signs with this
- **metanetPrincipal**: Optional ICP identity link (public, non-signing)
- **Private keys**: NEVER sent to backend - frontend signs, backend verifies

#### Content Collection
- `title` (string, required) - Content title
- `description` (string) - Content description
- `contentType` (string, required, indexed) - Type of content
- `creatorPrincipal` (string, required, indexed) - Creator's principal
- `creatorAddress` (string, required) - Creator's BSV address
- `fileId` (string) - Appwrite file ID
- `fileUrl` (string) - CDN URL
- `thumbnailUrl` (string) - Thumbnail URL
- `fileSize` (integer) - File size in bytes
- `mimeType` (string) - MIME type
- `status` (string, required, indexed, default: 'draft') - Content status
- `tags` (string) - JSON array of tags
- `views` (integer, default: 0) - View count
- `likes` (integer, default: 0) - Like count
- `metadata` (string) - JSON metadata

#### Roles Collection
- `userPrincipal` (string, required, indexed) - User's principal
- `roleName` (string, required, indexed) - Role name
- `permissions` (string) - JSON array of permissions
- `grantedBy` (string) - Who granted the role
- `grantedAt` (datetime, required) - When role was granted
- `expiresAt` (datetime) - Optional expiration

### Role-Based Access Control

The scaffold implements a three-tier role system:

1. **user** (default) - Basic access
   - Permissions: `read:own`, `write:own`, `delete:own`

2. **moderator** - Content moderation
   - Permissions: `read:all`, `write:all`, `delete:own`, `moderate:content`

3. **admin** - Full access
   - Permissions: `read:all`, `write:all`, `delete:all`, `manage:users`, `manage:roles`

### Authentication Flow

**Cryptographic Authentication (No Passwords!)**

1. **User connects via Metanet SDK**
   - Receives: `bsvAddress`, `rootPrincipal`, `genericUseSeed` (32-byte hex)
   
2. **Frontend derives app-specific signing key**
   ```javascript
   // From genericUseSeed, create signing keypair
   const appPrivateKey = deriveKeyFromSeed(genericUseSeed);
   const appPublicKey = derivePublicKey(appPrivateKey);
   ```

3. **Frontend signs authentication payload**
   ```javascript
   const payload = {
     bsvAddress,
     appPublicKey,
     timestamp: Date.now()
   };
   const signature = sign(payload, appPrivateKey);
   ```

4. **Backend verifies signature**
   - Checks user exists with that `bsvAddress` and `appPublicKey`
   - Validates signature matches
   - Issues session token

**See [AUTHENTICATION_EXAMPLE.jsx](./AUTHENTICATION_EXAMPLE.jsx) for complete code.**

---

## 🎬 Bunny CDN Integration

The scaffold includes **complete, secure Bunny CDN integration** for file and video storage.

### Features

- ✅ **Secure**: Storage credentials stay on backend
- ✅ **Direct Upload**: Files upload directly to CDN (not through your server)
- ✅ **Organized**: Automatic unique file paths per user
- ✅ **Video Streaming**: Optional Bunny Stream support
- ✅ **Image/Video/File**: Support all file types with size limits

### Quick Example

```jsx
import { uploadImage } from './services/bunnycdn';

async function handleUpload(file) {
  const result = await uploadImage(file);
  console.log('Image URL:', result.file.url);
  // https://your-cdn.b-cdn.net/user123/images/1735012345_abc_photo.jpg
}
```

### Using the Component

```jsx
import FileUpload from './components/FileUpload';

<FileUpload 
  type="image" 
  onUploadComplete={(result) => {
    console.log('Uploaded:', result.file.url);
  }}
/>
```

**See [BUNNY_CDN_USAGE.md](./BUNNY_CDN_USAGE.md) for complete documentation.**

---

## 🔐 Environment Variables
   - Appwrite function `auth-metanet-user` verifies signature with `appPublicKey`
   - No private keys ever sent to backend
   - Replay attack protection via timestamp

5. **Registration (first time)**
   - Same process, but calls `register-metanet-user`
   - Creates user record with `bsvAddress` as primary key
   - Stores `appPublicKey` for future verification

**Security Benefits:**
- ✅ No passwords to leak
- ✅ No OAuth complexity
- ✅ Private keys never leave frontend
- ✅ App-specific keys (can't be used elsewhere)
- ✅ Cryptographic proof of identity

---

## 🌍 Environment Variables

See `.env.example` for all available configuration options:

### Required Variables

```env
# Metanet SDK
VITE_METANET_AUTO_CONNECT=true  # Auto-connect on load (true) or manual button (false)

# Appwrite
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_API_KEY=your-api-key

# Database IDs (created by setup script)
DATABASE_ID=main_database
USERS_COLLECTION_ID=users
CONTENT_COLLECTION_ID=content
ROLES_COLLECTION_ID=roles
```

### Metanet Connection Behavior

The scaffold automatically connects to the Metanet platform with retry logic:

- **Auto-connect enabled** (`VITE_METANET_AUTO_CONNECT=true`): Attempts connection 3 times with 1-second intervals on page load
- **Manual connect** (`VITE_METANET_AUTO_CONNECT=false`): Shows a "Connect to Metanet" button for user-initiated connection
- Works when app is opened in iframe/webview within Metanet platform
- Gracefully falls back to manual connection if auto-connect fails

### Optional Variables

```env
# Bunny CDN (optional)
VITE_BUNNY_STORAGE_ZONE=your-zone
VITE_BUNNY_HOSTNAME=your-zone.b-cdn.net

# Backend only (never expose in frontend!)
BUNNY_STORAGE_PASSWORD=your-password
BUNNY_STORAGE_REGION=de

# App Configuration
VITE_APP_NAME=My Metanet App
VITE_DEFAULT_LANGUAGE=en
VITE_ROLES=user,moderator,admin
VITE_DEFAULT_ROLE=user
```

---

## 🚀 Deployment

### Local Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Deploy to DFinity IC

```bash
# Deploy to local network
dfx deploy --network local

# Deploy to IC mainnet
dfx deploy --network ic
```

### Deploy Appwrite Functions

1. Install Appwrite CLI:
```bash
npm install -g appwrite-cli
```

2. Login to Appwrite:
```bash
appwrite login
```

3. Deploy functions:
```bash
cd appwrite-functions/auth-metanet-user
appwrite deploy function
```

Repeat for all functions in `appwrite-functions/` directory.

---

## 🏗️ Architecture

### Frontend Architecture

- **React 18** - UI library
- **React Router v6** - Client-side routing
- **Zustand** - State management
- **i18next** - Internationalization
- **Tailwind CSS** - Styling
- **Vite** - Build tool

### Backend Architecture

- **Appwrite** - Backend as a Service
  - Database (NoSQL)
  - Storage (Files, Images, Videos)
  - Functions (Serverless)
  - Authentication
- **Bunny CDN** - Content delivery
- **DFinity IC** - Frontend hosting

### Security

- **Metanet SDK authentication** - Secure key-based auth
- **Role-based access control** - Granular permissions
- **API key protection** - Server-side only
- **CORS protection** - Proper origin validation

---

## 📚 Learn More

### Metanet Platform
- Platform documentation (coming soon)
- SDK examples in `metanet_apps/` directory

### Appwrite
- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Functions](https://appwrite.io/docs/functions)

### DFinity
- [Internet Computer Documentation](https://internetcomputer.org/docs)
- [dfx CLI Reference](https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-remove)

---

## 🤝 Contributing

This scaffold is designed to be customized for your specific app needs. Feel free to:

- Add more Appwrite collections
- Create custom functions
- Extend the SDK with app-specific methods
- Add more UI components
- Implement additional features

---

## 📄 License

Free to use for building web apps connected at Metanet.page. You may copy, modify and distribute this scaffold for that purpose.

---

## 🆘 Support

For issues or questions:
1. Check the example apps in `metanet_apps/`
2. Review Appwrite and Metanet platform documentation
3. Open an issue in the repository

---

**Built with ❤️ for the Metanet ecosystem**
