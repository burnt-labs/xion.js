import { describe, it, expect } from "vitest";
import { toBase64 } from "../encoding";

describe("toBase64", () => {
  it("round-trips ASCII correctly", () => {
    const input = "hello world";
    const encoded = toBase64(input);
    expect(atob(encoded)).toBe(input);
  });

  it("does not throw on non-ASCII characters (emoji)", () => {
    const input = JSON.stringify({ memo: "send 🚀🎉" });
    expect(() => toBase64(input)).not.toThrow();
  });

  it("produces valid base64 output", () => {
    const encoded = toBase64("test with émojis 🔥");
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});
