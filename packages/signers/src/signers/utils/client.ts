import { bech32 } from "bech32";
import { TxRaw, AuthInfo, SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  GeneratedType,
  Registry,
  EncodeObject,
  DirectSignResponse,
  makeSignBytes,
} from "@cosmjs/proto-signing";
import {
  Account,
  defaultRegistryTypes,
  DeliverTxResponse,
  SignerData,
  SigningStargateClientOptions,
  StdFee,
} from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
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
   * Create and a cosmwasm add authenticator msg to the abstract account
   * @param msg the message to be sent
   * @returns
   */
  public async addAbstractAccountAuthenticator(
    msg: AddAuthenticator,
    memo = "",
    fee: StdFee,
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
    const tx = await this.sign(sender, [addMsg], fee, memo);
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
    fee: StdFee,
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
    const tx = await this.sign(sender, [addMsg], fee, memo);
    return this.broadcastTx(TxRaw.encode(tx).finish());
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
