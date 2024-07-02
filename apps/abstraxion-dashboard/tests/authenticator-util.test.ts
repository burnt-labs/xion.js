import {
  AuthenticatorNode,
  findLowestMissingOrNextIndex,
} from "@/utils/authenticator-util";

describe("findLowestMissingOrNextIndex", () => {
  it("should return 2 when there is a missing index 2", () => {
    const data = [
      { authenticatorIndex: 0 },
      { authenticatorIndex: 1 },
      { authenticatorIndex: 3 },
      { authenticatorIndex: 4 },
    ] as AuthenticatorNode[]; // forcing type for test sake
    expect(findLowestMissingOrNextIndex(data)).toBe(2);
  });

  it("should return 4 when there are no missing indices in [0, 1, 2, 3]", () => {
    const data = [
      { authenticatorIndex: 0 },
      { authenticatorIndex: 1 },
      { authenticatorIndex: 2 },
      { authenticatorIndex: 3 },
    ] as AuthenticatorNode[]; // forcing type for test sake
    expect(findLowestMissingOrNextIndex(data)).toBe(4);
  });

  it("should return 0 when the array is empty", () => {
    const data = [] as AuthenticatorNode[]; // forcing type for test sake
    expect(findLowestMissingOrNextIndex(data)).toBe(0);
  });

  it("should return the next index for a single-element array starting at index 0", () => {
    const data = [{ authenticatorIndex: 0 }] as AuthenticatorNode[]; // forcing type for test sake
    expect(findLowestMissingOrNextIndex(data)).toBe(1);
  });

  it("should return the first missing index for a single-element array not starting at index 0", () => {
    const data = [{ authenticatorIndex: 3 }] as AuthenticatorNode[]; // forcing type for test sake
    expect(findLowestMissingOrNextIndex(data)).toBe(0);
  });
});
