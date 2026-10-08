import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkAccountExists } from "../discovery";
import type { CompositeAccountStrategy } from "../strategies/account-composite-strategy";
import type { Authenticator } from "../../types/authenticator";

describe("discovery.ts - Account Existence Checking", () => {
  describe("🔴 CRITICAL: checkAccountExists()", () => {
    let mockStrategy: CompositeAccountStrategy;

    beforeEach(() => {
      mockStrategy = {
        fetchSmartAccounts: vi.fn(),
      } as any;

      // No longer needed - removed logging
    });

    it("should return account when found", async () => {
      const mockAccount = {
        id: "xion1account123",
        codeId: 123,
        authenticators: [
          {
            id: "xion1account123-0",
            type: "EthWallet",
            authenticator: "0x1234567890abcdef",
            authenticatorIndex: 0,
          },
        ],
      };

      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockResolvedValue([mockAccount]);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      expect(result.exists).toBe(true);
      expect(result.accounts).toEqual([mockAccount]);
      expect(result.smartAccountAddress).toBe("xion1account123");
      expect(result.codeId).toBe(123);
      expect(result.authenticatorIndex).toBe(0);
      expect(mockStrategy.fetchSmartAccounts).toHaveBeenCalledWith(
        "0x1234567890abcdef",
        "EthWallet",
      );
    });

    it("should return null when account not found", async () => {
      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([]);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      expect(result.exists).toBe(false);
      expect(result.accounts).toEqual([]);
      expect(result.smartAccountAddress).toBeUndefined();
      expect(result.codeId).toBeUndefined();
      expect(result.authenticatorIndex).toBeUndefined();
    });

    it("should handle strategy errors gracefully and return error field", async () => {
      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      // Function catches errors and returns exists: false with error field
      expect(result.exists).toBe(false);
      expect(result.accounts).toEqual([]);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Network error");
    });

    it("should work with all authenticator types", async () => {
      const cases = [
        ["EthWallet", "0x1234567890abcdef"],
        ["Secp256K1", "AiGkW+2imN152OGq4dMyJS/J4OyGGrjtpXFXjMVASz2p"],
        ["JWT", "credential"],
        ["Passkey", "credential"],
      ] as const;

      for (const [type, credential] of cases) {
        mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
          {
            id: "xion1account123",
            codeId: 123,
            authenticators: [
              {
                id: "xion1account123-0",
                type,
                authenticator: credential,
                authenticatorIndex: 0,
              },
            ],
          },
        ]);

        const result = await checkAccountExists(mockStrategy, credential, type);

        expect(result.exists).toBe(true);
      }
    });

    it("should handle case-insensitive authenticator matching", async () => {
      const mockAccount = {
        id: "xion1account123",
        codeId: 123,
        authenticators: [
          {
            id: "xion1account123-0",
            type: "EthWallet",
            authenticator: "0xABCDEF123456",
            authenticatorIndex: 0,
          },
        ],
      };

      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockResolvedValue([mockAccount]);

      // Query with lowercase, should match uppercase in account
      const result = await checkAccountExists(
        mockStrategy,
        "0xabcdef123456",
        "EthWallet",
      );

      expect(result.exists).toBe(true);
      expect(result.authenticatorIndex).toBe(0);
    });

    it("should find matching authenticator by lowercase comparison", async () => {
      const mockAccount = {
        id: "xion1account123",
        codeId: 123,
        authenticators: [
          {
            id: "xion1account123-0",
            type: "Secp256K1",
            authenticator: "pubkey1",
            authenticatorIndex: 0,
          },
          {
            id: "xion1account123-1",
            type: "EthWallet",
            authenticator: "0xABCDEF",
            authenticatorIndex: 1,
          },
        ],
      };

      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockResolvedValue([mockAccount]);

      const result = await checkAccountExists(
        mockStrategy,
        "0xabcdef",
        "EthWallet",
      );

      expect(result.exists).toBe(true);
      expect(result.authenticatorIndex).toBe(1);
    });

    it("should return an error, not index 0, when no matching EthWallet authenticator is found", async () => {
      const mockAccount = {
        id: "xion1account123",
        codeId: 123,
        authenticators: [
          {
            id: "xion1account123-0",
            type: "Secp256K1",
            authenticator: "different-credential",
            authenticatorIndex: 0,
          },
        ],
      };

      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockResolvedValue([mockAccount]);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      expect(result).toEqual({
        exists: false,
        accounts: [],
        error:
          "Smart account xion1account123 has no EthWallet authenticator matching the login authenticator",
      });
    });

    it("should keep the legacy index-0 default for JWT authenticators", async () => {
      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
        {
          id: "xion1account123",
          codeId: 123,
          authenticators: [
            {
              id: "xion1account123-0",
              type: "JWT",
              authenticator: "other.user",
              authenticatorIndex: 0,
            },
          ],
        },
      ]);

      const result = await checkAccountExists(
        mockStrategy,
        "project.user",
        "JWT",
      );

      expect(result.exists).toBe(true);
      expect(result.authenticatorIndex).toBe(0);
    });

    it("should prefer an exact JWT identity over one differing only by case", async () => {
      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
        {
          id: "xion1account123",
          codeId: 123,
          authenticators: [
            {
              id: "xion1account123-1",
              type: "JWT",
              authenticator: "project.USER",
              authenticatorIndex: 1,
            },
            {
              id: "xion1account123-4",
              type: "JWT",
              authenticator: "project.user",
              authenticatorIndex: 4,
            },
          ],
        },
      ]);

      const result = await checkAccountExists(
        mockStrategy,
        "project.user",
        "JWT",
      );

      expect(result.exists).toBe(true);
      expect(result.authenticatorIndex).toBe(4);
    });

    it("should prefer the login's authenticator type when identities collide", async () => {
      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
        {
          id: "xion1account123",
          codeId: 123,
          authenticators: [
            {
              id: "xion1account123-0",
              type: "Passkey",
              authenticator: "c2FtZS1pZA==",
              authenticatorIndex: 0,
            },
            {
              id: "xion1account123-3",
              type: "Ed25519",
              authenticator: "c2FtZS1pZA==",
              authenticatorIndex: 3,
            },
          ],
        },
      ]);

      const result = await checkAccountExists(
        mockStrategy,
        "c2FtZS1pZA==",
        "Ed25519",
      );

      expect(result.authenticatorIndex).toBe(3);
    });

    it("should match a full JWT login by its aud.sub identity", async () => {
      const part = (value: unknown) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
      const token = `${part({ alg: "RS256" })}.${part({ aud: "project", sub: "user" })}.c2lnbmF0dXJl`;
      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
        {
          id: "xion1account123",
          codeId: 123,
          authenticators: [
            {
              id: "xion1account123-0",
              type: "JWT",
              authenticator: "project.other",
              authenticatorIndex: 0,
            },
            {
              id: "xion1account123-5",
              type: "JWT",
              authenticator: "project.user",
              authenticatorIndex: 5,
            },
          ],
        },
      ]);

      const result = await checkAccountExists(mockStrategy, token, "JWT");

      expect(result.authenticatorIndex).toBe(5);
    });

    it("should match a hex Ed25519 login against the base64 key by bytes", async () => {
      const hex = "d".repeat(64);
      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
        {
          id: "xion1account123",
          codeId: 123,
          authenticators: [
            {
              id: "xion1account123-0",
              type: "JWT",
              authenticator: "project.user",
              authenticatorIndex: 0,
            },
            {
              id: "xion1account123-2",
              type: "Ed25519",
              authenticator: Buffer.from(hex, "hex").toString("base64"),
              authenticatorIndex: 2,
            },
          ],
        },
      ]);

      const result = await checkAccountExists(mockStrategy, hex, "Ed25519");

      expect(result.authenticatorIndex).toBe(2);
    });

    describe("verified EthWallet/Secp256K1 matching", () => {
      const SECP_BASE64 = "AiGkW+2imN152OGq4dMyJS/J4OyGGrjtpXFXjMVASz2p";
      const SECP_HEX =
        "0221a45beda298dd79d8e1aae1d332252fc9e0ec861ab8eda571578cc5404b3da9";
      const OTHER_SECP_BASE64 = "AsCnyF4VdNxtN+4Fr8RFzy1Tvu1OXB5s13ZfMrEAP5t5";

      function account(authenticators: Authenticator[]) {
        return {
          id: "xion1account123",
          codeId: 1880,
          authenticators,
        };
      }

      it("returns the nonzero on-chain index of the matching Secp256K1 key", async () => {
        mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
          account([
            {
              id: "xion1account123-0",
              type: "Secp256K1",
              authenticator: OTHER_SECP_BASE64,
              authenticatorIndex: 0,
            },
            {
              id: "xion1account123-4",
              type: "Secp256K1",
              authenticator: SECP_BASE64,
              authenticatorIndex: 4,
            },
          ]),
        ]);

        const result = await checkAccountExists(
          mockStrategy,
          SECP_BASE64,
          "Secp256K1",
        );

        expect(result.exists).toBe(true);
        expect(result.authenticatorIndex).toBe(4);
        expect(result.codeId).toBe(1880);
      });

      it("matches a hex login key against the base64 on-chain key by bytes", async () => {
        mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
          account([
            {
              id: "xion1account123-2",
              type: "Secp256K1",
              authenticator: SECP_BASE64,
              authenticatorIndex: 2,
            },
          ]),
        ]);

        const result = await checkAccountExists(
          mockStrategy,
          SECP_HEX,
          "Secp256K1",
        );

        expect(result.authenticatorIndex).toBe(2);
      });

      it("treats base64 keys as case-sensitive", async () => {
        mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
          account([
            {
              id: "xion1account123-0",
              type: "Secp256K1",
              authenticator: SECP_BASE64.toLowerCase(),
              authenticatorIndex: 0,
            },
          ]),
        ]);

        const result = await checkAccountExists(
          mockStrategy,
          SECP_BASE64,
          "Secp256K1",
        );

        expect(result.exists).toBe(false);
        expect(result.error).toContain("has no Secp256K1 authenticator");
      });

      it("requires the authenticator type to match", async () => {
        mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
          account([
            {
              id: "xion1account123-0",
              type: "JWT",
              authenticator: "0xabcdef",
              authenticatorIndex: 0,
            },
          ]),
        ]);

        const result = await checkAccountExists(
          mockStrategy,
          "0xABCDEF",
          "EthWallet",
        );

        expect(result.exists).toBe(false);
        expect(result.error).toContain("has no EthWallet authenticator");
      });
    });

    it("should use custom log prefix when provided", async () => {
      const mockAccount = {
        id: "xion1account123",
        codeId: 123,
        authenticators: [
          {
            id: "xion1account123-0",
            type: "EthWallet",
            authenticator: "0x1234567890abcdef",
            authenticatorIndex: 0,
          },
        ],
      };

      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockResolvedValue([mockAccount]);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      expect(result.exists).toBe(true);
      expect(result.smartAccountAddress).toBe("xion1account123");
    });

    it("should return first account when multiple accounts found", async () => {
      const mockAccounts = [
        {
          id: "xion1account1",
          codeId: 123,
          authenticators: [
            {
              id: "xion1account1-0",
              type: "EthWallet",
              authenticator: "0x1234567890abcdef",
              authenticatorIndex: 0,
            },
          ],
        },
        {
          id: "xion1account2",
          codeId: 456,
          authenticators: [
            {
              id: "xion1account2-0",
              type: "EthWallet",
              authenticator: "0x1234567890abcdef",
              authenticatorIndex: 0,
            },
          ],
        },
      ];

      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue(mockAccounts);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      expect(result.exists).toBe(true);
      expect(result.smartAccountAddress).toBe("xion1account1");
      expect(result.codeId).toBe(123);
      expect(result.accounts).toEqual(mockAccounts);
    });
  });

  describe("🟡 HIGH: Parameter Validation", () => {
    let mockStrategy: CompositeAccountStrategy;

    beforeEach(() => {
      mockStrategy = {
        fetchSmartAccounts: vi.fn().mockResolvedValue([]),
      } as any;

      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    it("should handle empty credential", async () => {
      const result = await checkAccountExists(mockStrategy, "", "EthWallet");

      expect(mockStrategy.fetchSmartAccounts).toHaveBeenCalledWith(
        "",
        "EthWallet",
      );
      // Validation is delegated to the strategy
      expect(result.exists).toBe(false);
    });

    it("should handle null or undefined authenticator gracefully", async () => {
      const result = await checkAccountExists(
        mockStrategy,
        null as any,
        "EthWallet",
      );

      expect(result.exists).toBe(false);
    });

    it("should handle special characters in authenticator", async () => {
      const specialAuth = "credential!@#$%^&*()";
      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([
        {
          id: "xion1account123",
          codeId: 123,
          authenticators: [
            {
              id: "xion1account123-0",
              type: "JWT",
              authenticator: specialAuth,
              authenticatorIndex: 0,
            },
          ],
        },
      ]);

      const result = await checkAccountExists(mockStrategy, specialAuth, "JWT");

      expect(result.exists).toBe(true);
    });
  });

  describe("🟢 MEDIUM: Edge Cases", () => {
    let mockStrategy: CompositeAccountStrategy;

    beforeEach(() => {
      mockStrategy = {
        fetchSmartAccounts: vi.fn(),
      } as any;

      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    it("should handle very long credentials", async () => {
      const longCred = "a".repeat(10000);
      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue([]);

      const result = await checkAccountExists(
        mockStrategy,
        longCred,
        "EthWallet",
      );

      expect(result.exists).toBe(false);
      expect(mockStrategy.fetchSmartAccounts).toHaveBeenCalledWith(
        longCred,
        "EthWallet",
      );
    });

    it("should handle account with empty authenticators array", async () => {
      const mockAccount = {
        id: "xion1account123",
        codeId: 123,
        authenticators: [],
      };

      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockResolvedValue([mockAccount]);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      // No login authenticator on the account is an inconsistency
      expect(result.exists).toBe(false);
      expect(result.error).toContain("has no EthWallet authenticator");
    });

    it("should handle account with multiple authenticators of same type", async () => {
      const mockAccount = {
        id: "xion1account123",
        codeId: 123,
        authenticators: [
          {
            id: "xion1account123-0",
            type: "EthWallet",
            authenticator: "0xfirst",
            authenticatorIndex: 0,
          },
          {
            id: "xion1account123-1",
            type: "EthWallet",
            authenticator: "0xsecond",
            authenticatorIndex: 1,
          },
          {
            id: "xion1account123-2",
            type: "EthWallet",
            authenticator: "0xthird",
            authenticatorIndex: 2,
          },
        ],
      };

      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockResolvedValue([mockAccount]);

      const result = await checkAccountExists(
        mockStrategy,
        "0xsecond",
        "EthWallet",
      );

      expect(result.exists).toBe(true);
      expect(result.authenticatorIndex).toBe(1);
    });

    it("should handle strategy returning null instead of empty array", async () => {
      mockStrategy.fetchSmartAccounts = vi.fn().mockResolvedValue(null as any);

      // This would cause an error that gets caught
      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      expect(result.exists).toBe(false);
    });

    it("should handle timeout errors from strategy and return error field", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";

      mockStrategy.fetchSmartAccounts = vi.fn().mockRejectedValue(timeoutError);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Request timeout");
    });

    it("should handle network errors from strategy", async () => {
      const networkError = new Error("Failed to fetch");
      networkError.name = "NetworkError";

      mockStrategy.fetchSmartAccounts = vi.fn().mockRejectedValue(networkError);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Failed to fetch");
    });

    it("should handle malformed account data", async () => {
      const malformedAccount = {
        // Missing codeId
        id: "xion1account123",
        authenticators: [
          {
            id: "xion1account123-0",
            type: "EthWallet",
            authenticator: "0x1234567890abcdef",
            authenticatorIndex: 0,
          },
        ],
      };

      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockResolvedValue([malformedAccount as any]);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      expect(result.exists).toBe(true);
      expect(result.codeId).toBeUndefined();
    });

    it("should log account details when found", async () => {
      const mockAccount = {
        id: "xion1account123",
        codeId: 123,
        authenticators: [
          {
            id: "xion1account123-0",
            type: "EthWallet",
            authenticator: "0x1234567890abcdef",
            authenticatorIndex: 0,
          },
          {
            id: "xion1account123-1",
            type: "Secp256K1",
            authenticator: "pubkey",
            authenticatorIndex: 1,
          },
        ],
      };

      mockStrategy.fetchSmartAccounts = vi
        .fn()
        .mockResolvedValue([mockAccount]);

      const result = await checkAccountExists(
        mockStrategy,
        "0x1234567890abcdef",
        "EthWallet",
      );

      // No longer logs - just returns result
      expect(result.exists).toBe(true);
      expect(result.smartAccountAddress).toBe("xion1account123");
    });
  });
});
