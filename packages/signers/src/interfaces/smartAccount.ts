export type ISmartAccounts = {
  id?: string;
  latestAuthenticatorId?: number;
  nodes: Array<ISmartAccountAuthenticators>;
};

export type ISmartAccountAuthenticators = {
  authenticators: {
    nodes: Array<ISmartAccountAuthenticator>;
  };
};

export type ISmartAccountAuthenticator = {
  id: string;
  type: string;
  authenticator: string;
  authenticatorId: string;
  version: string;
};

export type IQueryAAResponse = {
  smartAccounts: ISmartAccounts;
};

// mapping of index algo type to wallet algo type
export enum AAAlgo {
  Secp256K1 = "secp256k1",
  secp256k1 = "Secp256K1",
  Ed25519 = "ed25519",
  ed25519 = "Ed25519",
  Sr25519 = "sr25519",
  sr25519 = "Sr25519",
  jwt = "JWT",
  JWT = "jwt",
}

export interface AddSecp256K1Authenticator {
  add_auth_method: {
    add_authenticator: {
      Secp256K1: {
        id: number;
        pubkey: string; //base64 encoded
        signature: string; //base64 encoded
      };
    };
  };
}

export interface AddEd25519Authenticator {
  add_auth_method: {
    add_authenticator: {
      Ed25519: {
        id: number;
        pubkey: string; //base64 encoded
        signature: string; //base64 encoded
      };
    };
  };
}

export interface AddEthWalletAuthenticator {
  add_auth_method: {
    add_authenticator: {
      EthWallet: {
        id: number;
        address: string;
        signature: string; //base64 encoded
      };
    };
  };
}

export interface AddJwtAuthenticator {
  add_auth_method: {
    add_authenticator: {
      Jwt: {
        id: number;
        aud: string;
        sub: string;
        token: string; //base64 encoded
      };
    };
  };
}

export type AddAuthenticator =
  | AddSecp256K1Authenticator
  | AddEd25519Authenticator
  | AddEthWalletAuthenticator
  | AddJwtAuthenticator;
