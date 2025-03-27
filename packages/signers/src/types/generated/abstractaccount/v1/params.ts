/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "abstractaccount.v1";

export interface Params {
  /**
   * AllowAllCodeIDs determines whether a Wasm code ID can be used to register
   * AbstractAccounts:
   * - if set to true, any code ID can be used;
   * - if set to false, only code IDs whitelisted in the AllowedCodeIDs list can
   * be used.
   */
  allowAllCodeIds: boolean;
  /**
   * AllowedCodeIDs is the whitelist of Wasm code IDs that can be used to
   * regiseter AbstractAccounts.
   */
  allowedCodeIds: Long[];
  /**
   * MaxGasBefore is the maximum amount of gas that can be consumed by the
   * contract call in the before_tx decorator.
   *
   * Must be greater than zero.
   */
  maxGasBefore: Long;
  /**
   * MaxGasAfter is the maximum amount of gas that can be consumed by the
   * contract call in the after_tx decorator.
   *
   * Must be greater than zero.
   */
  maxGasAfter: Long;
}

function createBaseParams(): Params {
  return {
    allowAllCodeIds: false,
    allowedCodeIds: [],
    maxGasBefore: Long.UZERO,
    maxGasAfter: Long.UZERO,
  };
}

export const Params = {
  encode(
    message: Params,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.allowAllCodeIds === true) {
      writer.uint32(8).bool(message.allowAllCodeIds);
    }
    writer.uint32(18).fork();
    for (const v of message.allowedCodeIds) {
      writer.uint64(v);
    }
    writer.ldelim();
    if (!message.maxGasBefore.isZero()) {
      writer.uint32(24).uint64(message.maxGasBefore);
    }
    if (!message.maxGasAfter.isZero()) {
      writer.uint32(32).uint64(message.maxGasAfter);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Params {
    const reader =
      input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.allowAllCodeIds = reader.bool();
          continue;
        case 2:
          if (tag === 16) {
            message.allowedCodeIds.push(reader.uint64() as Long);

            continue;
          }

          if (tag === 18) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.allowedCodeIds.push(reader.uint64() as Long);
            }

            continue;
          }

          break;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.maxGasBefore = reader.uint64() as Long;
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.maxGasAfter = reader.uint64() as Long;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Params {
    return {
      allowAllCodeIds: isSet(object.allowAllCodeIds)
        ? globalThis.Boolean(object.allowAllCodeIds)
        : false,
      allowedCodeIds: globalThis.Array.isArray(object?.allowedCodeIds)
        ? object.allowedCodeIds.map((e: any) => Long.fromValue(e))
        : [],
      maxGasBefore: isSet(object.maxGasBefore)
        ? Long.fromValue(object.maxGasBefore)
        : Long.UZERO,
      maxGasAfter: isSet(object.maxGasAfter)
        ? Long.fromValue(object.maxGasAfter)
        : Long.UZERO,
    };
  },

  toJSON(message: Params): unknown {
    const obj: any = {};
    if (message.allowAllCodeIds === true) {
      obj.allowAllCodeIds = message.allowAllCodeIds;
    }
    if (message.allowedCodeIds?.length) {
      obj.allowedCodeIds = message.allowedCodeIds.map((e) =>
        (e || Long.UZERO).toString(),
      );
    }
    if (!message.maxGasBefore.isZero()) {
      obj.maxGasBefore = (message.maxGasBefore || Long.UZERO).toString();
    }
    if (!message.maxGasAfter.isZero()) {
      obj.maxGasAfter = (message.maxGasAfter || Long.UZERO).toString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Params>, I>>(base?: I): Params {
    return Params.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Params>, I>>(object: I): Params {
    const message = createBaseParams();
    message.allowAllCodeIds = object.allowAllCodeIds ?? false;
    message.allowedCodeIds =
      object.allowedCodeIds?.map((e) => Long.fromValue(e)) || [];
    message.maxGasBefore =
      object.maxGasBefore !== undefined && object.maxGasBefore !== null
        ? Long.fromValue(object.maxGasBefore)
        : Long.UZERO;
    message.maxGasAfter =
      object.maxGasAfter !== undefined && object.maxGasAfter !== null
        ? Long.fromValue(object.maxGasAfter)
        : Long.UZERO;
    return message;
  },
};

type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Long
  ? string | number | Long
  : T extends globalThis.Array<infer U>
  ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & {
      [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
    };

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
