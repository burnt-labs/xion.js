import { Coin } from "@cosmjs/amino";

/**
 * Formats an array of coins into a string representation.
 *
 * @param {Coin[]} [coins=[]] - An array of Coin objects to format.
 * @returns {string} - A string representation of the coins (e.g. "1000uxion,1000ibc/123")
 */
export const formatCoinArray = (coins: Coin[] = []): string => {
  return coins.map((coin) => `${coin.amount}${coin.denom}`).join(", ");
};

/**
 * Parses a comma-separated coin string into a sorted Coin array.
 *
 * @param {string} input Comma-separated string of coins (e.g. "1000uxion,1000ibc/123")
 * @returns {Coin[]} sorted alphabetically by denom
 */
export const parseCoinString = (input: string): Coin[] => {
  return input
    .split(",")
    .map((coinStr) => coinStr.trim())
    .map((coinStr) => {
      const match = coinStr.match(/^(\d+)([a-zA-Z0-9\/]+)$/);
      if (!match) return null;
      const [, amount, denom] = match;
      return { amount, denom };
    })
    .filter((coin): coin is Coin => coin !== null)
    .sort((a, b) => a.denom.localeCompare(b.denom));
};
