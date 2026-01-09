import { DirectSignResponse } from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { sha256 } from "@cosmjs/crypto";
import { AAccountData, AASigner, AAAlgo } from "../interfaces";

/**
 * JWT-based signer for XION smart accounts.
 *
 * This signer authenticates transactions using JWT tokens from a session-based
 * authentication service (e.g., Stytch, Auth0, custom JWT service).
 *
 * @example
 * ```typescript
 * const signer = new AbstractAccountJWTSigner(
 *   "xion1abc...",           // Account address
 *   0,                       // Authenticator index
 *   sessionToken,            // JWT session token
 *   "https://auth.example.com/v1"  // Auth service URL
 * );
 * ```
 */
export class AbstractAccountJWTSigner extends AASigner {
  /**
   * Session token used for authentication.
   * Must be obtained from the JWT authentication service before signing.
   */
  sessionToken: string | undefined;

  /**
   * Index of the authenticator on the smart account.
   */
  accountAuthenticatorIndex: number;

  /**
   * URL of the JWT authentication service.
   * The service must implement a `/sessions/authenticate` endpoint
   * that accepts session_token and session_custom_claims.
   */
  apiUrl: string;

  /**
   * Creates a new JWT signer instance.
   *
   * @param abstractAccount - XION smart account address (xion1...)
   * @param accountAuthenticatorIndex - Index of the JWT authenticator on the account
   * @param sessionToken - Optional session token (can be set later)
   * @param apiUrl - JWT authentication service URL (required)
   *
   * @throws Error if apiUrl is not provided
   */
  constructor(
    abstractAccount: string,
    accountAuthenticatorIndex: number,
    sessionToken?: string,
    apiUrl?: string,
  ) {
    super(abstractAccount);
    this.sessionToken = sessionToken;
    this.accountAuthenticatorIndex = accountAuthenticatorIndex;

    if (!apiUrl) {
      throw new Error(
        "JWT signer requires an apiUrl parameter (e.g., your JWT authentication service endpoint)",
      );
    }

    this.apiUrl = apiUrl;
  }

  async getAccounts(): Promise<readonly AAccountData[]> {
    // Return account data if abstract account exists
    // Actual authentication is handled by the JWT service
    if (this.abstractAccount === undefined) {
      return [];
    }

    return [
      {
        address: this.abstractAccount,
        algo: "secp256k1", // Placeholder - not used for JWT auth
        pubkey: new Uint8Array(),
        authenticatorId: this.accountAuthenticatorIndex,
        accountAddress: this.abstractAccount,
        aaalgo: AAAlgo.JWT,
      },
    ];
  }

  /**
   * Sign a transaction using JWT authentication.
   *
   * This method:
   * 1. Encodes and hashes the SignDoc
   * 2. Sends the hash to the JWT service with the session token
   * 3. Receives a signed JWT back
   * 4. Returns the JWT as the transaction signature
   *
   * @param signerAddress - Signer identifier (e.g., email address)
   * @param signDoc - Transaction SignDoc to sign
   * @returns Signed transaction with JWT signature
   * @throws Error if session token is undefined or authentication fails
   */
  async signDirect(
    signerAddress: string,
    signDoc: SignDoc,
  ): Promise<DirectSignResponse> {
    if (this.sessionToken === undefined) {
      throw new Error("Session token is undefined. Please authenticate first.");
    }

    const signBytes = SignDoc.encode(signDoc).finish();
    const hashSignBytes = sha256(signBytes);
    const message = Buffer.from(hashSignBytes).toString("base64");

    const authResponse = await fetch(`${this.apiUrl}/sessions/authenticate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        session_token: this.sessionToken,
        session_duration_minutes: 60 * 24 * 30, // 30 days
        session_custom_claims: {
          transaction_hash: message,
        },
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text().catch(() => "Unknown error");
      throw new Error(
        `JWT authentication failed (${authResponse.status}): ${errorText}`,
      );
    }

    const authResponseData = await authResponse.json();

    // Extract session JWT from response
    const sessionJwt = authResponseData.session_jwt;

    if (!sessionJwt) {
      console.error("[JWT Signer] Response:", authResponseData);
      throw new Error(
        "No session_jwt in response from authentication service",
      );
    }

    return {
      signed: signDoc,
      signature: {
        pub_key: {
          type: "",
          value: new Uint8Array(),
        },
        signature: Buffer.from(sessionJwt, "utf-8").toString("base64"),
      },
    };
  }

  /**
   * Sign an arbitrary message using JWT authentication.
   *
   * This method is useful for off-chain message signing where a full
   * transaction SignDoc is not needed.
   *
   * @param message - Arbitrary message to sign (will be hashed)
   * @param customToken - Optional custom session token (overrides instance token)
   * @returns Signed message with JWT signature
   * @throws Error if session token is undefined or authentication fails
   */
  async signDirectArb(
    message: string,
    customToken?: string,
  ): Promise<{ signature: string }> {
    if (this.sessionToken === undefined && !customToken) {
      throw new Error("Session token is undefined. Please authenticate first.");
    }

    const hashSignBytes = new Uint8Array(Buffer.from(message, "utf-8"));
    const hashedMessage = Buffer.from(hashSignBytes).toString("base64");

    const authResponse = await fetch(`${this.apiUrl}/sessions/authenticate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        session_token: customToken || this.sessionToken,
        session_duration_minutes: 60 * 24 * 30, // 30 days
        session_custom_claims: {
          transaction_hash: hashedMessage,
        },
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text().catch(() => "Unknown error");
      throw new Error(
        `JWT authentication failed (${authResponse.status}): ${errorText}`,
      );
    }

    const authResponseData = await authResponse.json();

    // Extract session JWT from response
    const sessionJwt = authResponseData.session_jwt;

    if (!sessionJwt) {
      console.error("[JWT Signer] Response:", authResponseData);
      throw new Error(
        "No session_jwt in response from authentication service",
      );
    }

    return {
      signature: Buffer.from(sessionJwt).toString("base64"),
    };
  }
}
