# Backend Session - XION Wallet Connection Management

A NextJS application that provides backend API services for managing XION wallet connections using session keys. This application implements secure session key management with automatic rotation, expiry handling, and comprehensive audit logging.

## Features

- **Wallet Connection Management**: Initiate, handle callbacks, and manage wallet connections
- **Session Key Management**: Secure generation, storage, and rotation of session keys
- **Database Integration**: Prisma-based database with SQLite for development
- **Security**: Encryption of sensitive data, rate limiting, and audit logging
- **Key Rotation**: Automatic key rotation and expiry handling
- **Frontend UI**: Simple React interface for testing and demonstration

## API Endpoints

### POST /api/wallet/connect

Initiate wallet connection flow and generate session key.

**Request Body:**

```json
{
  "username": "string",
  "permissions": {
    "contracts": ["string"],
    "bank": [{"denom": "string", "amount": "string"}],
    "stake": boolean,
    "treasury": "string",
    "expiry": number
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionKeyAddress": "string",
    "authorizationUrl": "string",
    "state": "string"
  }
}
```

### POST /api/wallet/callback

Handle authorization callback and store session key.

**Request Body:**

```json
{
  "code": "string",
  "state": "string",
  "username": "string"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionKeyAddress": "string",
    "metaAccountAddress": "string",
    "permissions": {}
  }
}
```

### DELETE /api/wallet/disconnect

Revoke session key and clear database entries.

**Request Body:**

```json
{
  "username": "string"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

### GET /api/wallet/status

Check connection status and return wallet information.

**Query Parameters:**

- `username`: string (required)

**Response:**

```json
{
  "success": true,
  "data": {
    "connected": boolean,
    "sessionKeyAddress": "string",
    "metaAccountAddress": "string",
    "permissions": {},
    "expiresAt": number,
    "state": "string"
  }
}
```

## Database Schema

### User

- `id`: Primary key
- `username`: Unique username
- `email`: Optional email address
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### SessionKey

- `id`: Primary key
- `userId`: Foreign key to User
- `sessionKeyAddress`: XION address of the session key
- `sessionKeyMaterial`: Encrypted private key
- `sessionKeyExpiry`: Expiration timestamp
- `sessionPermissions`: JSON string of permissions
- `sessionState`: Current state (PENDING, ACTIVE, EXPIRED, REVOKED)
- `metaAccountAddress`: XION meta account address
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### AuditLog

- `id`: Primary key
- `userId`: Foreign key to User
- `action`: Audit action type
- `timestamp`: Event timestamp
- `details`: JSON string of event details
- `ipAddress`: Optional IP address
- `userAgent`: Optional user agent

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="file:./dev.db"

# XION Configuration
XION_RPC_URL="https://rpc.xion-testnet.burnt.com"
XION_DASHBOARD_URL="https://dashboard.xion-testnet.burnt.com"

# Security
ENCRYPTION_KEY="your-base64-encoded-aes-256-key-here"
JWT_SECRET="your-jwt-secret-here"

# Session Configuration
SESSION_KEY_EXPIRY_MS=86400000
REFRESH_THRESHOLD_MS=3600000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3002"
```

## Getting Started

1. **Install Dependencies**

   ```bash
   pnpm install
   ```

2. **Set up Environment Variables**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Generate Encryption Key**

   ```bash
   pnpm run generate-key
   ```

4. **Set up Database**

   ```bash
   pnpm run db:build
   pnpm run db:push
   pnpm run db:seed
   ```

5. **Start Development Server**

   ```bash
   pnpm run dev
   ```

6. **Open Application**
   Navigate to `http://localhost:3002`

## Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run db:build` - Generate Prisma client
- `pnpm run db:push` - Push schema to database
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:format` - Format Prisma schema
- `pnpm run db:seed` - Seed database with sample data
- `pnpm run test` - Run tests
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:coverage` - Run tests with coverage

## Security Features

### Encryption

- All sensitive data (private keys) is encrypted using AES-256-CBC
- Encryption keys are generated securely and stored in environment variables
- Each encryption operation uses a unique IV for security

### Rate Limiting

- API endpoints are protected with rate limiting
- Configurable window and request limits
- Prevents abuse and DoS attacks

### Key Rotation

- Automatic key rotation before expiry
- Configurable refresh threshold
- Background monitoring service

### Audit Logging

- Comprehensive audit trail for all operations
- IP address and user agent tracking
- Detailed event logging with timestamps

## Testing

The project includes comprehensive tests for:

- API endpoints
- Security functions
- Database operations
- Key rotation logic

Run tests with:

```bash
pnpm run test
```

## Architecture

```text
src/
├── app/
│   ├── api/wallet/          # API endpoints
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page
├── lib/
│   ├── abstraxion-backend.ts # AbstraxionBackend integration
│   ├── database.ts          # Database adapter
│   ├── key-rotation.ts      # Key rotation manager
│   ├── rate-limit.ts        # Rate limiting
│   ├── security.ts          # Security utilities
│   └── validation.ts        # Request validation
└── __tests__/               # Test files
```

## Dependencies

- **NextJS 14**: React framework
- **Prisma**: Database ORM
- **@burnt-labs/abstraxion-backend**: XION backend library
- **Zod**: Schema validation
- **Rate Limiter Flexible**: Rate limiting
- **Jest**: Testing framework

## License

MIT License - see LICENSE file for details
