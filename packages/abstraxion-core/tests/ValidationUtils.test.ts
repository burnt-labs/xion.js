import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateTreasuryGrantConfig,
  validateTreasuryIndexerResponse,
} from "../src/utils/grant/validation";
import { TreasuryValidationError } from "../src/utils/grant/errors";

describe("Treasury Grant Validation", () => {
  describe("validateTreasuryGrantConfig", () => {
    it("should validate a correct TreasuryGrantConfig", () => {
      const validConfig = {
        authorization: {
          type_url: "/cosmos.authz.v1beta1.MsgGrant",
          value: new Uint8Array([1, 2, 3]),
        },
      };

      expect(validateTreasuryGrantConfig(validConfig)).toBe(true);
    });

    it("should validate config with string value (base64)", () => {
      const validConfig = {
        authorization: {
          type_url: "/cosmos.authz.v1beta1.MsgGrant",
          value: "base64encodedstring",
        },
      };

      expect(validateTreasuryGrantConfig(validConfig)).toBe(true);
    });

    it("should reject null or undefined", () => {
      expect(validateTreasuryGrantConfig(null)).toBe(false);
      expect(validateTreasuryGrantConfig(undefined)).toBe(false);
    });

    it("should reject non-object types", () => {
      expect(validateTreasuryGrantConfig("string")).toBe(false);
      expect(validateTreasuryGrantConfig(123)).toBe(false);
      expect(validateTreasuryGrantConfig([])).toBe(false);
    });

    it("should reject object without authorization", () => {
      const invalidConfig = {
        someOtherField: "value",
      };

      expect(validateTreasuryGrantConfig(invalidConfig)).toBe(false);
    });

    it("should reject authorization that is not an object", () => {
      const invalidConfig = {
        authorization: "not an object",
      };

      expect(validateTreasuryGrantConfig(invalidConfig)).toBe(false);
    });

    it("should reject authorization without type_url", () => {
      const invalidConfig = {
        authorization: {
          value: new Uint8Array([1, 2, 3]),
        },
      };

      expect(validateTreasuryGrantConfig(invalidConfig)).toBe(false);
    });

    it("should reject authorization with empty type_url", () => {
      const invalidConfig = {
        authorization: {
          type_url: "",
          value: new Uint8Array([1, 2, 3]),
        },
      };

      expect(validateTreasuryGrantConfig(invalidConfig)).toBe(false);
    });

    it("should reject authorization without value", () => {
      const invalidConfig = {
        authorization: {
          type_url: "/cosmos.authz.v1beta1.MsgGrant",
        },
      };

      expect(validateTreasuryGrantConfig(invalidConfig)).toBe(false);
    });
  });

  describe("validateTreasuryIndexerResponse", () => {
    it("should validate a correct indexer response", () => {
      const validResponse = {
        "/cosmos.authz.v1beta1.MsgGrant": {
          authorization: {
            type_url: "/cosmos.authz.v1beta1.MsgGrant",
            value: new Uint8Array([1, 2, 3]),
          },
        },
        "/cosmos.bank.v1beta1.MsgSend": {
          authorization: {
            type_url: "/cosmos.bank.v1beta1.MsgSend",
            value: "base64string",
          },
        },
      };

      const result = validateTreasuryIndexerResponse(validResponse);
      expect(result).toEqual(validResponse);
    });

    it("should throw TreasuryValidationError for null response", () => {
      expect(() => validateTreasuryIndexerResponse(null)).toThrow(
        TreasuryValidationError,
      );
      expect(() => validateTreasuryIndexerResponse(null)).toThrow(
        "Invalid indexer response: expected object",
      );
    });

    it("should throw TreasuryValidationError for non-object response", () => {
      expect(() => validateTreasuryIndexerResponse("string")).toThrow(
        TreasuryValidationError,
      );
      expect(() => validateTreasuryIndexerResponse([])).toThrow(
        TreasuryValidationError,
      );
      expect(() => validateTreasuryIndexerResponse(123)).toThrow(
        TreasuryValidationError,
      );
    });

    it("should skip invalid configs and warn", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

      const mixedResponse = {
        "/cosmos.authz.v1beta1.MsgGrant": {
          authorization: {
            type_url: "/cosmos.authz.v1beta1.MsgGrant",
            value: new Uint8Array([1, 2, 3]),
          },
        },
        "/invalid.config": {
          // Missing authorization field
          someField: "value",
        },
        "/another.invalid": null,
      };

      const result = validateTreasuryIndexerResponse(mixedResponse);

      // Should only include valid configs
      expect(Object.keys(result)).toHaveLength(1);
      expect(result["/cosmos.authz.v1beta1.MsgGrant"]).toBeDefined();

      // Should have warned about invalid configs
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        "Invalid treasury grant config for type URL /invalid.config",
        { someField: "value" },
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        "Invalid treasury grant config for type URL /another.invalid",
        null,
      );

      consoleSpy.mockRestore();
    });

    it("should return empty object for response with all invalid configs", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation();

      const invalidResponse = {
        "/invalid1": { notAuthorization: "value" },
        "/invalid2": null,
        "/invalid3": "string",
      };

      const result = validateTreasuryIndexerResponse(invalidResponse);

      expect(result).toEqual({});

      // Check the actual console.warn calls
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        "Invalid treasury grant config for type URL /invalid1",
        { notAuthorization: "value" },
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        "Invalid treasury grant config for type URL /invalid2",
        null,
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        3,
        "Invalid treasury grant config for type URL /invalid3",
        "string",
      );

      consoleSpy.mockRestore();
    });

    it("should handle empty object response", () => {
      const result = validateTreasuryIndexerResponse({});
      expect(result).toEqual({});
    });

    it("should preserve the exact structure of valid configs", () => {
      const complexConfig = {
        "/complex.type": {
          authorization: {
            type_url: "/complex.type",
            value: new Uint8Array([255, 128, 0, 64]),
          },
          // Additional fields that might be present
          extraField: "should be preserved",
          nestedObject: {
            field1: "value1",
            field2: 123,
          },
        },
      };

      const result = validateTreasuryIndexerResponse(complexConfig);
      expect(result).toEqual(complexConfig);
    });
  });
});
