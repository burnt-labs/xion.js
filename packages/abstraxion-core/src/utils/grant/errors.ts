/**
 * Custom error types for grant-related operations
 */

export class TreasuryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TreasuryError";
  }
}

export class IndexerError extends TreasuryError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly indexerUrl?: string,
  ) {
    super(message);
    this.name = "IndexerError";
  }
}

export class IndexerNetworkError extends IndexerError {
  constructor(message: string, indexerUrl?: string) {
    super(message, undefined, indexerUrl);
    this.name = "IndexerNetworkError";
  }
}

export class IndexerResponseError extends IndexerError {
  constructor(message: string, statusCode: number, indexerUrl?: string) {
    super(message, statusCode, indexerUrl);
    this.name = "IndexerResponseError";
  }
}

export class TreasuryConfigError extends TreasuryError {
  constructor(message: string) {
    super(message);
    this.name = "TreasuryConfigError";
  }
}

export class TreasuryValidationError extends TreasuryError {
  constructor(
    message: string,
    public readonly invalidData?: unknown,
  ) {
    super(message);
    this.name = "TreasuryValidationError";
  }
}
