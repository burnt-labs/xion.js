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
 * Reduce a URL to its origin — `protocol` + `host` + `port`.
 *
 * Returns `null` for values that don't parse, so two unparseable inputs never
 * compare equal. The port is part of the origin: `https://host` and
 * `https://host:8443` are different origins.
 *
 * Schemes without a tuple origin (`data:`, `file:`, `mailto:`, `blob:` of an
 * opaque origin, …) stringify their origin as the literal `"null"`. Those are
 * treated as unparseable — otherwise every opaque-origin URL would compare
 * equal to every other one.
 */
function toOrigin(url: string | undefined): string | null {
  try {
    const { origin } = new URL(url || "");
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

/**
 * Compare two URLs by their origin (`protocol` + `host` + `port`).
 *
 *  - port-sensitive       — `https://x` ≠ `https://x:8443`
 *  - protocol-sensitive   — `https://x` ≠ `http://x`
 *  - path/query/hash-insensitive — same-origin URLs compare equal regardless of
 *    path. (For a path-sensitive comparison, compare
 *    `toOrigin(x) + new URL(x).pathname` instead.)
 *  - unparseable input never matches.
 *  - opaque-origin schemes (`data:`, `file:`, `mailto:`, …) never match, not
 *    even against themselves.
 *
 * @example
 * urlsMatch("https://example.com/a", "https://example.com/b") // true  (same origin)
 * urlsMatch("https://example.com",   "https://example.com:8443") // false (port differs)
 * urlsMatch("https://example.com",   "http://example.com") // false (protocol differs)
 * urlsMatch("data:text/html,a",      "data:text/html,b") // false (opaque origin)
 */
export function urlsMatch(
  urlA: string | undefined,
  urlB: string | undefined,
): boolean {
  const a = toOrigin(urlA);
  return a !== null && a === toOrigin(urlB);
}
