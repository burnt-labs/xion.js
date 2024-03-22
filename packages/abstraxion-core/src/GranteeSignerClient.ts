import {
  SigningCosmWasmClient,
  type DeliverTxResponse,
  type SigningCosmWasmClientOptions,
} from "@cosmjs/cosmwasm-stargate";
import {
  AccountData,
  EncodeObject,
  OfflineSigner,
} from "@cosmjs/proto-signing";
import type {Account, SignerData, StdFee } from "@cosmjs/stargate";
import type { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import {
  Tendermint37Client,
  type HttpEndpoint,
  type TendermintClient,
} from "@cosmjs/tendermint-rpc";
import { customAccountFromAny } from "@burnt-labs/signers";

interface GranteeSignerOptions {
  readonly granterAddress: string;
  readonly granteeAddress: string;
}

export class GranteeSignerClient extends SigningCosmWasmClient {
  protected readonly granterAddress: string;
  private readonly _granteeAddress: string;
  private readonly _signer: OfflineSigner;

  public get granteeAddress(): string {
    return this._granteeAddress;
  }

  public async getGranteeAccountData(): Promise<AccountData | undefined> {
    return this._signer.getAccounts().then((accounts) => {
      for (const account of accounts) {
        if (account.address === this._granteeAddress) {
          return account;
        }
      }
    });
  }

  public static async connectWithSigner(
    endpoint: string | HttpEndpoint,
    signer: OfflineSigner,
    options: SigningCosmWasmClientOptions & GranteeSignerOptions,
  ): Promise<GranteeSignerClient> {
    const tmClient = await Tendermint37Client.connect(endpoint);
    return GranteeSignerClient.createWithSigner(tmClient, signer, options);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public static async createWithSigner(
    // Class extended from requires to be async.
    cometClient: TendermintClient,
    signer: OfflineSigner,
    options: SigningCosmWasmClientOptions & GranteeSignerOptions,
  ): Promise<GranteeSignerClient> {
    return new GranteeSignerClient(cometClient, signer, options);
  }

  protected constructor(
    cometClient: TendermintClient | undefined,
    signer: OfflineSigner,
    {
      granterAddress,
      granteeAddress,
      ...options
    }: SigningCosmWasmClientOptions & GranteeSignerOptions,
  ) {
    super(cometClient, signer, options);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (granterAddress === undefined) {
      // Enforce for Javascript.
      throw new Error("granterAddress is required");
    }
    this.granterAddress = granterAddress;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (granteeAddress === undefined) {
      // Enforce for Javascript.
      throw new Error("granteeAddress is required");
    }
    this._granteeAddress = granteeAddress;
    this._signer = signer;
  }

  public async getAccount(searchAddress: string): Promise<Account | null> {
    const account =
      await this.forceGetQueryClient().auth.account(searchAddress);
    if (!account) {
      return null;
    }
    return customAccountFromAny(account);
  }

  public async signAndBroadcast(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo = "",
  ): Promise<DeliverTxResponse> {
    // Figure out if the signerAddress is a granter
    let updatedSignerAddress = signerAddress;
    let updatedMessages = messages;
    if (signerAddress === this.granterAddress) {
      updatedSignerAddress = this.granteeAddress;
      // Wrap the signerAddress in a MsgExec
      updatedMessages = [
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgExec",
          value: MsgExec.fromPartial({
            grantee: this.granteeAddress,
            msgs: messages.map((msg) => this.registry.encodeAsAny(msg)),
          }),
        },
      ];
    }

    return super.signAndBroadcast(
      updatedSignerAddress,
      updatedMessages,
      fee,
      memo,
    );
  }

  public async sign(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    explicitSignerData?: SignerData,
  ): Promise<TxRaw> {
    // Figure out if the signerAddress is a granter
    let updatedSignerAddress = signerAddress;
    let updatedMessages = messages;
    if (signerAddress === this.granterAddress) {
      updatedSignerAddress = this.granteeAddress;
      // Wrap the signerAddress in a MsgExec
      updatedMessages = [
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgExec",
          value: MsgExec.fromPartial({
            grantee: updatedSignerAddress,
            msgs: messages.map((msg) => this.registry.encodeAsAny(msg)),
          }),
        },
      ];
    }

    return super.sign(
      updatedSignerAddress,
      updatedMessages,
      fee,
      memo,
      explicitSignerData,
    );
  }
}
