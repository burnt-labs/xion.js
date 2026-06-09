---
"@burnt-labs/abstraxion-core": major
"@burnt-labs/account-management": major
"@burnt-labs/abstraxion-js": major
"@burnt-labs/abstraxion-react": major
"@burnt-labs/abstraxion-react-native": major
---

Remove legacy (non-treasury) grant configuration. A treasury contract is now the only supported way to configure authz/feegrants for a session key.

BREAKING CHANGES:

- Removed the `contracts`, `stake`, and `bank` fields from `AbstraxionConfig` (and from the React / React Native providers and controller configs). Configure grants with a `treasury` contract address instead.
- `GrantConfig` (`@burnt-labs/account-management`) no longer accepts `contracts`, `bank`, or `stake`.
- `AbstraxionAuth.configureAbstraxionInstance` signature changed to `(rpc, callbackUrl?, treasury?, treasuryIndexerUrl?, gasPrice?, authAppUrl?)` — the legacy `grantContracts`/`stake`/`bank` positional parameters were removed.
- Removed `compareGrantsToLegacyConfig` from `AbstraxionAuth`, the `compareContractGrants`/`compareStakeGrants`/`compareBankGrants` helpers, the `fetchChainGrantsABCI` query, and the `generateBankGrant`/`generateContractGrant`/`generateStakeAndGovGrant`/`buildGrantMessages` builders.
- The dashboard redirect/popup/iframe URLs no longer include `contracts`, `stake`, or `bank` query params.

Migration: set up a treasury contract and pass its address via `treasury`, or use the no-grants path with `requireAuth` (direct signing) where the user signs from their meta-account. Existing sessions that were established via legacy grants can no longer be validated and will be logged out on the next session restore; users must re-authenticate against a treasury-configured app.
