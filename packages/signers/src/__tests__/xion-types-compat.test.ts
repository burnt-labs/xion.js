/**
 * Type compatibility test: verifies xion-types aligns with cosmjs boundaries.
 *
 * Checks:
 * 1. xion-specific types (AbstractAccount, MsgRegisterAccount) import cleanly from xion-types
 * 2. cosmjs boundary types (SignDoc, TxRaw, etc.) come from cosmjs-types and are bigint-native
 * 3. AASigner implements OfflineDirectSigner correctly
 */

import type { OfflineDirectSigner } from "@cosmjs/proto-signing";
import { SignDoc, TxRaw, AuthInfo, Fee } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";

// xion-specific — must come from xion-types
import type { AbstractAccount } from "@burnt-labs/xion-types/abstractaccount/v1/account";
import type { MsgRegisterAccount } from "@burnt-labs/xion-types/abstractaccount/v1/tx";

// --- cosmjs boundary types use bigint (not Long) ---

function assertBigint(value: bigint): bigint {
  return value;
}

function checkSignDocFields(doc: SignDoc): void {
  // accountNumber must be bigint in cosmjs-types — this will fail to compile if it's Long
  assertBigint(doc.accountNumber);
}

function checkFeeFields(fee: Fee): void {
  assertBigint(fee.gasLimit);
}

function checkAuthInfoFields(info: AuthInfo): void {
  // AuthInfo.fee.gasLimit is bigint
  if (info.fee) {
    assertBigint(info.fee.gasLimit);
  }
}

// --- xion-specific types are present ---

function checkAbstractAccount(aa: AbstractAccount): void {
  const _addr: string = aa.address;
  const _codeId: bigint = aa.codeId;
}

function checkMsgRegisterAccount(msg: MsgRegisterAccount): void {
  const _sender: string = msg.sender;
  const _codeId: bigint = msg.codeId;
  const _msg: Uint8Array = msg.msg;
}

// --- AASigner satisfies OfflineDirectSigner ---

import { AASigner } from "../interfaces/AASigner";

// AASigner must structurally satisfy OfflineDirectSigner
type _AssertAASignerIsOfflineDirectSigner = AASigner extends OfflineDirectSigner ? true : never;
const _check: _AssertAASignerIsOfflineDirectSigner = true;

// --- SignMode values accessible ---

const _signModeDirect: SignMode = SignMode.SIGN_MODE_DIRECT;
const _signModeUnspecified: SignMode = SignMode.SIGN_MODE_UNSPECIFIED;

// Dummy test so jest doesn't complain about no tests
describe("xion-types cosmjs compatibility", () => {
  it("SignDoc.accountNumber is bigint-typed (cosmjs-types)", () => {
    const doc: SignDoc = {
      bodyBytes: new Uint8Array(),
      authInfoBytes: new Uint8Array(),
      chainId: "xion-testnet-2",
      accountNumber: 42n,
    };
    expect(typeof doc.accountNumber).toBe("bigint");
  });

  it("Fee.gasLimit is bigint-typed (cosmjs-types)", () => {
    const fee: Fee = {
      amount: [],
      gasLimit: 200000n,
      payer: "",
      granter: "",
    };
    expect(typeof fee.gasLimit).toBe("bigint");
  });

  it("MsgRegisterAccount has expected shape (xion-types)", () => {
    const msg: MsgRegisterAccount = {
      sender: "xion1test",
      codeId: 1n,
      msg: new Uint8Array(),
      funds: [],
      salt: new Uint8Array(),
    };
    expect(msg.sender).toBe("xion1test");
    expect(typeof msg.codeId).toBe("bigint");
  });
});
