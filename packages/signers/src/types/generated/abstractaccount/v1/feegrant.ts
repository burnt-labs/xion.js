/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { Any } from "../../google/protobuf/any";

export const protobufPackage = "xion.v1";

/** AuthzAllowance creates allowance only authz message for a specific grantee */
export interface AuthzAllowance {
  /** allowance can be any of basic and periodic fee allowance. */
  allowance: Any | undefined;
  authzGrantee: string;
}

/** ContractsAllowance creates allowance only for specific contracts */
export interface ContractsAllowance {
  /** allowance can be any allowance interface type. */
  allowance: Any | undefined;
  contractAddresses: string[];
}

/** MultiAnyAllowance creates an allowance that pays if any of the internal allowances are met */
export interface MultiAnyAllowance {
  /** allowance can be any allowance interface type. */
  allowances: Any[];
}

function createBaseAuthzAllowance(): AuthzAllowance {
  return { allowance: undefined, authzGrantee: "" };
}

export const AuthzAllowance = {
  encode(
    message: AuthzAllowance,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.allowance !== undefined) {
      Any.encode(message.allowance, writer.uint32(10).fork()).ldelim();
    }
    if (message.authzGrantee !== "") {
      writer.uint32(18).string(message.authzGrantee);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AuthzAllowance {
    const reader =
      input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAuthzAllowance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.allowance = Any.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.authzGrantee = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AuthzAllowance {
    return {
      allowance: isSet(object.allowance)
        ? Any.fromJSON(object.allowance)
        : undefined,
      authzGrantee: isSet(object.authzGrantee)
        ? globalThis.String(object.authzGrantee)
        : "",
    };
  },

  toJSON(message: AuthzAllowance): unknown {
    const obj: any = {};
    if (message.allowance !== undefined) {
      obj.allowance = Any.toJSON(message.allowance);
    }
    if (message.authzGrantee !== "") {
      obj.authzGrantee = message.authzGrantee;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AuthzAllowance>, I>>(
    base?: I,
  ): AuthzAllowance {
    return AuthzAllowance.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<AuthzAllowance>, I>>(
    object: I,
  ): AuthzAllowance {
    const message = createBaseAuthzAllowance();
    message.allowance =
      object.allowance !== undefined && object.allowance !== null
        ? Any.fromPartial(object.allowance)
        : undefined;
    message.authzGrantee = object.authzGrantee ?? "";
    return message;
  },
};

function createBaseContractsAllowance(): ContractsAllowance {
  return { allowance: undefined, contractAddresses: [] };
}

export const ContractsAllowance = {
  encode(
    message: ContractsAllowance,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.allowance !== undefined) {
      Any.encode(message.allowance, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.contractAddresses) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ContractsAllowance {
    const reader =
      input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseContractsAllowance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.allowance = Any.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.contractAddresses.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ContractsAllowance {
    return {
      allowance: isSet(object.allowance)
        ? Any.fromJSON(object.allowance)
        : undefined,
      contractAddresses: globalThis.Array.isArray(object?.contractAddresses)
        ? object.contractAddresses.map((e: any) => globalThis.String(e))
        : [],
    };
  },

  toJSON(message: ContractsAllowance): unknown {
    const obj: any = {};
    if (message.allowance !== undefined) {
      obj.allowance = Any.toJSON(message.allowance);
    }
    if (message.contractAddresses?.length) {
      obj.contractAddresses = message.contractAddresses;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ContractsAllowance>, I>>(
    base?: I,
  ): ContractsAllowance {
    return ContractsAllowance.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ContractsAllowance>, I>>(
    object: I,
  ): ContractsAllowance {
    const message = createBaseContractsAllowance();
    message.allowance =
      object.allowance !== undefined && object.allowance !== null
        ? Any.fromPartial(object.allowance)
        : undefined;
    message.contractAddresses = object.contractAddresses?.map((e) => e) || [];
    return message;
  },
};

function createBaseMultiAnyAllowance(): MultiAnyAllowance {
  return { allowances: [] };
}

export const MultiAnyAllowance = {
  encode(
    message: MultiAnyAllowance,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    for (const v of message.allowances) {
      Any.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MultiAnyAllowance {
    const reader =
      input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMultiAnyAllowance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.allowances.push(Any.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MultiAnyAllowance {
    return {
      allowances: globalThis.Array.isArray(object?.allowances)
        ? object.allowances.map((e: any) => Any.fromJSON(e))
        : [],
    };
  },

  toJSON(message: MultiAnyAllowance): unknown {
    const obj: any = {};
    if (message.allowances?.length) {
      obj.allowances = message.allowances.map((e) => Any.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MultiAnyAllowance>, I>>(
    base?: I,
  ): MultiAnyAllowance {
    return MultiAnyAllowance.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MultiAnyAllowance>, I>>(
    object: I,
  ): MultiAnyAllowance {
    const message = createBaseMultiAnyAllowance();
    message.allowances =
      object.allowances?.map((e) => Any.fromPartial(e)) || [];
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

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
