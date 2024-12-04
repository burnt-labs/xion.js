import { customAccountFromAny } from "@burnt-labs/signers";
import {
  DeliverTxResponse,
  SigningCosmWasmClient,
  SigningCosmWasmClientOptions,
} from "@cosmjs/cosmwasm-stargate";
import {
  AccountData,
  EncodeObject,
  encodePubkey,
  OfflineSigner,
} from "@cosmjs/proto-signing";
import {
  calculateFee,
  createProtobufRpcClient,
  GasPrice,
  type Account,
  type SignerData,
  type StdFee,
} from "@cosmjs/stargate";
import { AuthInfo, Fee, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import {
  HttpEndpoint,
  Tendermint37Client,
  TendermintClient,
} from "@cosmjs/tendermint-rpc";
import { Uint53 } from "@cosmjs/math";
import { encodeSecp256k1Pubkey } from "@cosmjs/amino";
import {
  ServiceClientImpl,
  SimulateRequest,
} from "cosmjs-types/cosmos/tx/v1beta1/service";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";

export interface GranteeSignerOptions {
  readonly granterAddress: string;
  readonly granteeAddress: string;
  readonly treasuryAddress?: string;
}

export class GranteeSignerClient extends SigningCosmWasmClient {
  protected readonly granterAddress: string;
  private readonly _granteeAddress: string;
  private readonly _signer: OfflineSigner;
  private readonly _gasPrice?: GasPrice;
  private readonly _treasury?: string;
  private readonly _defaultGasMultiplier = 1.4; // cosmjs 0.32.4 default

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
      granterAddress,
      granteeAddress,
      gasPrice,
      treasuryAddress,
      ...options
    }: SigningCosmWasmClientOptions & GranteeSignerOptions,
  ) {
    super(cometClient, signer, { ...options, gasPrice });
    if (granterAddress === undefined) {
      throw new Error("granterAddress is required");
    }
    this.granterAddress = granterAddress;

    if (granteeAddress === undefined) {
      throw new Error("granteeAddress is required");
    }
    this._granteeAddress = granteeAddress;
    this._gasPrice = gasPrice;
    this._treasury = treasuryAddress;
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

  public async simulate(
    signerAddress: string,
    messages: readonly EncodeObject[],
    memo: string | undefined,
    feeGranter?: string,
  ): Promise<number> {
    const { sequence } = await this.getSequence(signerAddress);
    const accountFromSigner = (await this._signer.getAccounts()).find(
      (account) => account.address === signerAddress,
    );

    if (!accountFromSigner) {
      throw new Error("No account found.");
    }

    const pubkey = encodeSecp256k1Pubkey(accountFromSigner.pubkey);

    const queryClient = this.getQueryClient();
    if (!queryClient) {
      throw new Error("Couldn't get query client");
    }

    const rpc = createProtobufRpcClient(queryClient);
    const queryService = new ServiceClientImpl(rpc);

    const authInfo = AuthInfo.fromPartial({
      fee: Fee.fromPartial({ granter: feeGranter }),
      signerInfos: [
        {
          publicKey: encodePubkey(pubkey),
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
        memo: memo,
      },
    };
    const bodyBytes = this.registry.encode(txBodyEncodeObject);

    const tx = TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
      signatures: [new Uint8Array([10])],
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

    let usedFee: StdFee;

    const granter = this._treasury ? this._treasury : this.granterAddress;

    if (fee == "auto" || typeof fee === "number") {
      if (!this._gasPrice) {
        throw new Error(
          "Gas price must be set in the client options when auto gas is used",
        );
      }
      const gasEstimation = await this.simulate(
        signerAddress,
        messages,
        memo,
        granter,
      );
      const multiplier =
        typeof fee == "number" ? fee : this._defaultGasMultiplier;
      const calculatedFee = calculateFee(
        Math.round(gasEstimation * multiplier),
        this._gasPrice,
      );

      usedFee = {
        ...calculatedFee,
        granter,
      };
    } else {
      usedFee = { ...fee, granter };
    }

    const txRaw = await this.sign(
      signerAddress,
      messages,
      usedFee,
      memo,
      undefined,
    );
    const txBytes = TxRaw.encode(txRaw).finish();
    return this.broadcastTx(
      txBytes,
      this.broadcastTimeoutMs,
      this.broadcastPollIntervalMs,
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
