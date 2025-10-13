import type { RegistrationPublicKeyCredential } from "@github/webauthn-json/browser-ponyfill";

type PasskeyStorage = Record<string, RegistrationPublicKeyCredential[]>; // Map of address -> registrations

const STORAGE_KEY = "xionStoredPasskeys";

// Retrieve the entire passkey storage object from localStorage
function getPasskeyStorage(): PasskeyStorage {
  const storedData = localStorage.getItem(STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : {};
}

// Save the entire passkey storage object back to localStorage
function setPasskeyStorage(storage: PasskeyStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage, null, 2));
}

// Get registrations for a specific address
export function getRegistrations(
  address: string,
): RegistrationPublicKeyCredential[] {
  const storage = getPasskeyStorage();
  return storage[address] || [];
}

// Save a new registration for a specific address
export function saveRegistration(
  address: string,
  registration: RegistrationPublicKeyCredential,
): void {
  const storage = getPasskeyStorage();
  const registrations = storage[address] || [];
  registrations.push(registration);
  storage[address] = registrations; // Update the storage object
  setPasskeyStorage(storage);
}

// Convert a URL-safe Base64 string to a Buffer
function getBufferFromId(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  return Buffer.from(paddedBase64, "base64").buffer;
}

// Retrieve registered credentials for a specific address to exclude during registration
export function registeredCredentials(
  address?: string,
): PublicKeyCredentialDescriptor[] {
  const storage = getPasskeyStorage();

  // If an address is provided, get credentials for that address only
  const registrations = address
    ? getRegistrations(address)
    : Object.values(storage).flat(); // Get all registrations across all addresses

  return registrations.map((reg) => ({
    id: getBufferFromId(reg.id),
    type: reg.type as PublicKeyCredentialType,
  }));
}

// Utility to convert a URL-safe Base64 string to standard Base64
export function convertToStandardBase64(urlSafeBase64: string): string {
  let base64 = urlSafeBase64.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return base64;
}

// Utility to convert a standard Base64 string to a URL-safe Base64 string
export function toUrlSafeBase64(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Removes a specific registration for a given address
export function removeRegistration(
  address: string,
  credentialId: string,
): void {
  const storage = getPasskeyStorage();
  const registrations = storage[address] || [];

  // Filter out the credential with the matching id
  const updatedRegistrations = registrations.filter(
    (reg) => reg.id !== toUrlSafeBase64(credentialId),
  );

  // If there are no registrations left, delete the address key; otherwise, update it
  if (updatedRegistrations.length === 0) {
    delete storage[address];
  } else {
    storage[address] = updatedRegistrations;
  }

  setPasskeyStorage(storage);
}
