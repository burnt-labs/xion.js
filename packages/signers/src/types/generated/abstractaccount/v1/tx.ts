/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";
import { Coin } from "../../cosmos/base/v1beta1/coin";
import { Params } from "./params";

export const protobufPackage = "abstractaccount.v1";

export interface MsgUpdateParams {
  sender: string;
  params?: Params | undefined;
}

export interface MsgUpdateParamsResponse {
}

export interface MsgRegisterAccount {
  /** Sender is the actor who signs the message */
  sender: string;
  /** CodeID indicates which wasm binary code is to be used for this contract */
  codeId: Long;
  /** Msg is the JSON-encoded instantiate message for the contract */
  msg: Uint8Array;
  /** Funds are coins to be deposited to the contract on instantiattion */
  funds: Coin[];
  /**
   * Salt is an arbinary value to be used in deriving the account address.
   * Max 64 bytes.
   */
  salt: Uint8Array;
}

export interface MsgRegisterAccountResponse {
  address: string;
  data: Uint8Array;
}

function createBaseMsgUpdateParams(): MsgUpdateParams {
  return { sender: "", params: undefined };
}

export const MsgUpdateParams = {
  encode(message: MsgUpdateParams, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgUpdateParams {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.sender = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.params = Params.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgUpdateParams {
    return {
      sender: isSet(object.sender) ? globalThis.String(object.sender) : "",
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },

  toJSON(message: MsgUpdateParams): unknown {
    const obj: any = {};
    if (message.sender !== "") {
      obj.sender = message.sender;
    }
    if (message.params !== undefined) {
      obj.params = Params.toJSON(message.params);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgUpdateParams>, I>>(base?: I): MsgUpdateParams {
    return MsgUpdateParams.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgUpdateParams>, I>>(object: I): MsgUpdateParams {
    const message = createBaseMsgUpdateParams();
    message.sender = object.sender ?? "";
    message.params = (object.params !== undefined && object.params !== null)
      ? Params.fromPartial(object.params)
      : undefined;
    return message;
  },
};

function createBaseMsgUpdateParamsResponse(): MsgUpdateParamsResponse {
  return {};
}

export const MsgUpdateParamsResponse = {
  encode(_: MsgUpdateParamsResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgUpdateParamsResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParamsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(_: any): MsgUpdateParamsResponse {
    return {};
  },

  toJSON(_: MsgUpdateParamsResponse): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgUpdateParamsResponse>, I>>(base?: I): MsgUpdateParamsResponse {
    return MsgUpdateParamsResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgUpdateParamsResponse>, I>>(_: I): MsgUpdateParamsResponse {
    const message = createBaseMsgUpdateParamsResponse();
    return message;
  },
};

function createBaseMsgRegisterAccount(): MsgRegisterAccount {
  return { sender: "", codeId: Long.UZERO, msg: new Uint8Array(0), funds: [], salt: new Uint8Array(0) };
}

export const MsgRegisterAccount = {
  encode(message: MsgRegisterAccount, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.sender !== "") {
      writer.uint32(10).string(message.sender);
    }
    if (!message.codeId.isZero()) {
      writer.uint32(16).uint64(message.codeId);
    }
    if (message.msg.length !== 0) {
      writer.uint32(26).bytes(message.msg);
    }
    for (const v of message.funds) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    if (message.salt.length !== 0) {
      writer.uint32(42).bytes(message.salt);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgRegisterAccount {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRegisterAccount();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.sender = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.codeId = reader.uint64() as Long;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.msg = reader.bytes();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.funds.push(Coin.decode(reader, reader.uint32()));
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.salt = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgRegisterAccount {
    return {
      sender: isSet(object.sender) ? globalThis.String(object.sender) : "",
      codeId: isSet(object.codeId) ? Long.fromValue(object.codeId) : Long.UZERO,
      msg: isSet(object.msg) ? bytesFromBase64(object.msg) : new Uint8Array(0),
      funds: globalThis.Array.isArray(object?.funds) ? object.funds.map((e: any) => Coin.fromJSON(e)) : [],
      salt: isSet(object.salt) ? bytesFromBase64(object.salt) : new Uint8Array(0),
    };
  },

  toJSON(message: MsgRegisterAccount): unknown {
    const obj: any = {};
    if (message.sender !== "") {
      obj.sender = message.sender;
    }
    if (!message.codeId.isZero()) {
      obj.codeId = (message.codeId || Long.UZERO).toString();
    }
    if (message.msg.length !== 0) {
      obj.msg = base64FromBytes(message.msg);
    }
    if (message.funds?.length) {
      obj.funds = message.funds.map((e) => Coin.toJSON(e));
    }
    if (message.salt.length !== 0) {
      obj.salt = base64FromBytes(message.salt);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgRegisterAccount>, I>>(base?: I): MsgRegisterAccount {
    return MsgRegisterAccount.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgRegisterAccount>, I>>(object: I): MsgRegisterAccount {
    const message = createBaseMsgRegisterAccount();
    message.sender = object.sender ?? "";
    message.codeId = (object.codeId !== undefined && object.codeId !== null)
      ? Long.fromValue(object.codeId)
      : Long.UZERO;
    message.msg = object.msg ?? new Uint8Array(0);
    message.funds = object.funds?.map((e) => Coin.fromPartial(e)) || [];
    message.salt = object.salt ?? new Uint8Array(0);
    return message;
  },
};

function createBaseMsgRegisterAccountResponse(): MsgRegisterAccountResponse {
  return { address: "", data: new Uint8Array(0) };
}

export const MsgRegisterAccountResponse = {
  encode(message: MsgRegisterAccountResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgRegisterAccountResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRegisterAccountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.address = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.data = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MsgRegisterAccountResponse {
    return {
      address: isSet(object.address) ? globalThis.String(object.address) : "",
      data: isSet(object.data) ? bytesFromBase64(object.data) : new Uint8Array(0),
    };
  },

  toJSON(message: MsgRegisterAccountResponse): unknown {
    const obj: any = {};
    if (message.address !== "") {
      obj.address = message.address;
    }
    if (message.data.length !== 0) {
      obj.data = base64FromBytes(message.data);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MsgRegisterAccountResponse>, I>>(base?: I): MsgRegisterAccountResponse {
    return MsgRegisterAccountResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MsgRegisterAccountResponse>, I>>(object: I): MsgRegisterAccountResponse {
    const message = createBaseMsgRegisterAccountResponse();
    message.address = object.address ?? "";
    message.data = object.data ?? new Uint8Array(0);
    return message;
  },
};

export interface Msg {
  /** Update the module's parameters. Can only be called by the authority. */
  UpdateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
  /** Register a new AbstractAccount. */
  RegisterAccount(request: MsgRegisterAccount): Promise<MsgRegisterAccountResponse>;
}

export const MsgServiceName = "abstractaccount.v1.Msg";
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  private readonly service: string;
  constructor(rpc: Rpc, opts?: { service?: string }) {
    this.service = opts?.service || MsgServiceName;
    this.rpc = rpc;
    this.UpdateParams = this.UpdateParams.bind(this);
    this.RegisterAccount = this.RegisterAccount.bind(this);
  }
  UpdateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse> {
    const data = MsgUpdateParams.encode(request).finish();
    const promise = this.rpc.request(this.service, "UpdateParams", data);
    return promise.then((data) => MsgUpdateParamsResponse.decode(_m0.Reader.create(data)));
  }

  RegisterAccount(request: MsgRegisterAccount): Promise<MsgRegisterAccountResponse> {
    const data = MsgRegisterAccount.encode(request).finish();
    const promise = this.rpc.request(this.service, "RegisterAccount", data);
    return promise.then((data) => MsgRegisterAccountResponse.decode(_m0.Reader.create(data)));
  }
}

interface Rpc {
  request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
}

function bytesFromBase64(b64: string): Uint8Array {
  if (globalThis.Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = globalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(globalThis.String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(""));
  }
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Long ? string | number | Long : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
