/**
 * Authorization → revoke message-type mapping
 *
 * Pure helpers for translating an authz authorization `@type` into the message
 * type URL that a `MsgRevoke` must target in order to remove that grant.
 */

/** The authz `@type` for staking authorizations, handled specially below. */
export const STAKE_AUTHORIZATION_TYPE_URL =
  "/cosmos.staking.v1beta1.StakeAuthorization";

/**
 * Map of authorization `@type` → the msg type URL a `MsgRevoke` must target.
 *
 * Excludes `StakeAuthorization` (whose target depends on the authorization type)
 * and `GenericAuthorization` (whose target is the authorization's own `msg`
 * field, only known at runtime — callers handle that case before mapping).
 */
const REVOKE_MSG_TYPE_URL_BY_AUTHORIZATION: Record<string, string> = {
  "/cosmos.bank.v1beta1.SendAuthorization": "/cosmos.bank.v1beta1.MsgSend",
  "/cosmos.gov.v1beta1.VoteAuthorization": "/cosmos.gov.v1beta1.MsgVote",
  "/cosmos.gov.v1.VoteAuthorization": "/cosmos.gov.v1.MsgVote",
  "/ibc.applications.transfer.v1.TransferAuthorization":
    "/ibc.applications.transfer.v1.MsgTransfer",
  "/cosmwasm.wasm.v1.ContractExecutionAuthorization":
    "/cosmwasm.wasm.v1.MsgExecuteContract",
  "/cosmwasm.wasm.v1.ContractMigrationAuthorization":
    "/cosmwasm.wasm.v1.MsgMigrateContract",
  "/cosmos.distribution.v1beta1.SetWithdrawAddressAuthorization":
    "/cosmos.distribution.v1beta1.MsgSetWithdrawAddress",
};

/**
 * Map of staking authorization type → the msg type URL a `MsgRevoke` must
 * target. Keyed by both the enum name and its numeric proto value so either
 * representation from the chain/API resolves correctly.
 */
// NOTE: the `AUTHORIZATION_TYPE_*` keys below are plain object *string keys*,
// not references to an imported enum — an unquoted identifier in an object
// literal is just a string key. (They read unquoted because the repo's
// prettier `quoteProps: "as-needed"` strips quotes from identifier-shaped
// keys; the numeric keys stay quoted because they must.) Both the enum name
// and its numeric proto value are keyed so either representation the
// chain/API returns resolves.
const REVOKE_MSG_TYPE_URL_BY_STAKE_AUTH_TYPE: Record<string, string> = {
  AUTHORIZATION_TYPE_DELEGATE: "/cosmos.staking.v1beta1.MsgDelegate",
  "1": "/cosmos.staking.v1beta1.MsgDelegate",
  AUTHORIZATION_TYPE_UNDELEGATE: "/cosmos.staking.v1beta1.MsgUndelegate",
  "2": "/cosmos.staking.v1beta1.MsgUndelegate",
  AUTHORIZATION_TYPE_REDELEGATE: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
  "3": "/cosmos.staking.v1beta1.MsgBeginRedelegate",
};

/**
 * Resolve the message type URL a `MsgRevoke` must target to remove a grant of
 * the given authorization type.
 *
 * `MsgRevoke` identifies a grant by its `msgTypeUrl`, which is *not* the
 * authorization's own `@type` — e.g. revoking a `SendAuthorization` requires
 * `msgTypeUrl: "/cosmos.bank.v1beta1.MsgSend"`. This is a pure lookup over the
 * known authz authorization types.
 *
 * For `StakeAuthorization`, the target depends on the authorization's
 * `authorization_type`; pass it via `stakeAuthType` (accepts either the enum
 * name, e.g. `"AUTHORIZATION_TYPE_DELEGATE"`, or its numeric proto value, e.g.
 * `1` / `"1"`).
 *
 * For unrecognized inputs — including `GenericAuthorization`, whose revoke
 * target is its own runtime `msg` field — the `authorizationTypeUrl` is
 * returned unchanged so callers can decide how to handle it.
 *
 * @param authorizationTypeUrl - The authz authorization `@type`
 * @param stakeAuthType - Staking authorization type (enum name or numeric value); only used for `StakeAuthorization`
 * @returns The msg type URL to revoke, or `authorizationTypeUrl` if unmapped
 */
export function getMsgTypeUrlForRevoke(
  authorizationTypeUrl: string,
  stakeAuthType?: number | string,
): string {
  if (authorizationTypeUrl === STAKE_AUTHORIZATION_TYPE_URL) {
    const key = String(stakeAuthType ?? "");
    return REVOKE_MSG_TYPE_URL_BY_STAKE_AUTH_TYPE[key] ?? authorizationTypeUrl;
  }

  return (
    REVOKE_MSG_TYPE_URL_BY_AUTHORIZATION[authorizationTypeUrl] ??
    authorizationTypeUrl
  );
}
