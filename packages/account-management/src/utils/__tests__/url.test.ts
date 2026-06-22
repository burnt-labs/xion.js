import { describe, it, expect } from "vitest";
import { urlsMatch } from "../url";

describe("urlsMatch", () => {
  it("matches same-origin URLs with different paths", () => {
    expect(
      urlsMatch("https://example.com/path1", "https://example.com/path2"),
    ).toBe(true);
  });

  it("matches same-origin URLs that differ only in path", () => {
    expect(urlsMatch("https://example.com/a", "https://example.com/b")).toBe(
      true,
    );
  });

  it("does not match when only the port differs", () => {
    expect(urlsMatch("https://example.com", "https://example.com:8443")).toBe(
      false,
    );
  });

  it("does not match an explicit default port against a different port", () => {
    // 443 (the https default) vs 8443.
    expect(
      urlsMatch("https://example.com:443", "https://example.com:8443"),
    ).toBe(false);
  });

  it("does not match different protocols (http vs https)", () => {
    expect(urlsMatch("https://example.com", "http://example.com")).toBe(false);
  });

  it("does not match different hosts", () => {
    expect(urlsMatch("https://example.com", "https://other.com")).toBe(false);
  });

  it("matches identical URLs", () => {
    expect(urlsMatch("https://example.com", "https://example.com")).toBe(true);
  });

  it("ignores trailing slash, path, query, and hash differences", () => {
    expect(urlsMatch("https://example.com", "https://example.com/")).toBe(true);
    expect(
      urlsMatch("https://example.com/", "https://example.com/deep/path"),
    ).toBe(true);
    expect(
      urlsMatch("https://example.com/a?x=1", "https://example.com/b?y=2"),
    ).toBe(true);
    expect(
      urlsMatch("https://example.com/a#one", "https://example.com/b#two"),
    ).toBe(true);
  });

  it("treats an explicit default port the same as an implicit one", () => {
    expect(
      urlsMatch("https://example.com:443/x", "https://example.com/y"),
    ).toBe(true);
  });

  it("returns false when one input is undefined", () => {
    expect(urlsMatch(undefined, "https://example.com")).toBe(false);
    expect(urlsMatch("https://example.com", undefined)).toBe(false);
  });

  it("returns false when one input is an empty string", () => {
    expect(urlsMatch("", "https://example.com")).toBe(false);
    expect(urlsMatch("https://example.com", "")).toBe(false);
  });

  it("returns false when both inputs are undefined", () => {
    expect(urlsMatch(undefined, undefined)).toBe(false);
  });

  it("returns false when both inputs are empty strings", () => {
    expect(urlsMatch("", "")).toBe(false);
  });

  it("returns false for an unparseable string against a valid URL", () => {
    expect(urlsMatch("not a url", "https://example.com")).toBe(false);
  });

  it("returns false when both inputs are unparseable", () => {
    expect(urlsMatch("not a url", "also not a url")).toBe(false);
    expect(urlsMatch("garbage", "garbage")).toBe(false);
  });
});
