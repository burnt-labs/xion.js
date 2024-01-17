import {
  DeliverTxResponse,
  SigningCosmWasmClient,
  SigningCosmWasmClientOptions,
} from "@cosmjs/cosmwasm-stargate";
import { EncodeObject, OfflineSigner } from "@cosmjs/proto-signing";
import { SignerData, StdFee } from "@cosmjs/stargate";
import type { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import {
  HttpEndpoint,
  Tendermint37Client,
  TendermintClient,
} from "@cosmjs/tendermint-rpc";

interface GranteeSignerOptions {
  readonly grantorAddress: string;
  readonly granteeAddress: string;
}

export class GranteeSignerClient extends SigningCosmWasmClient {
  protected readonly grantorAddress: string;
  protected readonly granteeAddress: string;

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

  protected constructor(
    cometClient: TendermintClient | undefined,
    signer: OfflineSigner,
    {
      grantorAddress,
      granteeAddress,
      ...options
    }: SigningCosmWasmClientOptions & GranteeSignerOptions,
  ) {
    super(cometClient, signer, options);
    if (grantorAddress === undefined) {
      throw new Error("grantorAddress is required");
    }
    this.grantorAddress = grantorAddress;

    if (granteeAddress === undefined) {
      throw new Error("granteeAddress is required");
    }
    this.granteeAddress = granteeAddress;
  }

  public async signAndBroadcast(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | "auto" | number,
    memo = "",
  ): Promise<DeliverTxResponse> {
    // Figure out if the signerAddress is a grantor
    if (signerAddress === this.grantorAddress) {
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
    // Figure out if the signerAddress is a grantor
    if (signerAddress === this.grantorAddress) {
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
