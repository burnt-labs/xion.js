# @burnt-labs/abstraxion-backend

Backend implementation of Abstraxion for XION blockchain, providing secure session key management and wallet connection functionality that integrates seamlessly with the frontend SDK.

## Features

- 🔐 **Secure Session Key Management**: AES-256 encryption for session key storage
- 🔄 **Key Rotation**: Automatic session key refresh before expiry
- 📊 **Audit Logging**: Comprehensive logging for security and compliance
- 🗄️ **Database Adapters**: Support for multiple database backends
- 🛡️ **Security First**: Never logs private keys, implements secure key handling
- 🔌 **Modular Architecture**: Easy to extend with additional modules

## Installation

```bash
npm install @burnt-labs/abstraxion-backend
```

## Quick Start

```typescript
import {
  AbstraxionBackend,
  DatabaseAdapter,
} from "@burnt-labs/abstraxion-backend";

// Create your own database adapter
class MyDatabaseAdapter implements DatabaseAdapter {
  // Implement all required methods
  async storeSessionKey(sessionKeyInfo) {
    /* your implementation */
  }
  async getLastSessionKey(userId) {
    /* your implementation */
  }
  // ... other methods
}

const databaseAdapter = new MyDatabaseAdapter();

// Create backend instance
const backend = new AbstraxionBackend({
  rpcUrl: "https://rpc.xion-testnet-2.burnt.com",
  dashboardUrl: "https://dashboard.xion.burnt.com",
  redirectUrl: "https://myapp.com/callback", // Where frontend SDK redirects after auth
  treasury: "xion1treasury123...", // Treasury contract address
  encryptionKey: "your-base64-encoded-32-byte-key",
  databaseAdapter,
});

// Initiate connection
const connection = await backend.connectInit("user123", {
  contracts: ["xion1contract1..."],
  bank: [{ denom: "uxion", amount: "1000000" }],
  stake: true,
});

console.log("Authorization URL:", connection.authorizationUrl);
```

## Architecture

### Core Modules

- **SessionKeyManager**: Manages session key lifecycle, encryption, and validation
- **AbstraxionBackend**: Main API endpoints for wallet connection flow
- **EncryptionService**: Handles AES-256-GCM encryption/decryption
- **DatabaseAdapters**: Pluggable database backends

### Security Features

- **AES-256-GCM Encryption**: Session keys encrypted at rest
- **Key Derivation**: Uses scrypt for key derivation from master key
- **Audit Logging**: All operations logged for security monitoring
- **State Validation**: OAuth state parameter validation
- **Input Sanitization**: Protection against injection attacks

## API Reference

### AbstraxionBackend

#### `connectInit(userId: string, permissions?: Permissions): Promise<ConnectionInitResponse>`

Initiate wallet connection flow.

```typescript
const response = await backend.connectInit("user123", {
  contracts: ["xion1contract1..."],
  bank: [{ denom: "uxion", amount: "1000000" }],
  stake: true,
  treasury: "xion1treasury...",
});
```

#### `handleCallback(request: CallbackRequest): Promise<CallbackResponse>`

Handle authorization callback from dashboard.

```typescript
const response = await backend.handleCallback({
  code: "auth_code_from_dashboard",
  state: "state_parameter",
  userId: "user123",
});
```

#### `checkStatus(userId: string): Promise<StatusResponse>`

Check connection status and get wallet information.

```typescript
const status = await backend.checkStatus("user123");
if (status.connected) {
  console.log("Wallet Address:", status.sessionKeyAddress);
  console.log("Meta Account:", status.metaAccountAddress);
}
```

#### `disconnect(userId: string): Promise<DisconnectResponse>`

Disconnect and revoke session key.

```typescript
const result = await backend.disconnect("user123");
```

### SessionKeyManager

#### `storeSessionKey(userId: string, sessionKey: SessionKey, permissions: Permissions, metaAccountAddress: string): Promise<void>`

Store encrypted session key with permissions.

#### `getSessionKey(userId: string): Promise<SessionKey | null>`

Retrieve and decrypt active session key.

#### `validateSessionKey(userId: string): Promise<boolean>`

Check if session key is valid and not expired.

#### `revokeSessionKey(userId: string): Promise<void>`

Revoke and delete session key.

#### `refreshIfNeeded(userId: string): Promise<SessionKey | null>`

Refresh session key if near expiry.

## Database Adapters

Each project needs to implement their own database adapter by extending `BaseDatabaseAdapter`:

```typescript
import {
  BaseDatabaseAdapter,
  SessionKeyInfo,
  AuditEvent,
} from "@burnt-labs/abstraxion-backend";

class MyDatabaseAdapter extends BaseDatabaseAdapter {
  async storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void> {
    // Your implementation here
  }

  async getSessionKey(userId: string): Promise<SessionKeyInfo | null> {
    // Your implementation here
  }

  async updateSessionKey(
    userId: string,
    updates: Partial<SessionKeyInfo>,
  ): Promise<void> {
    // Your implementation here
  }

  async revokeSessionKey(userId: string): Promise<void> {
    // Your implementation here
  }

  async logAuditEvent(event: AuditEvent): Promise<void> {
    // Your implementation here
  }

  async getAuditLogs(userId: string, limit?: number): Promise<AuditEvent[]> {
    // Your implementation here
  }

  async healthCheck(): Promise<boolean> {
    // Your implementation here
  }

  async close(): Promise<void> {
    // Your implementation here
  }
}
```

### Example Implementations

#### MongoDB Example

```typescript
import { MongoClient } from "mongodb";

class MongoDatabaseAdapter extends BaseDatabaseAdapter {
  private sessionKeyCollection: any;
  private auditLogCollection: any;

  constructor(mongoClient: MongoClient, databaseName: string) {
    super();
    this.sessionKeyCollection = mongoClient
      .db(databaseName)
      .collection("sessionKeys");
    this.auditLogCollection = mongoClient
      .db(databaseName)
      .collection("auditLogs");
  }

  async storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void> {
    await this.sessionKeyCollection.replaceOne(
      { userId: sessionKeyInfo.userId },
      sessionKeyInfo,
      { upsert: true },
    );
  }

  // ... implement other methods
}
```

#### PostgreSQL Example

```typescript
import { Pool } from "pg";

class PostgresDatabaseAdapter extends BaseDatabaseAdapter {
  constructor(private pool: Pool) {
    super();
  }

  async storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void> {
    const query = `
      INSERT INTO session_keys (user_id, session_key_address, ...)
      VALUES ($1, $2, ...)
      ON CONFLICT (user_id) DO UPDATE SET ...
    `;
    // ... implement query
  }

  // ... implement other methods
}
```

## Configuration

```typescript
interface AbstraxionBackendConfig {
  rpcUrl: string; // XION RPC endpoint
  dashboardUrl: string; // Dashboard URL for authorization
  encryptionKey: string; // Base64-encoded 32-byte AES key
  databaseAdapter: DatabaseAdapter; // Database adapter instance
  sessionKeyExpiryMs?: number; // Session key expiry (default: 24h)
  refreshThresholdMs?: number; // Refresh threshold (default: 1h)
  enableAuditLogging?: boolean; // Enable audit logging (default: true)
}
```

## Security Considerations

### Encryption Key Management

Generate a secure encryption key:

```typescript
import { EncryptionService } from "@burnt-labs/abstraxion-backend";

const encryptionKey = EncryptionService.generateEncryptionKey();
console.log("Store this key securely:", encryptionKey);
```

### Environment Variables

```bash
# Required
ABSTRAXION_RPC_URL=https://rpc.xion-testnet-1.burnt.com
ABSTRAXION_ENCRYPTION_KEY=your-base64-encoded-key

# Optional
ABSTRAXION_SESSION_EXPIRY_MS=86400000
ABSTRAXION_REFRESH_THRESHOLD_MS=3600000
ABSTRAXION_ENABLE_AUDIT_LOGGING=true
```

### Database Schema

#### Session Keys Table

```sql
CREATE TABLE session_keys (
  user_id VARCHAR(255) PRIMARY KEY,
  session_key_address VARCHAR(255) NOT NULL,
  session_key_material TEXT NOT NULL,
  session_key_expiry BIGINT NOT NULL,
  session_permissions JSONB NOT NULL,
  session_state VARCHAR(20) NOT NULL,
  meta_account_address VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

#### Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  timestamp BIGINT NOT NULL,
  details JSONB NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  INDEX idx_user_timestamp (user_id, timestamp),
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp)
);
```

## Error Handling

```typescript
import {
  AbstraxionBackendError,
  SessionKeyNotFoundError,
  SessionKeyInvalidError,
  InvalidStateError,
  EncryptionError,
} from "@burnt-labs/abstraxion-backend";

try {
  await backend.connectInit("user123");
} catch (error) {
  if (error instanceof SessionKeyNotFoundError) {
    // Handle session key not found
  } else if (error instanceof SessionKeyInvalidError) {
    // Handle expired session key
  } else if (error instanceof InvalidStateError) {
    // Handle invalid OAuth state
  } else if (error instanceof EncryptionError) {
    // Handle encryption error
  } else {
    // Handle other errors
  }
}
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## License

MIT
