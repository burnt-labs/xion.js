// Mock implementation for @github/webauthn-json/browser-ponyfill
// This file provides mock implementations for browser-specific WebAuthn functions

export const get = () => Promise.resolve({});
export const create = () => Promise.resolve({});
export class RegistrationPublicKeyCredential {}

export default {
  get,
  create,
  RegistrationPublicKeyCredential,
};
