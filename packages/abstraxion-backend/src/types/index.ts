export * from "./errors";

export enum SessionState {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

export interface SessionKeyInfo {
  userId: string; // user id
  sessionKeyAddress: string; // address of this session key
  sessionKeyMaterial: string; // encrypted private key for the session key
  sessionKeyExpiry: Date; // timestamp of when the session key expires
  sessionPermissions: Permissions; // permission flags for the session
  sessionState: SessionState; // state of the session
  metaAccountAddress: string; // address of the meta account
  createdAt?: Date; // timestamp of when the session key was created
  updatedAt?: Date; // timestamp of when the session key was last updated
}

export interface SessionKey {
  address: string;
  privateKey: string; // unencrypted private key
  publicKey: string;
  mnemonic?: string; // optional mnemonic for key derivation
}

export interface Permissions {
  contracts?: Array<
    | string
    | { address: string; amounts: Array<{ denom: string; amount: string }> }
  >; // contract grants
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
  granted: boolean;
  granter: string;
  userId: string;
  state: string;
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
  // Get the last session key for a user
  getLastSessionKey(userId: string): Promise<SessionKeyInfo | null>;
  // Get the active session keys for a user
  getActiveSessionKeys(userId: string): Promise<SessionKeyInfo[]>;
  // Revoke a specific session key by userId and sessionKeyAddress
  revokeSessionKey(userId: string, sessionKeyAddress: string): Promise<boolean>;
  // Revoke all active session keys for a user
  revokeActiveSessionKeys(userId: string): Promise<void>;

  // Store a session key
  storeSessionKey(sessionKeyInfo: SessionKeyInfo): Promise<void>;
  // Add a new pending session key
  addNewPendingSessionKey(
    userId: string,
    updates: Pick<
      SessionKeyInfo,
      "sessionKeyAddress" | "sessionKeyMaterial" | "sessionKeyExpiry"
    >,
  ): Promise<void>;

  // Update a session key with specific parameters (userId + sessionKeyAddress are required)
  updateSessionKeyWithParams(
    userId: string,
    sessionKeyAddress: string,
    updates: Partial<
      Pick<
        SessionKeyInfo,
        "sessionState" | "sessionPermissions" | "metaAccountAddress"
      >
    >,
  ): Promise<void>;

  // Store KV pair based on userId and key
  storeKVPair(userId: string, key: string, value: string): Promise<void>;
  // Get KV pair based on userId and key
  getKVPair(userId: string, key: string): Promise<string | null>;
  // Remove KV pair based on userId and key
  removeKVPair(userId: string, key: string): Promise<void>;

  // Audit logging
  logAuditEvent(event: AuditEvent): Promise<void>;
  getAuditLogs(userId: string, limit?: number): Promise<AuditEvent[]>;
}

export interface AuditEvent {
  id: string;
  userId: string;
  action: AuditAction;
  timestamp: Date;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export enum AuditAction {
  SESSION_KEY_CREATED = "SESSION_KEY_CREATED",
  SESSION_KEY_ACCESSED = "SESSION_KEY_ACCESSED",
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
  redirectUrl: string; // URL to redirect to after connection
  treasury: string; // treasury contract address
  encryptionKey: string; // Base64 encoded AES-256 key
  databaseAdapter: DatabaseAdapter;
  sessionKeyExpiryMs?: number; // Default: 24 hours
  refreshThresholdMs?: number; // Default: 1 hour before expiry
  enableAuditLogging?: boolean; // Default: true
}
