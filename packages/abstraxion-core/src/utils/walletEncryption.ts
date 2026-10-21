/**
 * Wallet encryption helpers for SignArbSecp256k1HdWallet serialization.
 *
 * CosmJS 0.39 no longer exposes `@cosmjs/proto-signing/build/wallet` (its
 * package `exports` only allow the root entry), so the helpers the wallet
 * serialization needs live here. The algorithm, salt and byte layout are the
 * ones CosmJS uses, so wallets serialized by earlier versions still decrypt.
 */
import {
  Random,
  xchacha20NonceLength,
  Xchacha20poly1305Ietf,
} from "@cosmjs/crypto";
import { toAscii } from "@cosmjs/encoding";

/**
 * The fixed salt CosmJS uses for password to key derivation.
 * Must be 16 bytes.
 */
export const cosmjsSalt = toAscii("The CosmJS salt.");

export const supportedAlgorithms = {
  xchacha20poly1305Ietf: "xchacha20poly1305-ietf",
};

export interface EncryptionConfiguration {
  /**
   * An algorithm identifier, such as "xchacha20poly1305-ietf".
   */
  readonly algorithm: string;
  /**
   * A map of algorithm-specific parameters.
   */
  readonly params?: Record<string, unknown>;
}

export async function encrypt(
  plaintext: Uint8Array,
  encryptionKey: Uint8Array,
  config: EncryptionConfiguration,
): Promise<Uint8Array> {
  switch (config.algorithm) {
    case supportedAlgorithms.xchacha20poly1305Ietf: {
      const nonce = Random.getBytes(xchacha20NonceLength);
      // Prepend the fixed-length nonce to the ciphertext.
      return new Uint8Array([
        ...nonce,
        ...(await Xchacha20poly1305Ietf.encrypt(
          plaintext,
          encryptionKey,
          nonce,
        )),
      ]);
    }
    default:
      throw new Error(
        `Unsupported encryption algorithm: '${config.algorithm}'`,
      );
  }
}

export async function decrypt(
  ciphertext: Uint8Array,
  encryptionKey: Uint8Array,
  config: EncryptionConfiguration,
): Promise<Uint8Array> {
  switch (config.algorithm) {
    case supportedAlgorithms.xchacha20poly1305Ietf: {
      const nonce = ciphertext.slice(0, xchacha20NonceLength);
      return Xchacha20poly1305Ietf.decrypt(
        ciphertext.slice(xchacha20NonceLength),
        encryptionKey,
        nonce,
      );
    }
    default:
      throw new Error(
        `Unsupported encryption algorithm: '${config.algorithm}'`,
      );
  }
}
