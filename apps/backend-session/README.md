# Backend Session - XION Wallet Connection Management

A NextJS application that provides backend API services for managing XION wallet connections using session keys. This application implements secure session key management with automatic rotation, expiry handling, and comprehensive audit logging.

## Features

- **Wallet Connection Management**: Initiate and manage wallet connections
- **Session Key Management**: Secure generation, storage, and rotation of session keys
- **Database Integration**: Prisma-based database with SQLite for development
- **Security**: Encryption of sensitive data, rate limiting, and audit logging
- **Key Rotation**: Automatic key rotation and expiry handling
- **Frontend UI**: Simple React interface for testing and demonstration

## Prerequisites

- Node.js 20+
- pnpm 8+
- SQLite 3.30+

You need to setup the XION Treasury before you can use this application. Learn more about [how to setup the XION Treasury](https://docs.burnt.com/xion/developers/getting-started-advanced/gasless-ux-and-permission-grants/treasury-contracts).

The required permission types in the Treasury you setup for this application to work are:

- `Send Funds`

After the treasury is setup, you can get the treasury address from the developer portal.

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="file:./dev.db"

# XION Configuration
XION_RPC_URL="https://rpc.xion-testnet-2.burnt.com/"
XION_REST_URL="https://api.xion-testnet-2.burnt.com/"
XION_REDIRECT_URL="http://localhost:3000/api/callback/grant_session"
XION_TREASURY="xion1..." # Your Treasury address

# Security
ENCRYPTION_KEY="your-base64-encoded-aes-256-key-here" # Generate a secure encryption key using the script provided in the project root

# Session Configuration (Optional)
SESSION_KEY_EXPIRY_MS=864000000 # 10 days
REFRESH_THRESHOLD_MS=3600000 # 1 hour

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100 # Maximum number of requests per window
```

## Getting Started

1. **Install Dependencies**

   ```bash
   pnpm install
   ```

2. **Quick Setup (Recommended)**

   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

   This script will:
   - Create `.env` file from template
   - Generate encryption key
   - Install dependencies
   - Set up database
   - Seed with sample data

3. **Manual Setup (Alternative)**

   ```bash
   # Set up Environment Variables
   cp env.example .env
   # Edit .env with your configuration

   # Generate Encryption Key
   pnpm run generate-key

   # Set up Database
   pnpm run db:build
   pnpm run db:push
   pnpm run db:seed
   ```

4. **Start Development Server**

   ```bash
   pnpm run dev
   ```

5. **Open Application**
   Navigate to `http://localhost:3000`

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

### GET /api/health

Health check endpoint to verify service status and database connectivity.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected"
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

### API Middleware

- Centralized API middleware for common functionality
- Request validation using Zod schemas
- Standardized error handling and response formatting
- Rate limiting with configurable strictness levels
- User authentication and authorization helpers

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
│   ├── api/
│   │   ├── health/          # Health check endpoint
│   │   └── wallet/          # Wallet API endpoints
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page
├── lib/
│   ├── abstraxion-backend.ts # AbstraxionBackend integration
│   ├── api-middleware.ts    # API middleware utilities
│   ├── api-response.ts      # Standardized API responses
│   ├── api-wrapper.ts       # API wrapper functions
│   ├── database.ts          # Database adapter
│   ├── rate-limit.ts        # Rate limiting
│   ├── security.ts          # Security utilities
│   └── validation.ts        # Request validation
└── __tests__/               # Test files
```

## Dependencies

- **NextJS 14**: React framework
- **Prisma**: Database ORM
- **@/lib/xion/backend**: XION backend library
- **@burnt-labs/abstraxion-core**: XION core utilities
- **@burnt-labs/constants**: Shared constants
- **@burnt-labs/ui**: UI component library
- **Zod**: Schema validation
- **Rate Limiter Flexible**: Rate limiting
- **Jest**: Testing framework
- **tsx**: TypeScript execution for scripts

## License

MIT License - see LICENSE file for details
