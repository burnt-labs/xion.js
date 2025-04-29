import { Coin } from "@cosmjs/amino";

export * from "./query";
export * from "./decoding";
export * from "./compare";

/**
 * Formats an array of coins into a string representation.
 *
 * @param {Coin[]} [coins=[]] - An array of Coin objects to format.
 * @returns {string} - A string representation of the coins, formatted as "amount denom".
 */
export const formatCoinArray = (coins: Coin[] = []): string => {
  return coins.map((coin) => `${coin.amount} ${coin.denom}`).join(", ");
};
