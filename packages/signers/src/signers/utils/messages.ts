import {
  MsgRegisterAccount,
  MsgRegisterAccountResponse,
} from "./../../types/generated/abstractaccount/v1/tx";
import { GeneratedType, EncodeObject } from "@cosmjs/proto-signing";

export const typeUrlMsgRegisterAccount =
  "/abstractaccount.v1.MsgRegisterAccount";
export const typeUrlMsgRegisterAccountResponse =
  "/abstractaccount.v1.MsgRegisterAccountResponse";

export const abstractAccountTypes: ReadonlyArray<[string, GeneratedType]> = [
  [typeUrlMsgRegisterAccount, MsgRegisterAccount],
  [typeUrlMsgRegisterAccountResponse, MsgRegisterAccountResponse],
];

export interface MsgRegisterAccountEncodeObject extends EncodeObject {
  readonly typeUrl: "/abstractaccount.v1.MsgRegisterAccount";
  readonly value: Partial<MsgRegisterAccount>;
}

export function isMsgRegisterAccount(
  encodeObject: EncodeObject,
): encodeObject is MsgRegisterAccountEncodeObject {
  return (
    (encodeObject as MsgRegisterAccountEncodeObject).typeUrl ===
    typeUrlMsgRegisterAccount
  );
}

export interface MsgRegisterAccountResponseEncodeObject {
  readonly typeUrl: "/abstractaccount.v1.MsgRegisterAccountResponse";
  readonly value: Partial<MsgRegisterAccountResponse>;
}

export function isMsgRegisterAccountResponse(
  encodeObject: EncodeObject,
): encodeObject is MsgRegisterAccountResponseEncodeObject {
  return (
    (encodeObject as MsgRegisterAccountResponseEncodeObject).typeUrl ===
    typeUrlMsgRegisterAccountResponse
  );
}
