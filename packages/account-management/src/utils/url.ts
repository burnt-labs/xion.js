/**
 * URL validation and security utilities
 * Prevents XSS attacks and validates URL safety for treasury parameters and redirect URLs
 *
 * Moved from dashboard utilities - production-tested implementation
 */

import { sanitizeUrl } from "@braintree/sanitize-url";

/**
 * Extract domain and protocol from a URL
 * @param url - The URL to parse
 * @returns Protocol and hostname (e.g., "https://example.com")
 *
 * @example
 * ```typescript
 * getDomainAndProtocol("https://example.com/path?query=1")
 * // Returns: "https://example.com"
 * ```
 */
export function getDomainAndProtocol(url: string | undefined): string {
  try {
    const u = new URL(url || "");
    return u.protocol + "//" + u.hostname;
  } catch {
    return "";
  }
}

/**
 * Validates if a URL is safe by checking for potentially malicious patterns
 * Performs comprehensive security checks including:
 * - Protocol validation (blocks javascript:, data:, vbscript:, file:)
 * - XSS pattern detection
 * - URL spoofing prevention
 * - Sanitization verification
 *
 * @param url - The URL to validate
 * @returns true if the URL is safe, false otherwise
 *
 * @example
 * ```typescript
 * isUrlSafe("https://example.com") // true
 * isUrlSafe("javascript:alert(1)") // false
 * isUrlSafe("https://example.com@evil.com") // false (spoofing attempt)
 * ```
 */
export function isUrlSafe(url: string | undefined): boolean {
  if (!url) return false;

  try {
    // Sanitize the URL using @braintree/sanitize-url
    const sanitizedUrl = sanitizeUrl(url);

    // Check if sanitizer replaced URL with about:blank (indicates dangerous URL)
    if (sanitizedUrl === "about:blank") {
      return false;
    }

    // Normalize the original URL to handle trailing slashes
    const normalizedUrl = new URL(url).href;
    const normalizedSanitized = new URL(sanitizedUrl).href;

    // Check if the normalized URLs are different
    // This indicates that potentially malicious content was removed
    if (normalizedSanitized !== normalizedUrl) {
      return false;
    }

    const urlObj = new URL(url);

    // Block known dangerous protocols, but allow custom app protocols
    const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
    if (
      dangerousProtocols.some((protocol) =>
        urlObj.protocol.toLowerCase().startsWith(protocol),
      )
    ) {
      return false;
    }

    // Check for URL spoofing using @ character
    // This detects URLs like https://example.com@evil.com where the real domain is evil.com
    if (
      urlObj.pathname.includes("@") ||
      urlObj.hostname.includes("@") ||
      url.includes("@")
    ) {
      return false;
    }

    // Check for suspicious patterns in the decoded URL
    const decodedUrl = decodeURIComponent(url);

    // Common XSS patterns to check for
    const suspiciousPatterns = [
      "<script",
      "javascript:",
      "data:",
      "vbscript:",
      "onerror=",
      "onload=",
      "onclick=",
      "onmouseover=",
      "onfocus=",
      "onblur=",
      "eval(",
      "document.cookie",
      "<iframe",
      "<img",
      "alert(",
      "prompt(",
      "confirm(",
    ];

    // Check if any suspicious pattern is found in the decoded URL
    for (const pattern of suspiciousPatterns) {
      if (decodedUrl.toLowerCase().includes(pattern.toLowerCase())) {
        return false;
      }
    }

    return true;
  } catch {
    // If the URL is invalid, it's not safe
    return false;
  }
}

/**
 * Compare two URLs by their domain and protocol
 * Useful for validating redirect URLs match expected domains
 *
 * @param urlA - First URL to compare
 * @param urlB - Second URL to compare
 * @returns true if URLs have matching domain and protocol
 *
 * @example
 * ```typescript
 * urlsMatch("https://example.com/path1", "https://example.com/path2") // true
 * urlsMatch("https://example.com", "http://example.com") // false (different protocol)
 * ```
 */
export function urlsMatch(
  urlA: string | undefined,
  urlB: string | undefined,
): boolean {
  return getDomainAndProtocol(urlA) === getDomainAndProtocol(urlB);
}
