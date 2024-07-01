import { GeneratedType, OfflineSigner, Registry } from "@cosmjs/proto-signing";
import {
  Account,
  defaultRegistryTypes,
  DeliverTxResponse,
  SigningStargateClient,
  SigningStargateClientOptions,
  StdFee,
} from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import {
  abstractAccountTypes,
  MsgRegisterAccountEncodeObject,
  typeUrlMsgRegisterAccount,
} from "./messages";
import { MsgRegisterAccount } from "../../types/generated/abstractaccount/v1/tx";
import { SigningCosmWasmClient, wasmTypes } from "@cosmjs/cosmwasm-stargate";
import { customAccountFromAny } from "./index.ts";

export const AADefaultRegistryTypes: Readonly<[string, GeneratedType][]> = [
  ...defaultRegistryTypes,
  ...wasmTypes,
  ...abstractAccountTypes,
];
function createDefaultRegistry(): Registry {
  return new Registry(AADefaultRegistryTypes);
}

/*
 * This Client is used to interact with the chain using a standard offline signer.
 * */
export class BaseAccountClient extends SigningStargateClient {
  public static async connectWithSigner(
    endpoint: string,
    signer: OfflineSigner,
    options: SigningStargateClientOptions = {},
  ): Promise<BaseAccountClient> {
    const tmClient = await Tendermint37Client.connect(endpoint);
    return new BaseAccountClient(tmClient, signer, {
      registry: createDefaultRegistry(),
      accountParser: customAccountFromAny,
      ...options,
    });
  }

  protected constructor(
    tmClient: Tendermint37Client | undefined,
    signer: OfflineSigner,
    options: SigningStargateClientOptions,
  ) {
    super(tmClient, signer, options);
  }

  public async registerAbstractAccount(
    msg: MsgRegisterAccount,
    fee: StdFee | "auto" | number,
  ): Promise<DeliverTxResponse> {
    const { sender } = msg;
    const createMsg: MsgRegisterAccountEncodeObject = {
      typeUrl: typeUrlMsgRegisterAccount,
      value: msg,
    };
    return this.signAndBroadcast(sender, [createMsg], fee);
  }
}

export class BaseAccountSigningCosmWasmClient extends SigningCosmWasmClient {
  public static async connectWithSigner(
    endpoint: string,
    signer: OfflineSigner,
    options: SigningStargateClientOptions = {},
  ): Promise<BaseAccountSigningCosmWasmClient> {
    const tmClient = await Tendermint37Client.connect(endpoint);
    return new BaseAccountSigningCosmWasmClient(tmClient, signer, {
      accountParser: customAccountFromAny,
      ...options,
    });
  }

  protected constructor(
    tmClient: Tendermint37Client | undefined,
    signer: OfflineSigner,
    options: SigningStargateClientOptions,
  ) {
    super(tmClient, signer, options);
  }

  public async getAccount(searchAddress: string): Promise<Account | null> {
    try {
      const account =
        await this.forceGetQueryClient().auth.account(searchAddress);
      return account ? customAccountFromAny(account) : null;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (/rpc error: code = NotFound/i.test(error.toString())) {
          return null;
        }
      }

      throw error;
    }
  }
}
