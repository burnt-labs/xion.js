import { Coin } from "@cosmjs/amino";

/**
 * Formats an array of coins into a string representation.
 *
 * @param {Coin[]} [coins=[]] - An array of Coin objects to format.
 * @returns {string} - A string representation of the coins (e.g. "1000uxion,1000ibc/123")
 */
export const formatCoinArray = (coins: Coin[] = []): string => {
  return coins.map((coin) => `${coin.amount}${coin.denom}`).join(",");
};

/**
 * Sorts coins alphabetically by denom.
 *
 * The Cosmos SDK requires coin lists (sdk.Coins) to be sorted in ascending
 * lexicographic order by denom before they are accepted by the chain.
 * Submitting unsorted coins results in a chain-level rejection with an
 * unhelpful error message. Use this before encoding any coin array into a
 * protobuf message (SendAuthorization, CombinedLimit, etc.).
 *
 * Does not mutate the input array.
 *
 * @param {T[]} coins - Array of coin-like objects with a `denom` field
 * @returns {T[]} New array sorted ascending by denom
 */
export const sortCoins = <T extends { denom: string }>(coins: T[]): T[] =>
  [...coins].sort((a, b) =>
    a.denom < b.denom ? -1 : a.denom > b.denom ? 1 : 0,
  );

/**
 * Parses a comma-separated coin string into a Coin array.
 * Enhanced version with better validation for edge cases.
 *
 * @param {string} input Comma-separated string of coins (e.g. "1000uxion,1000ibc/123")
 * @returns {Coin[]} Array of parsed coins
 */
export const parseCoinString = (input: string): Coin[] => {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Check if the string contains commas that are part of number formatting (not coin separators)
  // Pattern: digit(s), comma, digit(s), letter (e.g., "1,000uxion" or "1,000,000uxion")
  // This indicates number formatting within a single coin, not multiple coins
  // Valid multi-coin strings like "1000000uxion,2000000usdc" have a letter before the comma, so won't match
  const commaInFormattedNumber = /\d,\d+[a-zA-Z]/;
  if (commaInFormattedNumber.test(trimmed)) {
    return [];
  }

  // Split by commas and parse each coin
  const coinStrings = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const coins: Coin[] = [];

  for (const singleCoinStr of coinStrings) {
    // Match pattern like "1000000uxion" or "1000000 uxion"
    const match = singleCoinStr.match(/^(\d+)\s*([a-zA-Z][a-zA-Z0-9/]*)$/);
    if (match) {
      coins.push({
        amount: match[1],
        denom: match[2],
      });
    }
  }

  return coins;
};
