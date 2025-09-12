export enum SessionState {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

export interface SessionPermission {
  type: string;
  data: string;
}

export interface SessionKeyInfo {
  userId: string; // user id
  sessionKeyAddress: string; // address of this session key
  sessionKeyMaterial: string; // encrypted private key for the session key
  sessionKeyExpiry: number; // timestamp of when the session key expires
  sessionPermissions: SessionPermission[]; // permission flags for the session
  sessionState: SessionState; // state of the session
  metaAccountAddress: string; // address of the meta account
  createdAt: number; // timestamp when the session was created
  updatedAt: number; // timestamp when the session was last updated
}

export interface SessionKey {
  address: string;
  privateKey: string; // unencrypted private key
  publicKey: string;
  mnemonic?: string; // optional mnemonic for key derivation
}

export interface Permissions {
  contracts?: string[]; // allowed contract addresses
  bank?: Array<{ denom: string; amount: string }>; // spending limits
  stake?: boolean; // staking permissions
  treasury?: string; // treasury contract address
  expiry?: number; // permission expiry timestamp
}

export interface ConnectionInitResponse {
  sessionKeyAddress: string;
  authorizationUrl: string;
  state: string; // OAuth state parameter for security
}

export interface CallbackRequest {
  code: string;
  state: string;
  userId: string;
}

export interface CallbackResponse {
  success: boolean;
  sessionKeyAddress?: string;
  metaAccountAddress?: string;
  permissions?: Permissions;
  error?: string;
}

export interface StatusResponse {
  connected: boolean;
  sessionKeyAddress?: string;
  metaAccountAddress?: string;
  permissions?: Permissions;
  expiresAt?: number;
  state?: SessionState;
}

export interface DisconnectResponse {
  success: boolean;
  error?: string;
}

// Database adapter interfaces
export interface DatabaseAdapter {
  // Session key operations
  storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void>;
  getSessionKey(userId: string): Promise<SessionKeyInfo | null>;
  updateSessionKey(userId: string, updates: Partial<SessionKeyInfo>): Promise<void>;
  deleteSessionKey(userId: string): Promise<void>;
  
  // Audit logging
  logAuditEvent(event: AuditEvent): Promise<void>;
  getAuditLogs(userId: string, limit?: number): Promise<AuditEvent[]>;
}

export interface AuditEvent {
  id: string;
  userId: string;
  action: AuditAction;
  timestamp: number;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export enum AuditAction {
  SESSION_KEY_CREATED = "SESSION_KEY_CREATED",
  SESSION_KEY_ACCESSED = "SESSION_KEY_ACCESSED",
  SESSION_KEY_REFRESHED = "SESSION_KEY_REFRESHED",
  SESSION_KEY_REVOKED = "SESSION_KEY_REVOKED",
  SESSION_KEY_EXPIRED = "SESSION_KEY_EXPIRED",
  PERMISSIONS_GRANTED = "PERMISSIONS_GRANTED",
  PERMISSIONS_REVOKED = "PERMISSIONS_REVOKED",
  CONNECTION_INITIATED = "CONNECTION_INITIATED",
  CONNECTION_COMPLETED = "CONNECTION_COMPLETED",
  CONNECTION_DISCONNECTED = "CONNECTION_DISCONNECTED",
}

// Configuration interfaces
export interface AbstraxionBackendConfig {
  rpcUrl: string;
  dashboardUrl: string;
  encryptionKey: string; // Base64 encoded AES-256 key
  databaseAdapter: DatabaseAdapter;
  sessionKeyExpiryMs?: number; // Default: 24 hours
  refreshThresholdMs?: number; // Default: 1 hour before expiry
  enableAuditLogging?: boolean; // Default: true
}

// Error types
export class AbstraxionBackendError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AbstraxionBackendError";
  }
}

export class SessionKeyNotFoundError extends AbstraxionBackendError {
  constructor(userId: string) {
    super(`Session key not found for user: ${userId}`, "SESSION_KEY_NOT_FOUND", 404);
  }
}

export class SessionKeyExpiredError extends AbstraxionBackendError {
  constructor(userId: string) {
    super(`Session key expired for user: ${userId}`, "SESSION_KEY_EXPIRED", 401);
  }
}

export class InvalidStateError extends AbstraxionBackendError {
  constructor(state: string) {
    super(`Invalid state parameter: ${state}`, "INVALID_STATE", 400);
  }
}

export class EncryptionError extends AbstraxionBackendError {
  constructor(message: string) {
    super(`Encryption error: ${message}`, "ENCRYPTION_ERROR", 500);
  }
}