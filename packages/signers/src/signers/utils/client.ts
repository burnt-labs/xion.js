import { bech32 } from "bech32";
import {
  TxRaw,
  AuthInfo,
  SignDoc,
  Fee,
} from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  GeneratedType,
  Registry,
  EncodeObject,
  DirectSignResponse,
} from "@cosmjs/proto-signing";
import {
  Account,
  calculateFee,
  createProtobufRpcClient,
  defaultRegistryTypes,
  DeliverTxResponse,
  GasPrice,
  SignerData,
  SigningStargateClientOptions,
  StdFee,
} from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { xionGasValues } from "@burnt-labs/constants";
import { MsgRegisterAccount } from "../../types/generated/abstractaccount/v1/tx";
import {
  abstractAccountTypes,
  MsgRegisterAccountEncodeObject,
  typeUrlMsgRegisterAccount,
} from "./messages";
import { customAccountFromAny, makeAAuthInfo } from ".";
import { AASigner } from "../../interfaces/AASigner";
import {
  SigningCosmWasmClient,
  wasmTypes,
  MsgExecuteContractEncodeObject,
} from "@cosmjs/cosmwasm-stargate";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import {
  AddAuthenticator,
  RemoveAuthenticator,
} from "../../interfaces/smartAccount";
import { Uint53 } from "@cosmjs/math";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import {
  ServiceClientImpl,
  SimulateRequest,
} from "cosmjs-types/cosmos/tx/v1beta1/service";

export const AADefaultRegistryTypes: ReadonlyArray<[string, GeneratedType]> = [
  ...defaultRegistryTypes,
  ...wasmTypes,
  ...abstractAccountTypes,
];
function createDefaultRegistry(): Registry {
  return new Registry(AADefaultRegistryTypes);
}

export class AAClient extends SigningCosmWasmClient {
  /// The signer used to crate AA signatures
  public abstractSigner: AASigner;
  public static async connectWithSigner(
    endpoint: string,
    signer: AASigner,
    options: SigningStargateClientOptions = {},
  ): Promise<AAClient> {
    const tmClient = await Tendermint37Client.connect(endpoint);
    return new AAClient(tmClient, signer, {
      registry: createDefaultRegistry(),
      ...options,
      accountParser: customAccountFromAny,
    });
  }

  protected constructor(
    tmClient: Tendermint37Client | undefined,
    signer: AASigner,
    options: SigningStargateClientOptions,
  ) {
    super(tmClient, signer, options);
    this.abstractSigner = signer;
  }

  /**
   * Creates a MsgRegisterAbstractAccount message and broadcasts it
   * @param msg the message to be sent
   * @returns
   */
  public async registerAbstractAccount(
    msg: MsgRegisterAccount,
  ): Promise<DeliverTxResponse> {
    const { sender } = msg;
    const createMsg: MsgRegisterAccountEncodeObject = {
      typeUrl: typeUrlMsgRegisterAccount,
      value: msg,
    };
    return this.signAndBroadcast(sender, [createMsg], "auto");
  }

  /**
   * Simulates a transaction to estimate the gas and calculates the default fee.
   *
   * @param {string} sender - The address of the sender.
   * @param {readonly EncodeObject[]} messages - An array of messages to include in the transaction.
   * @param {string | undefined} memo - An optional memo to include in the transaction.
   * @returns {Promise<StdFee>} - The calculated default fee for the transaction.
   */
  private async simulateDefaultFee(
    sender: string,
    messages: readonly EncodeObject[],
    memo: string | undefined,
  ): Promise<StdFee> {
    const {
      gasPrice: gasPriceString,
      gasAdjustment,
      gasAdjustmentMargin,
    } = xionGasValues;

    const simmedGas = await this.simulate(sender, messages, memo);
    const gasPrice = GasPrice.fromString(gasPriceString);
    const calculatedFee: StdFee = calculateFee(
      simmedGas * gasAdjustment,
      gasPrice,
    );

    let defaultFee: StdFee;
    let gas = (
      parseInt(calculatedFee.gas) * gasAdjustment +
      gasAdjustmentMargin
    ).toString();

    const chainId = await this.getChainId();

    if (/testnet/.test(chainId)) {
      defaultFee = { amount: [{ amount: "0", denom: "uxion" }], gas: gas };
    } else {
      defaultFee = { amount: calculatedFee.amount, gas: gas };
    }

    return defaultFee;
  }

  /**
   * Create and a cosmwasm add authenticator msg to the abstract account
   * @param msg the message to be sent
   * @returns
   */
  public async addAbstractAccountAuthenticator(
    msg: AddAuthenticator,
    memo = "",
    fee?: StdFee,
  ): Promise<DeliverTxResponse> {
    if (!this.abstractSigner.abstractAccount) {
      throw new Error("Abstract account address not set in signer");
    }
    const sender = this.abstractSigner.abstractAccount;
    const addMsg: MsgExecuteContractEncodeObject = {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender,
        contract: sender,
        msg: Buffer.from(JSON.stringify(msg), "utf-8"),
        funds: [],
      }),
    };

    const defaultFee = await this.simulateDefaultFee(sender, [addMsg], memo);

    const tx = await this.sign(sender, [addMsg], fee || defaultFee, memo);
    return this.broadcastTx(TxRaw.encode(tx).finish());
  }

  /**
   * Create a cosmwasm remove authenticator msg to the abstract account
   * @param msg the message to be sent
   * @returns
   */
  public async removeAbstractAccountAuthenticator(
    msg: RemoveAuthenticator,
    memo = "",
    fee?: StdFee,
  ): Promise<DeliverTxResponse> {
    if (!this.abstractSigner.abstractAccount) {
      throw new Error("Abstract account address not set in signer");
    }
    const sender = this.abstractSigner.abstractAccount;
    const addMsg: MsgExecuteContractEncodeObject = {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender,
        contract: sender,
        msg: Buffer.from(JSON.stringify(msg), "utf-8"),
        funds: [],
      }),
    };

    const defaultFee = await this.simulateDefaultFee(sender, [addMsg], memo);

    const tx = await this.sign(sender, [addMsg], fee || defaultFee, memo);
    return this.broadcastTx(TxRaw.encode(tx).finish());
  }

  /**
   * Simulates a transaction and returns the gas used.
   *
   * @param {string} signerAddress - The address of the signer.
   * @param {readonly EncodeObject[]} messages - An array of messages to include in the transaction.
   * @param {string | undefined} memo - An optional memo to include in the transaction.
   * @returns {Promise<number>} - The gas used by the simulated transaction.
   * @throws Will throw an error if the account is not found or if the query client cannot be retrieved.
   */
  public async simulate(
    signerAddress: string,
    messages: readonly EncodeObject[],
    memo: string | undefined,
  ): Promise<number> {
    const { sequence } = await this.getSequence(signerAddress);
    const accountFromSigner = (await this.abstractSigner.getAccounts()).find(
      (account) => account.address === signerAddress,
    );

    if (!accountFromSigner) {
      throw new Error("No account found.");
    }

    const pubKeyBytes = bech32.fromWords(
      bech32.decode(accountFromSigner.address).words,
    );

    const pubkey = Uint8Array.from(pubKeyBytes);

    const queryClient = this.getQueryClient();
    if (!queryClient) {
      throw new Error("Couldn't get query client");
    }

    const rpc = createProtobufRpcClient(queryClient);
    const queryService = new ServiceClientImpl(rpc);

    const authInfo = AuthInfo.fromPartial({
      fee: Fee.fromPartial({}),
      signerInfos: [
        {
          publicKey: {
            typeUrl: "/abstractaccount.v1.NilPubKey",
            value: new Uint8Array([10, 32, ...pubkey]), // a little hack to encode the pk into proto bytes
          },
          modeInfo: {
            single: {
              mode: SignMode.SIGN_MODE_DIRECT,
            },
          },
          sequence: BigInt(sequence),
        },
      ],
    });
    const authInfoBytes = AuthInfo.encode(authInfo).finish();

    const txBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: messages,
        memo: memo || "AA Gas Simulation",
      },
    };
    const bodyBytes = this.registry.encode(txBodyEncodeObject);

    const tx = TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
      signatures: [new Uint8Array()],
    });

    const request = SimulateRequest.fromPartial({
      txBytes: TxRaw.encode(tx).finish(),
    });

    const { gasInfo } = await queryService.Simulate(request);

    if (!gasInfo) {
      throw new Error("No gas info returned");
    }

    return Uint53.fromString(gasInfo.gasUsed.toString()).toNumber();
  }

  public async getAccount(searchAddress: string): Promise<Account | null> {
    const account =
      await this.forceGetQueryClient().auth.account(searchAddress);
    if (!account) {
      return null;
    }
    return customAccountFromAny(account);
  }

  /**
   * This method is a replacement of the sign method from SigningStargateClient
   * it uses the signDirect method from the custom signer(AASigner) to create the Abstract Account signature
   * required to verify the transaction on the chain and also builds the authInfoBytes using
   * the Abstract Account pubkey type NilPubKey
   * NB: This method is not compatible with regular signers. Use the sign method from SigningStargateClient
   * @param signerAddress // the abstract account address to be used as the signer
   * @param messages // the messages to be signed
   * @param fee
   * @param memo
   * @param explicitSignerData
   * @returns
   */
  public async sign(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    explicitSignerData?: SignerData,
  ): Promise<TxRaw> {
    const aaAcount = await this.getAccount(signerAddress);
    // we want to use the normal signingstargate client sign method if the signer is not an AASigner
    if (aaAcount && aaAcount.pubkey) {
      // this is a regular signer
      this.abstractSigner.abstractAccount = undefined;
      return super.sign(signerAddress, messages, fee, memo, explicitSignerData);
    }
    let signerData: SignerData;
    // Set the abstract account address
    if (!this.abstractSigner.abstractAccount) {
      this.abstractSigner.abstractAccount = signerAddress;
    }
    /// This check simply makes sure the signer is an AASigner and not a regular signer
    const accounts = await this.abstractSigner.getAccounts();
    const accountFromSigner = accounts.find(
      (account) =>
        account.authenticatorId ===
        this.abstractSigner.accountAuthenticatorIndex,
    );

    if (!accountFromSigner) {
      throw new Error("Failed to retrieve account from signer");
    }

    if (!aaAcount) {
      throw new Error("Failed to retrieve AA account from chain");
    }

    if (explicitSignerData) {
      signerData = explicitSignerData;
    } else {
      const { accountNumber, sequence } = aaAcount;
      const chainId = await this.getChainId();
      signerData = {
        accountNumber,
        sequence,
        chainId,
      };
    }

    const pubKeyBytes = bech32.fromWords(
      bech32.decode(accountFromSigner.address).words,
    );

    const txBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: messages,
        memo: memo,
      },
    };
    const authInfo = makeAAuthInfo(aaAcount, Uint8Array.from(pubKeyBytes), fee);
    const bodyBytes = this.registry.encode(txBodyEncodeObject);
    const authInfoBytes = AuthInfo.encode(authInfo).finish();

    const signDoc = SignDoc.fromPartial({
      bodyBytes,
      authInfoBytes,
      chainId: signerData.chainId,
      accountNumber: BigInt(aaAcount.accountNumber),
    });
    const signature = await this.abstractSigner
      .signDirect(accountFromSigner.accountAddress, signDoc)
      .then((sig: DirectSignResponse) => {
        // Append the authenticator ID
        return Buffer.from(
          new Uint8Array([
            accountFromSigner.authenticatorId,
            ...Buffer.from(sig.signature.signature, "base64"),
          ]),
        ).toString("base64");
      });

    return TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
      signatures: [Buffer.from(signature, "base64")],
    });
  }
}
