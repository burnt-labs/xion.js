export class UnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownError";
  }
}

export class AbstraxionBackendError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AbstraxionBackendError";
  }
}

export class UserIdRequiredError extends AbstraxionBackendError {
  constructor() {
    super("User ID is required", "USER_ID_REQUIRED", 400);
  }
}

export class SessionKeyNotFoundError extends AbstraxionBackendError {
  constructor(userId: string) {
    super(
      `Session key not found for user: ${userId}`,
      "SESSION_KEY_NOT_FOUND",
      404,
    );
  }
}

export class SessionKeyInvalidError extends AbstraxionBackendError {
  constructor(userId: string) {
    super(
      `Session key invalid for user: ${userId}`,
      "SESSION_KEY_INVALID",
      401,
    );
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

export class ConfigurationError extends AbstraxionBackendError {
  constructor(message: string, code: string) {
    super(`Configuration error: ${message}`, code, 400);
  }
}

export class EncryptionKeyRequiredError extends ConfigurationError {
  constructor() {
    super("Encryption key is required", "ENCRYPTION_KEY_REQUIRED");
  }
}

export class DatabaseAdapterRequiredError extends ConfigurationError {
  constructor() {
    super("Database adapter is required", "DATABASE_ADAPTER_REQUIRED");
  }
}

export class RedirectUrlRequiredError extends ConfigurationError {
  constructor() {
    super("Redirect URL is required", "REDIRECT_URL_REQUIRED");
  }
}

export class RpcUrlRequiredError extends ConfigurationError {
  constructor() {
    super("RPC URL is required", "RPC_URL_REQUIRED");
  }
}

export class TreasuryRequiredError extends ConfigurationError {
  constructor() {
    super("Treasury is required", "TREASURY_REQUIRED");
  }
}

export class StateRequiredError extends AbstraxionBackendError {
  constructor() {
    super("State parameter is required", "STATE_REQUIRED", 400);
  }
}

export class SessionKeyGenerationError extends AbstraxionBackendError {
  constructor(message: string) {
    super(
      `Failed to generate session key: ${message}`,
      "SESSION_KEY_GENERATION_ERROR",
      500,
    );
  }
}

export class MnemonicGenerationError extends AbstraxionBackendError {
  constructor(message: string) {
    super(
      `Failed to generate mnemonic: ${message}`,
      "MNEMONIC_GENERATION_ERROR",
      500,
    );
  }
}

export class SessionKeyStorageError extends AbstraxionBackendError {
  constructor(message: string) {
    super(
      `Failed to store session key: ${message}`,
      "SESSION_KEY_STORAGE_ERROR",
      500,
    );
  }
}

export class SessionKeyRetrievalError extends AbstraxionBackendError {
  constructor(message: string) {
    super(
      `Failed to get session key: ${message}`,
      "SESSION_KEY_RETRIEVAL_ERROR",
      500,
    );
  }
}

export class SessionKeyRevocationError extends AbstraxionBackendError {
  constructor(message: string) {
    super(
      `Failed to revoke session key: ${message}`,
      "SESSION_KEY_REVOCATION_ERROR",
      500,
    );
  }
}

export class SessionKeyRefreshError extends AbstraxionBackendError {
  constructor(message: string) {
    super(
      `Failed to refresh session key: ${message}`,
      "SESSION_KEY_REFRESH_ERROR",
      500,
    );
  }
}

export class SessionKeyExpirationError extends AbstraxionBackendError {
  constructor(message: string) {
    super(
      `Failed to mark session key as expired: ${message}`,
      "SESSION_KEY_EXPIRATION_ERROR",
      500,
    );
  }
}

export class GrantedFailedError extends AbstraxionBackendError {
  constructor() {
    super("Authorization was not granted by user", "GRANTED_FAILED", 400);
  }
}

export class GranterRequiredError extends AbstraxionBackendError {
  constructor() {
    super("Granter address is required", "GRANTER_REQUIRED", 400);
  }
}

export class InvalidStorageKeyError extends AbstraxionBackendError {
  constructor(key: string) {
    super(`Invalid storage key: ${key}`, "INVALID_STORAGE_KEY", 400);
  }
}

export class InvalidMethodError extends AbstraxionBackendError {
  constructor(method: string) {
    super(`Invalid method: ${method}`, "INVALID_METHOD", 400);
  }
}
