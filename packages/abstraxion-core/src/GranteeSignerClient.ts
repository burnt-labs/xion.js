import {
  DeliverTxResponse,
  SigningCosmWasmClient,
  SigningCosmWasmClientOptions,
} from "@cosmjs/cosmwasm-stargate";
import {
  AccountData,
  EncodeObject,
  OfflineSigner,
} from "@cosmjs/proto-signing";
import {
  calculateFee,
  GasPrice,
  type Account,
  type SignerData,
  type StdFee,
} from "@cosmjs/stargate";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import {
  HttpEndpoint,
  Tendermint37Client,
  TendermintClient,
} from "@cosmjs/tendermint-rpc";
import { customAccountFromAny } from "@burnt-labs/signers";
import { xionGasValues } from "@burnt-labs/constants";

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
    fee: StdFee | "auto" | number = "auto",
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
    const {
      gasPrice: gasPriceString,
      gasAdjustment,
      gasAdjustmentMargin,
    } = xionGasValues;
    if (fee == "auto" || typeof fee === "number") {
      const gasEstimation = await this.simulate(signerAddress, messages, memo);
      const multiplier = typeof fee == "number" ? fee : gasAdjustment;
      const gasPrice = GasPrice.fromString(gasPriceString);
      // usedFee = calculateFee(Math.round(gasEstimation * multiplier), gasPrice);
      const calculatedFee = calculateFee(gasEstimation, gasPrice);
      let gas = Math.ceil(
        parseInt(calculatedFee.gas) * multiplier + gasAdjustmentMargin,
      ).toString();

      const chainId = await this.getChainId();
      if (/testnet/.test(chainId)) {
        usedFee = { amount: [{ amount: "0", denom: "uxion" }], gas };
      } else {
        usedFee = { amount: calculatedFee.amount, gas };
      }
    } else {
      usedFee = fee;
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
