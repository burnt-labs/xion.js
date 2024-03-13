export function truncateAddress(address: string | undefined) {
  if (!address) {
    return "";
  }
  return (
    address.slice(0, 8) +
    "..." +
    address.slice(address.length - 4, address.length)
  );
}

export function getHumanReadablePubkey(pubkey: Uint8Array | undefined) {
  if (!pubkey) {
    return "";
  }
  const pubUint8Array = new Uint8Array(Object.values(pubkey));
  const pubBase64 = btoa(String.fromCharCode.apply(null, pubUint8Array));
  return pubBase64;
}

export function encodeHex(bytes: any) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getEnvNumberOrThrow(key: string, value?: string): number {
  const val = Number(value);
  if (isNaN(val)) {
    throw new Error(`Environment variable ${key} must be defined`);
  }

  return val;
}

export function getEnvStringOrThrow(key: string, value?: string): string {
  if (!value) {
    throw new Error(`Environment variable ${key} must be defined`);
  }

  return value;
}

export function removeTrailingDigits(number: number) {
  return number / 1000000;
}

export function getCommaSeperatedNumber(number: number) {
  const millionthPart = removeTrailingDigits(number);
  return millionthPart.toLocaleString("en-US", {
    minimumFractionDigits: Math.max(
      0,
      Math.ceil(
        Math.abs(millionthPart) < 1 ? Math.log10(Math.abs(millionthPart)) : 0,
      ),
    ),
    maximumFractionDigits: 6,
  });
}

export function formatBalance(
  number: number,
  locale: string = "en-US",
  currency: string = "USD",
) {
  const millionthPart = removeTrailingDigits(number);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
  })
    .format(millionthPart)
    .replace(currency, "")
    .trim();
}

export function isValidWalletAddress(address: string) {
  if (address.length !== 40 && address.length !== 63) {
    return false;
  }

  const validCharacters = /^[0-9a-zA-Z]+$/;
  if (!validCharacters.test(address)) {
    return false;
  }

  if (!address.startsWith("xion")) {
    return false;
  }

  return true;
}
