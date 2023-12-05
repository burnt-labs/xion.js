/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "abstractaccount.v1";

/**
 * AbstractAccount is a smart contract that is capable of initiating txs.
 *
 * This account type is similar to BaseAccount except for it doesn't have a
 * pubkey. If a pubkey is needed, it creates and returns a new NilPubKey.
 */
export interface AbstractAccount {
  address: string;
  accountNumber: Long;
  sequence: Long;
}

/**
 * NilPubKey is the pubkey type of the AbstractAccount. Basically, it represents
 * a pubkey that doesn't exist.
 *
 * The actual pubkey of an AbstractAccount (if it has one) is to be stored
 * inside the contract, not at the SDK level. Signature verification is also
 * done inside the contract, typically in the BeforeTx hook.
 */
export interface NilPubKey {
  addressBytes: Uint8Array;
}

function createBaseAbstractAccount(): AbstractAccount {
  return { address: "", accountNumber: Long.UZERO, sequence: Long.UZERO };
}

export const AbstractAccount = {
  encode(message: AbstractAccount, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    if (!message.accountNumber.isZero()) {
      writer.uint32(16).uint64(message.accountNumber);
    }
    if (!message.sequence.isZero()) {
      writer.uint32(24).uint64(message.sequence);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AbstractAccount {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAbstractAccount();
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
          if (tag !== 16) {
            break;
          }

          message.accountNumber = reader.uint64() as Long;
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.sequence = reader.uint64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AbstractAccount {
    return {
      address: isSet(object.address) ? globalThis.String(object.address) : "",
      accountNumber: isSet(object.accountNumber) ? Long.fromValue(object.accountNumber) : Long.UZERO,
      sequence: isSet(object.sequence) ? Long.fromValue(object.sequence) : Long.UZERO,
    };
  },

  toJSON(message: AbstractAccount): unknown {
    const obj: any = {};
    if (message.address !== "") {
      obj.address = message.address;
    }
    if (!message.accountNumber.isZero()) {
      obj.accountNumber = (message.accountNumber || Long.UZERO).toString();
    }
    if (!message.sequence.isZero()) {
      obj.sequence = (message.sequence || Long.UZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AbstractAccount>, I>>(base?: I): AbstractAccount {
    return AbstractAccount.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<AbstractAccount>, I>>(object: I): AbstractAccount {
    const message = createBaseAbstractAccount();
    message.address = object.address ?? "";
    message.accountNumber = (object.accountNumber !== undefined && object.accountNumber !== null)
      ? Long.fromValue(object.accountNumber)
      : Long.UZERO;
    message.sequence = (object.sequence !== undefined && object.sequence !== null)
      ? Long.fromValue(object.sequence)
      : Long.UZERO;
    return message;
  },
};

function createBaseNilPubKey(): NilPubKey {
  return { addressBytes: new Uint8Array(0) };
}

export const NilPubKey = {
  encode(message: NilPubKey, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.addressBytes.length !== 0) {
      writer.uint32(10).bytes(message.addressBytes);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): NilPubKey {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNilPubKey();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.addressBytes = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): NilPubKey {
    return { addressBytes: isSet(object.addressBytes) ? bytesFromBase64(object.addressBytes) : new Uint8Array(0) };
  },

  toJSON(message: NilPubKey): unknown {
    const obj: any = {};
    if (message.addressBytes.length !== 0) {
      obj.addressBytes = base64FromBytes(message.addressBytes);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<NilPubKey>, I>>(base?: I): NilPubKey {
    return NilPubKey.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<NilPubKey>, I>>(object: I): NilPubKey {
    const message = createBaseNilPubKey();
    message.addressBytes = object.addressBytes ?? new Uint8Array(0);
    return message;
  },
};

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
