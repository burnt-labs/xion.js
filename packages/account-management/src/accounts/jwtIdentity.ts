/**
 * JWT login identity: the `aud.sub` form that account contracts and indexers
 * store for a JWT authenticator.
 */

import { fromBase64, fromUtf8 } from "@cosmjs/encoding";
import { isJWTToken, normalizeJWTIdentifier } from "@burnt-labs/signers";

/**
 * Reduce a full JWT to its `aud.sub` identity (first audience, as
 * `normalizeJWTIdentifier` does). The signature is not verified: this only
 * names the authenticator to look up. Anything that is not a decodable JWT
 * with `aud` and `sub` claims, including an `aud.sub` identity, is returned
 * unchanged.
 */
export function toJwtIdentity(value: string): string {
  const token = value.trim();
  if (!isJWTToken(token)) {
    return value;
  }

  try {
    const payload = token.split(".")[1];
    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claims: unknown = JSON.parse(fromUtf8(fromBase64(base64)));
    const { aud, sub } = (claims ?? {}) as { aud?: unknown; sub?: unknown };
    const audience =
      typeof aud === "string" ||
      (Array.isArray(aud) && aud.every((a) => typeof a === "string"))
        ? (aud as string | string[])
        : undefined;
    if (!audience || typeof sub !== "string") {
      return value;
    }
    return normalizeJWTIdentifier(audience, sub);
  } catch {
    return value;
  }
}
