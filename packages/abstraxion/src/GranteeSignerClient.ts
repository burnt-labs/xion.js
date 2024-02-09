import type {
  DeliverTxResponse,
  SigningCosmWasmClientOptions,
} from "@cosmjs/cosmwasm-stargate";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import type { EncodeObject, OfflineSigner } from "@cosmjs/proto-signing";
import type { Account, SignerData, StdFee } from "@cosmjs/stargate";
import type { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import type { HttpEndpoint, TendermintClient } from "@cosmjs/tendermint-rpc";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { customAccountFromAny } from "@burnt-labs/signers";

interface GranteeSignerOptions {
  readonly granterAddress: string;
  readonly granteeAddress: string;
}

export class GranteeSignerClient extends SigningCosmWasmClient {
  protected readonly granterAddress: string;
  private _granteeAddress: string;

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
    if (granterAddress === undefined) {
      throw new Error("granterAddress is required");
    }
    this.granterAddress = granterAddress;

    if (granteeAddress === undefined) {
      throw new Error("granteeAddress is required");
    }
    this._granteeAddress = granteeAddress;
  }

  get granteeAddress(): string {
    return this._granteeAddress;
  }

  public static async connectWithSigner(
    endpoint: string | HttpEndpoint,
    signer: OfflineSigner,
    options: SigningCosmWasmClientOptions & GranteeSignerOptions,
  ): Promise<GranteeSignerClient> {
    const tmClient = await Tendermint37Client.connect(endpoint);
    return GranteeSignerClient.createWithSigner(tmClient, signer, options);
  }

  public static async createWithSigner(
    cometClient: TendermintClient,
    signer: OfflineSigner,
    options: SigningCosmWasmClientOptions & GranteeSignerOptions,
  ): Promise<GranteeSignerClient> {
    return new GranteeSignerClient(cometClient, signer, options);
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
    if (signerAddress === this.granterAddress) {
      signerAddress = this.granteeAddress;
      // Wrap the signerAddress in a MsgExec
      messages = [
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgExec",
          value: MsgExec.fromPartial({
            grantee: this.granteeAddress,
            msgs: messages.map((msg) => this.registry.encodeAsAny(msg)),
          }),
        },
      ];
    }

    return super.signAndBroadcast(signerAddress, messages, fee, memo);
  }

  public async sign(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    explicitSignerData?: SignerData,
  ): Promise<TxRaw> {
    // Figure out if the signerAddress is a granter
    if (signerAddress === this.granterAddress) {
      signerAddress = this.granteeAddress;
      // Wrap the signerAddress in a MsgExec
      messages = [
        {
          typeUrl: "/cosmos.authz.v1beta1.MsgExec",
          value: MsgExec.fromPartial({
            grantee: signerAddress,
            msgs: messages.map((msg) => this.registry.encodeAsAny(msg)),
          }),
        },
      ];
    }

    return super.sign(signerAddress, messages, fee, memo, explicitSignerData);
  }
}
