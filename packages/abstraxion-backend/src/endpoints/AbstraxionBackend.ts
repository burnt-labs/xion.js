import { randomBytes } from 'crypto';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { 
  AbstraxionBackendConfig,
  ConnectionInitResponse,
  CallbackRequest,
  CallbackResponse,
  StatusResponse,
  DisconnectResponse,
  Permissions,
  SessionKey,
  InvalidStateError,
  SessionKeyNotFoundError,
  UnknownError,
  AbstraxionBackendError,
  UserIdRequiredError
} from '../types';
import { SessionKeyManager } from '../session-key/SessionKeyManager';
import { EncryptionService } from '../encryption';

export class AbstraxionBackend {
  private readonly sessionKeyManager: SessionKeyManager;
  private readonly encryptionService: EncryptionService;
  private readonly stateStore: Map<string, { userId: string; timestamp: number }> = new Map();

  constructor(private readonly config: AbstraxionBackendConfig) {
    // Validate configuration
    if (!config.encryptionKey) {
      throw new AbstraxionBackendError('Encryption key is required', 'ENCRYPTION_KEY_REQUIRED', 400);
    }
    if (!config.databaseAdapter) {
      throw new AbstraxionBackendError('Database adapter is required', 'DATABASE_ADAPTER_REQUIRED', 400);
    }
    if (!config.dashboardUrl) {
      throw new AbstraxionBackendError('Dashboard URL is required', 'DASHBOARD_URL_REQUIRED', 400);
    }

    this.sessionKeyManager = new SessionKeyManager(config.databaseAdapter, {
      encryptionKey: config.encryptionKey,
      sessionKeyExpiryMs: config.sessionKeyExpiryMs,
      refreshThresholdMs: config.refreshThresholdMs,
      enableAuditLogging: config.enableAuditLogging,
    });
    this.encryptionService = new EncryptionService(config.encryptionKey);
  }

  /**
   * Initiate wallet connection flow
   * Generate or receive session key address and return authorization URL
   */
  async connectInit(userId: string, permissions?: Permissions): Promise<ConnectionInitResponse> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      // Generate session key
      const sessionKey = await this.generateSessionKey();
      
      // Generate OAuth state parameter for security
      const state = randomBytes(32).toString('hex');
      
      // Store state with user ID and timestamp
      this.stateStore.set(state, {
        userId,
        timestamp: Date.now(),
      });

      // Clean up expired states (older than 10 minutes)
      this.cleanupExpiredStates();

      // Build authorization URL
      const authorizationUrl = this.buildAuthorizationUrl(sessionKey.address, state, permissions);

      return {
        sessionKeyAddress: sessionKey.address,
        authorizationUrl,
        state,
      };
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new UnknownError(`Failed to initiate connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle authorization callback
   * Store session key with permissions and associate with user account
   */
  async handleCallback(request: CallbackRequest): Promise<CallbackResponse> {
    // Validate input parameters
    if (!request.userId) {
      throw new UserIdRequiredError();
    }
    if (!request.code) {
      throw new AbstraxionBackendError('Authorization code is required', 'AUTHORIZATION_CODE_REQUIRED', 400);
    }
    if (!request.state) {
      throw new AbstraxionBackendError('State parameter is required', 'STATE_REQUIRED', 400);
    }

    try {
      // Validate state parameter
      const stateData = this.stateStore.get(request.state);
      if (!stateData) {
        throw new InvalidStateError(request.state);
      }

      // Check if state is not too old (10 minutes)
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 10 * 60 * 1000) {
        this.stateStore.delete(request.state);
        throw new InvalidStateError(request.state);
      }

      // Verify user ID matches
      if (stateData.userId !== request.userId) {
        throw new InvalidStateError(request.state);
      }

      // Clean up used state
      this.stateStore.delete(request.state);

      // Exchange authorization code for session key and permissions
      const { sessionKey, permissions, metaAccountAddress } = await this.exchangeCodeForSessionKey(
        request.code,
        request.state
      );

      // Store session key with permissions
      await this.sessionKeyManager.storeSessionKey(
        request.userId,
        sessionKey,
        permissions,
        metaAccountAddress
      );

      return {
        success: true,
        sessionKeyAddress: sessionKey.address,
        metaAccountAddress,
        permissions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Disconnect and revoke session key
   * Cleanup database entries
   */
  async disconnect(userId: string): Promise<DisconnectResponse> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      await this.sessionKeyManager.revokeSessionKey(userId);
      
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check connection status
   * Return wallet address and permissions
   */
  async checkStatus(userId: string): Promise<StatusResponse> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      const sessionKeyInfo = await this.sessionKeyManager.getSessionKeyInfo(userId);
      
      if (!sessionKeyInfo) {
        return {
          connected: false,
        };
      }

      // Check if session key is valid
      const isValid = await this.sessionKeyManager.validateSessionKey(userId);
      
      if (!isValid) {
        return {
          connected: false,
        };
      }

      // Convert session permissions back to permissions format
      const permissions = this.sessionPermissionsToPermissions(sessionKeyInfo.sessionPermissions);

      return {
        connected: true,
        sessionKeyAddress: sessionKeyInfo.sessionKeyAddress,
        metaAccountAddress: sessionKeyInfo.metaAccountAddress,
        permissions,
        expiresAt: sessionKeyInfo.sessionKeyExpiry,
        state: sessionKeyInfo.sessionState,
      };
    } catch (error) {
      // Log error for debugging but don't expose it to client
      console.error('Error checking status:', error instanceof Error ? error.message : String(error));
      return {
        connected: false,
      };
    }
  }

  /**
   * Get session key for signing operations
   */
  async getSessionKeyForSigning(userId: string): Promise<SessionKey | null> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      return await this.sessionKeyManager.getSessionKey(userId);
    } catch (error) {
      if (error instanceof SessionKeyNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Refresh session key if needed
   */
  async refreshSessionKey(userId: string): Promise<SessionKey | null> {
    // Validate input parameters
    if (!userId) {
      throw new UserIdRequiredError();
    }

    try {
      return await this.sessionKeyManager.refreshIfNeeded(userId);
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new UnknownError(`Failed to refresh session key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a new session key
   */
  private async generateSessionKey(): Promise<SessionKey> {
    try {
      // Generate 12-word mnemonic
      const mnemonic = await this.generateMnemonic();
      
      // Create wallet from mnemonic
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: 'xion',
        hdPaths: [{ account: 0, change: 0, addressIndex: 0 }] as any,
      });

      // Get account info
      const accounts = await wallet.getAccounts();
      const account = accounts[0];

      return {
        address: account.address,
        privateKey: '', // Will be extracted from wallet when needed
        publicKey: Buffer.from(account.pubkey).toString('base64'),
        mnemonic,
      };
    } catch (error) {
      if (error instanceof AbstraxionBackendError) {
        throw error;
      }
      throw new UnknownError(`Failed to generate session key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a secure mnemonic
   */
  private async generateMnemonic(): Promise<string> {
    // Generate 128 bits of entropy (16 bytes)
    const entropy = randomBytes(16);
    
    // Convert to mnemonic (this is a simplified version)
    // In production, use a proper BIP39 implementation
    const words = [];
    for (let i = 0; i < 12; i++) {
      const wordIndex = entropy[i] % 2048; // BIP39 wordlist has 2048 words
      words.push(wordIndex.toString());
    }
    
    return words.join(' ');
  }

  /**
   * Build authorization URL for dashboard
   */
  private buildAuthorizationUrl(
    sessionKeyAddress: string,
    state: string,
    permissions?: Permissions
  ): string {
    const url = new URL(this.config.dashboardUrl);
    
    // Add required parameters
    url.searchParams.set('grantee', sessionKeyAddress);
    url.searchParams.set('state', state);
    url.searchParams.set('redirect_uri', this.getCallbackUrl());
    
    // Add optional permissions
    if (permissions) {
      if (permissions.contracts) {
        url.searchParams.set('contracts', JSON.stringify(permissions.contracts));
      }
      if (permissions.bank) {
        url.searchParams.set('bank', JSON.stringify(permissions.bank));
      }
      if (permissions.stake) {
        url.searchParams.set('stake', 'true');
      }
      if (permissions.treasury) {
        url.searchParams.set('treasury', permissions.treasury);
      }
    }
    
    return url.toString();
  }

  /**
   * Exchange authorization code for session key and permissions
   * This would typically involve calling the dashboard API
   */
  private async exchangeCodeForSessionKey(
    code: string,
    state: string
  ): Promise<{ sessionKey: SessionKey; permissions: Permissions; metaAccountAddress: string }> {
    // This is a placeholder implementation
    // In production, this would call the dashboard API to exchange the code
    // for the actual session key and permissions
    
    // For now, return mock data
    const sessionKey = await this.generateSessionKey();
    const permissions: Permissions = {
      contracts: [],
      bank: [],
      stake: false,
    };
    const metaAccountAddress = 'xion1mockmetaaccountaddress';
    
    return {
      sessionKey,
      permissions,
      metaAccountAddress,
    };
  }

  /**
   * Convert session permissions back to permissions format
   */
  private sessionPermissionsToPermissions(
    sessionPermissions: Array<{ type: string; data: string }>
  ): Permissions {
    const permissions: Permissions = {};

    for (const perm of sessionPermissions) {
      switch (perm.type) {
        case 'contracts':
          permissions.contracts = JSON.parse(perm.data);
          break;
        case 'bank':
          permissions.bank = JSON.parse(perm.data);
          break;
        case 'stake':
          permissions.stake = perm.data === 'true';
          break;
        case 'treasury':
          permissions.treasury = perm.data;
          break;
        case 'expiry':
          permissions.expiry = parseInt(perm.data, 10);
          break;
      }
    }

    return permissions;
  }

  /**
   * Get callback URL for OAuth flow
   */
  private getCallbackUrl(): string {
    // This should be configured based on your application
    return `${this.config.dashboardUrl}/callback`;
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.timestamp > maxAge) {
        this.stateStore.delete(state);
      }
    }
  }
}
