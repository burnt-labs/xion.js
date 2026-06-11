---
"@burnt-labs/account-management": minor
---

feat(account-management): add `getMsgTypeUrlForRevoke(authorizationTypeUrl, stakeAuthType?)` pure helper in `grants/` (exported from `@burnt-labs/account-management`). Maps an authz authorization `@type` to the `MsgRevoke`-able msg type URL, including the `StakeAuthorization` delegate/undelegate/redelegate variants (keyed by enum name or numeric proto value). Lets dashboard/xion-app consumers drop their local copies.
