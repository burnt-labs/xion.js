export interface Authenticator {
  id: string;
  type: string;
  authenticator: string;
  authenticatorIndex: number;
}

export interface SmartAccount {
  id: string;
  authenticators: Authenticator[];
}

export interface SmartAccountWithCodeId extends SmartAccount {
  codeId: number;
}

export interface SelectedSmartAccount extends SmartAccountWithCodeId {
  currentAuthenticatorIndex: number;
}
