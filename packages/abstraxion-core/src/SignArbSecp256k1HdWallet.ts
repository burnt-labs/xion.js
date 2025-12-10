import { Buffer } from "buffer";
import { type AccountData, makeSignBytes } from "@cosmjs/proto-signing";
import type { KdfConfiguration } from "@cosmjs/amino";
import {
  encodeSecp256k1Signature,
  makeCosmoshubPath,
  rawSecp256k1PubkeyToRawAddress,
  serializeSignDoc,
} from "@cosmjs/amino";
import { isNonNullObject } from "@cosmjs/utils";
import type { HdPath, Secp256k1Keypair } from "@cosmjs/crypto";
import {
  Argon2id,
  Bip39,
  EnglishMnemonic,
  isArgon2idOptions,
  pathToString,
  Random,
  Secp256k1,
  Sha256,
  sha256,
  Slip10,
  Slip10Curve,
  stringToPath,
} from "@cosmjs/crypto";
import {
  fromBase64,
  fromUtf8,
  toBase64,
  toBech32,
  toUtf8,
} from "@cosmjs/encoding";
import type { EncryptionConfiguration } from "@cosmjs/proto-signing/build/wallet";
import {
  cosmjsSalt,
  decrypt,
  encrypt,
  supportedAlgorithms,
} from "@cosmjs/proto-signing/build/wallet";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { makeADR36AminoSignDoc } from "./utils";

const serializationTypeV1 = "directsecp256k1hdwallet-v1";

/**
 * Type for React Native quick-crypto pbkdf2 function
 */
interface QuickCrypto {
  pbkdf2(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keylen: number,
    digest: string,
    callback: (err: Error | null, derivedKey: Uint8Array) => void,
  ): void;
}

/**
 * Type guard to check if quickCrypto is available and properly typed
 */
function isQuickCrypto(value: unknown): value is QuickCrypto {
  if (typeof value !== "object" || value === null) return false;
  const crypto = value as Record<string, unknown>;
  return typeof crypto.pbkdf2 === "function";
}

/**
 * A KDF configuration that is not very strong but can be used on the main thread.
 * It takes about 1 second in Node.js 16.0.0 and should have similar runtimes in other modern Wasm hosts.
 */
const basicPasswordHashingOptions = {
  algorithm: "argon2id",
  params: {
    outputLength: 32,
    opsLimit: 24,
    memLimitKib: 12 * 1024,
  },
};

export interface DirectSecp256k1HdWalletOptions {
  /** The password to use when deriving a BIP39 seed from a mnemonic. */
  readonly bip39Password: string;
  /** The BIP-32/SLIP-10 derivation paths. Defaults to the Cosmos Hub/ATOM path `m/44'/118'/0'/0/0`. */
  readonly hdPaths: readonly HdPath[];
  /** The bech32 address prefix (human readable part). Defaults to "cosmos". */
  readonly prefix: string;
}

interface DirectSecp256k1HdWalletConstructorOptions
  extends Partial<DirectSecp256k1HdWalletOptions> {
  readonly seed: Uint8Array;
}

interface AccountDataWithPrivkey extends AccountData {
  readonly privkey: Uint8Array;
}

/**
 * Derivation information required to derive a keypair and an address from a mnemonic.
 */
interface Secp256k1Derivation {
  readonly hdPath: HdPath;
  readonly prefix: string;
}

/**
 * Derivation information required to derive a keypair and an address from a mnemonic.
 * All fields in here must be JSON types.
 */
interface DerivationInfoJson {
  readonly hdPath: string;
  readonly prefix: string;
}

function isDerivationJson(thing: unknown): thing is DerivationInfoJson {
  if (!isNonNullObject(thing)) return false;
  if (typeof (thing as DerivationInfoJson).hdPath !== "string") return false;
  if (typeof (thing as DerivationInfoJson).prefix !== "string") return false;
  return true;
}

/**
 * Type guard for serialization root object
 */
function isSerializationRoot(
  value: unknown,
): value is { readonly type: string } {
  return (
    isNonNullObject(value) &&
    typeof (value as Record<string, unknown>).type === "string"
  );
}

/**
 * Type guard for encrypted serialization
 */
function isEncryptedSerialization(value: unknown): value is {
  readonly type: string;
  readonly data: string;
  readonly encryption: EncryptionConfiguration;
} {
  if (!isNonNullObject(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.type === "string" &&
    typeof obj.data === "string" &&
    isNonNullObject(obj.encryption)
  );
}

/**
 * Type guard for decrypted wallet document
 */
function isDecryptedDocument(value: unknown): value is {
  readonly mnemonic: { readonly data: string };
  readonly accounts: readonly Secp256k1Derivation[];
} {
  if (!isNonNullObject(value)) return false;
  const obj = value as Record<string, unknown>;

  // Check mnemonic structure
  if (!isNonNullObject(obj.mnemonic)) return false;
  const mnemonic = obj.mnemonic as Record<string, unknown>;
  if (typeof mnemonic.data !== "string") return false;

  // Check accounts array
  if (!Array.isArray(obj.accounts)) return false;

  return true;
}

const defaultOptions: DirectSecp256k1HdWalletOptions = {
  bip39Password: "",
  hdPaths: [makeCosmoshubPath(0)],
  prefix: "cosmos",
};

export class SignArbSecp256k1HdWallet {
  /** Base secret */
  private readonly secret: EnglishMnemonic;
  /** BIP39 seed */
  private readonly seed: Uint8Array;
  /** Derivation instructions */
  private readonly accounts: readonly Secp256k1Derivation[];

  protected constructor(
    mnemonic: EnglishMnemonic,
    options: DirectSecp256k1HdWalletConstructorOptions,
  ) {
    const prefix = options.prefix ?? defaultOptions.prefix;
    const hdPaths = options.hdPaths ?? defaultOptions.hdPaths;
    this.secret = mnemonic;
    this.seed = options.seed;
    this.accounts = hdPaths.map((hdPath) => ({
      hdPath,
      prefix,
    }));
  }
  public static async fromMnemonic(
    mnemonic: string,
    options: Partial<DirectSecp256k1HdWalletOptions> = {},
  ): Promise<SignArbSecp256k1HdWallet> {
    const mnemonicChecked = new EnglishMnemonic(mnemonic);
    const seed = await Bip39.mnemonicToSeed(
      mnemonicChecked,
      options.bip39Password,
    );
    return new SignArbSecp256k1HdWallet(mnemonicChecked, {
      ...options,
      seed,
    });
  }

  /**
   * Generates a new wallet with a BIP39 mnemonic of the given length.
   *
   * @param length The number of words in the mnemonic (12, 15, 18, 21 or 24).
   * @param options An optional `DirectSecp256k1HdWalletOptions` object optionally containing a bip39Password, hdPaths, and prefix.
   */
  static async generate(length = 12, options = {}) {
    const entropyLength = 4 * Math.floor((11 * length) / 33);
    const entropy = Random.getBytes(entropyLength);
    const mnemonic = Bip39.encode(entropy);
    return this.fromMnemonic(mnemonic.toString(), options);
  }

  /**
   * Restores a wallet from an encrypted serialization.
   *
   * @param password - The user provided password used to generate an encryption key via a KDF.
   *                 This is not normalized internally (see "Unicode normalization" to learn more).
   */
  public static async deserialize(
    serialization: string,
    password: string,
  ): Promise<SignArbSecp256k1HdWallet> {
    const parsed: unknown = JSON.parse(serialization);

    if (!isSerializationRoot(parsed)) {
      throw new Error(
        "Invalid serialization format: root document is not a valid object with type field.",
      );
    }

    if (parsed.type === serializationTypeV1) {
      return this.deserializeTypeV1(serialization, password);
    }
    throw new Error(`Unsupported serialization type: ${parsed.type}`);
  }

  /**
   * Restores a wallet from an encrypted serialization.
   *
   * This is an advanced alternative to calling `deserialize(serialization, password)` directly, which allows
   * you to offload the KDF execution to a non-UI thread (e.g. in a WebWorker).
   *
   * The caller is responsible for ensuring the key was derived with the given KDF configuration. This can be
   * done using `extractKdfConfiguration(serialization)` and `executeKdf(password, kdfConfiguration)` from this package.
   */
  public static async deserializeWithEncryptionKey(
    serialization: string,
    encryptionKey: Uint8Array,
  ): Promise<SignArbSecp256k1HdWallet> {
    const parsed: unknown = JSON.parse(serialization);

    if (!isEncryptedSerialization(parsed)) {
      throw new Error(
        "Invalid encrypted serialization format: missing required fields.",
      );
    }

    switch (parsed.type) {
      case serializationTypeV1: {
        const decryptedBytes = await decrypt(
          fromBase64(parsed.data),
          encryptionKey,
          parsed.encryption,
        );

        const decryptedParsed: unknown = JSON.parse(fromUtf8(decryptedBytes));

        if (!isDecryptedDocument(decryptedParsed)) {
          throw new Error(
            "Invalid decrypted document format: missing mnemonic or accounts.",
          );
        }

        const { mnemonic, accounts } = decryptedParsed;

        if (!Array.isArray(accounts)) {
          throw new Error("Property 'accounts' is not an array");
        }

        if (!accounts.every((account) => isDerivationJson(account))) {
          throw new Error("Account is not in the correct format.");
        }

        const firstPrefix = accounts[0].prefix;
        if (!accounts.every(({ prefix }) => prefix === firstPrefix)) {
          throw new Error("Accounts do not all have the same prefix");
        }

        const hdPaths = accounts.map(({ hdPath }: { hdPath: string }) =>
          stringToPath(hdPath),
        );

        return this.fromMnemonic(mnemonic.data, {
          hdPaths,
          prefix: firstPrefix,
        });
      }
      default:
        throw new Error(`Unsupported serialization type: ${parsed.type}`);
    }
  }

  private static async executeKdf(
    password: string,
    configuration: KdfConfiguration,
  ): Promise<Uint8Array> {
    switch (configuration.algorithm) {
      case "argon2id": {
        // React Native detection
        if (
          typeof global !== "undefined" &&
          global.navigator?.product === "ReactNative"
        ) {
          // Use injected crypto implementation
          const globalObj = global as Record<string, unknown>;
          const quickCrypto = globalObj.quickCrypto;

          if (!isQuickCrypto(quickCrypto)) {
            throw new Error(
              "quickCrypto not available globally, please install react-native-quick-crypto",
            );
          }

          // Validate outputLength is a number
          const outputLength = configuration.params.outputLength;
          if (typeof outputLength !== "number") {
            throw new Error(
              `Invalid outputLength: expected number, got ${typeof outputLength}`,
            );
          }

          return new Promise<Uint8Array>((resolve, reject) => {
            quickCrypto.pbkdf2(
              password,
              cosmjsSalt,
              100000,
              outputLength,
              "sha256",
              (err, key) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(key);
                }
              },
            );
          });
        }

        // CosmJS Argon2id
        const options = configuration.params;
        if (!isArgon2idOptions(options))
          throw new Error("Invalid format of argon2id params");
        return Argon2id.execute(password, cosmjsSalt, options);
      }
      default:
        throw new Error("Unsupported KDF algorithm");
    }
  }

  private static async deserializeTypeV1(
    serialization: string,
    password: string,
  ): Promise<SignArbSecp256k1HdWallet> {
    const parsed: unknown = JSON.parse(serialization);

    if (!isNonNullObject(parsed)) {
      throw new Error("Root document is not an object.");
    }

    const root = parsed as Record<string, unknown>;
    if (!isNonNullObject(root.kdf)) {
      throw new Error("Missing or invalid KDF configuration.");
    }

    const encryptionKey = await this.executeKdf(
      password,
      root.kdf as KdfConfiguration,
    );
    return this.deserializeWithEncryptionKey(serialization, encryptionKey);
  }

  private async getKeyPair(hdPath: HdPath): Promise<Secp256k1Keypair> {
    const { privkey } = Slip10.derivePath(
      Slip10Curve.Secp256k1,
      this.seed,
      hdPath,
    );
    const { pubkey } = await Secp256k1.makeKeypair(privkey);
    return {
      privkey,
      pubkey: Secp256k1.compressPubkey(pubkey),
    };
  }

  /**
   * Generates an encrypted serialization of this wallet.
   *
   * @param password The user provided password used to generate an encryption key via a KDF.
   *                 This is not normalized internally (see "Unicode normalization" to learn more).
   */
  async serialize(password: string) {
    const kdfConfiguration = basicPasswordHashingOptions;
    const encryptionKey = await SignArbSecp256k1HdWallet.executeKdf(
      password,
      kdfConfiguration,
    );
    return this.serializeWithEncryptionKey(encryptionKey, kdfConfiguration);
  }
  /**
   * Generates an encrypted serialization of this wallet.
   *
   * This is an advanced alternative to calling `serialize(password)` directly, which allows you to
   * offload the KDF execution to a non-UI thread (e.g. in a WebWorker).
   *
   * The caller is responsible for ensuring the key was derived with the given KDF options. If this
   * is not the case, the wallet cannot be restored with the original password.
   */
  async serializeWithEncryptionKey(
    encryptionKey: Uint8Array,
    kdfConfiguration: KdfConfiguration,
  ) {
    const dataToEncrypt = {
      mnemonic: this.secret,
      accounts: this.accounts.map(({ hdPath, prefix }) => ({
        hdPath: pathToString(hdPath),
        prefix: prefix,
      })),
    };
    const dataToEncryptRaw = toUtf8(JSON.stringify(dataToEncrypt));
    const encryptionConfiguration = {
      algorithm: supportedAlgorithms.xchacha20poly1305Ietf,
    };
    const encryptedData = await encrypt(
      dataToEncryptRaw,
      encryptionKey,
      encryptionConfiguration,
    );
    const out = {
      type: serializationTypeV1,
      kdf: kdfConfiguration,
      encryption: encryptionConfiguration,
      data: toBase64(encryptedData),
    };
    return JSON.stringify(out);
  }

  async getAccounts(): Promise<readonly AccountData[]> {
    const accountsWithPrivkeys = await this.getAccountsWithPrivkeys();
    return accountsWithPrivkeys.map(({ algo, pubkey, address }) => ({
      algo: algo,
      pubkey: pubkey,
      address: address,
    }));
  }

  private async getAccountsWithPrivkeys(): Promise<
    readonly AccountDataWithPrivkey[]
  > {
    return Promise.all(
      this.accounts.map(async ({ hdPath, prefix }) => {
        const { privkey, pubkey } = await this.getKeyPair(hdPath);
        const address = toBech32(
          prefix,
          rawSecp256k1PubkeyToRawAddress(pubkey),
        );
        return {
          algo: "secp256k1" as const,
          privkey,
          pubkey,
          address,
        };
      }) as readonly Promise<AccountDataWithPrivkey>[],
    );
  }

  async signDirect(signerAddress: string, signDoc: SignDoc) {
    const accounts = await this.getAccountsWithPrivkeys();
    const account = accounts.find(({ address }) => address === signerAddress);
    if (account === undefined) {
      throw new Error(`Address ${signerAddress} not found in wallet`);
    }
    const { privkey, pubkey } = account;
    const signBytes = makeSignBytes(signDoc);
    const hashedMessage = sha256(signBytes);
    const signature = await Secp256k1.createSignature(hashedMessage, privkey);
    const signatureBytes = new Uint8Array([
      ...signature.r(32),
      ...signature.s(32),
    ]);
    const stdSignature = encodeSecp256k1Signature(pubkey, signatureBytes);
    return {
      signed: signDoc,
      signature: stdSignature,
    };
  }

  signArb = async (
    signerAddress: string,
    message: string | Uint8Array,
  ): Promise<string> => {
    const accounts = await this.getAccountsWithPrivkeys();
    const account = accounts.find(({ address }) => address === signerAddress);
    if (account === undefined) {
      throw new Error(`Address ${signerAddress} not found in wallet`);
    }
    const { privkey } = account;
    const signDoc = makeADR36AminoSignDoc(signerAddress, message);
    const serializedSignDoc = serializeSignDoc(signDoc);

    const digest = new Sha256(serializedSignDoc).digest();
    const signature = await Secp256k1.createSignature(digest, privkey);

    return Buffer.from(
      new Uint8Array([...signature.r(32), ...signature.s(32)]),
    ).toString("base64");
  };
}
