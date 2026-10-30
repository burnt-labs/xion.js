/**
 * Unit tests for toJwtIdentity
 */

import { describe, it, expect } from "vitest";
import { toJwtIdentity } from "../jwtIdentity";

const b64url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (claims: unknown) =>
  `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url(claims)}.c2lnbmF0dXJl`;

describe("toJwtIdentity", () => {
  it("reduces a full JWT to aud.sub", () => {
    expect(toJwtIdentity(jwt({ aud: "project-1", sub: "user-1" }))).toBe(
      "project-1.user-1",
    );
  });

  it("uses the first audience of an array", () => {
    expect(
      toJwtIdentity(jwt({ aud: ["project-1", "other"], sub: "user-1" })),
    ).toBe("project-1.user-1");
  });

  it("trims a padded token", () => {
    expect(toJwtIdentity(` ${jwt({ aud: "p", sub: "u" })} `)).toBe("p.u");
  });

  it.each([
    ["an aud.sub identity", "project-live-1.user-live-1"],
    ["a dotted audience identity", "123.apps.googleusercontent.com.sub-1"],
    ["a token without sub", jwt({ aud: "project-1" })],
    ["a token without aud", jwt({ sub: "user-1" })],
    ["a token with a non-string aud", jwt({ aud: 7, sub: "user-1" })],
    [
      "a token whose payload is not JSON",
      "aGVhZGVyLWhlYWRlcg.bm90LWpzb24tYXQtYWxs.c2ln",
    ],
  ])("returns %s unchanged", (_, value) => {
    expect(toJwtIdentity(value)).toBe(value);
  });
});
