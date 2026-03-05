/**
 * Encode a string to base64, safely handling non-ASCII characters.
 *
 * btoa() only accepts Latin-1 characters and throws InvalidCharacterError
 * on anything outside that range:
 *
 *   btoa(JSON.stringify({ memo: "tip 🎉" }))
 *   // => DOMException: Failed to execute 'btoa': The string to be encoded
 *   //    contains characters outside of the Latin1 range.
 *
 * This function encodes the string as UTF-8 bytes first, so any Unicode
 * content (emoji in memos, non-Latin addresses, etc.) is handled safely.
 */
export function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
