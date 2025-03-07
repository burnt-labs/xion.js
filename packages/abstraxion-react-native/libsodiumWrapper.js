import sodium from "react-native-libsodium";

/**
 * Fixed version of `crypto_aead_xchacha20poly1305_ietf_encrypt` that logs input types for debugging.
 *
 * @param message - The message as a `Uint8Array`.
 * @param additionalData - The additional data as a `Uint8Array`.
 * @param secretNonce - The secret nonce (also known as the key nonce) as a `Uint8Array` of length 24.
 * @param publicNonce - The public nonce as a `Uint8Array` of length 24.
 * @param key - The key as a `Uint8Array` of length 32.
 * @returns The encrypted ciphertext as a `Uint8Array`.
 */
const crypto_aead_xchacha20poly1305_ietf_encrypt_fixed = (
  message,
  additionalData,
  secretNonce,
  publicNonce,
  key,
) => {
  return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    message,
    additionalData ? new TextDecoder().decode(additionalData) : "",
    secretNonce,
    publicNonce,
    key,
  );
};

/**
 * Fixed version of `crypto_aead_xchacha20poly1305_ietf_decrypt` that logs input types for debugging.
 *
 * @param secretNonce - The secret nonce (also known as the key nonce) as a `Uint8Array` of length 24.
 * @param ciphertext - The ciphertext as a `Uint8Array`.
 * @param additionalData - The additional data as a `Uint8Array`.
 * @param publicNonce - The public nonce as a `Uint8Array` of length 24.
 * @param key - The key as a `Uint8Array` of length 32.
 * @returns The decrypted message as a `Uint8Array`.
 */
const crypto_aead_xchacha20poly1305_ietf_decrypt_fixed = (
  secretNonce,
  ciphertext,
  additionalData,
  publicNonce,
  key,
) => {
  // 🔍 Debug: Log input types
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    secretNonce,
    ciphertext ?? new Uint8Array(),
    additionalData ? new TextDecoder().decode(additionalData) : "",
    publicNonce,
    key,
  );
};

/**
 * Wrapper around `crypto_pwhash` that sets the algorithm to default if it is
 * not a number.
 *
 * @param {number} outputLength
 * @param {string|Uint8Array} password
 * @param {Uint8Array} salt
 * @param {number} opsLimit
 * @param {number} memLimit
 * @param {number} [algorithm=sodium.crypto_pwhash_ALG_DEFAULT]
 * @returns {Uint8Array}
 */
const crypto_pwhash_fixed = (
  outputLength,
  password,
  salt,
  opsLimit,
  memLimit,
  algorithm,
) => {
  if (typeof algorithm !== "number") {
    algorithm = sodium.crypto_pwhash_ALG_DEFAULT; // Use the default if invalid
  }
  return sodium.crypto_pwhash(
    outputLength,
    password,
    salt,
    opsLimit,
    memLimit,
    algorithm,
  );
};

// Create a wrapper that mimics `libsodium-wrappers-sumo`
const sodiumWrapper = {
  ...sodium,
  crypto_pwhash: crypto_pwhash_fixed, // Override `crypto_pwhash`
  crypto_aead_xchacha20poly1305_ietf_encrypt:
    crypto_aead_xchacha20poly1305_ietf_encrypt_fixed,
  crypto_aead_xchacha20poly1305_ietf_decrypt:
    crypto_aead_xchacha20poly1305_ietf_decrypt_fixed,
  ready: Promise.resolve(), // `libsodium-wrappers-sumo` expects `ready`
  onready: () => {}, // Some libraries check for `onready`
};

export default sodiumWrapper;
