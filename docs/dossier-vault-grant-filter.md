# Per-vault contract grant with an accepted-key filter

Dossier needs the session key of an app such as Klout to hold a `ContractExecutionAuthorization` that names only the owner's vault, carries an `AcceptedMessageKeysFilter` of exactly `admit_private` and `cancel_pending_admission`, attaches no funds, and has a reviewed call budget and expiry (Dossier `docs/intent.md:145`, `:1049`; `docs/predicate-language.md:666-674`). This note maps how xion.js builds grants on `origin/main` (`d74b2a2`), what the unreleased crashland tree adds, and what this branch (`dossier/vault-grant-filter`) changes.

Paths are relative to the repository root. "main" means commit `d74b2a2`; "branch" means this branch.

## 1. How grants are built on main

### Request type

- `ContractGrantDescription` is `string | { address, amounts }` (main `packages/abstraxion-core/src/types/index.ts:66-71`). There is no field for a filter or a call budget.
- `@burnt-labs/abstraxion-js` declares its own copy of the same type (main `packages/abstraxion-js/src/types.ts:12-17`) and uses it for `AbstraxionConfig.contracts` (main `:245`). `abstraxion-react` and `abstraxion-react-native` re-export it from abstraxion-js (`packages/abstraxion-react/src/index.ts:43-46`, `packages/abstraxion-react-native/src/components/AbstraxionContext/index.tsx:34-37`).
- `GrantConfig.contracts` in account-management repeats the shape inline (main `packages/account-management/src/types/grants.ts:54-58`).

### Request channel to the Abstraxion dashboard

- Redirect mode serialises the list as JSON into the `contracts` query parameter (`packages/abstraxion-core/src/AbstraxionAuth.ts:337-339`). Popup and iframe modes do the same (`packages/abstraxion-js/src/controllers/PopupController.ts:232-236`, `packages/abstraxion-js/src/controllers/IframeController.ts:730-731`).
- The dashboard that reads this parameter and builds the `MsgGrant` is not in this repository. Its source was not inspected. Whether it calls `buildGrantMessages` from account-management is [INFERENCE].

### Construction in the SDK (signer mode)

- `createGrants` (`packages/account-management/src/orchestrator/flow/grantCreation.ts:171`) returns early when storage already records grants for the same granter (`:184-193`), uses treasury grants when a treasury is configured (`:214-228`) and only falls back to the manual `contracts`/`bank`/`stake` lists when the treasury produced no messages (`:231-243`). The manual path always uses a one-year expiry (`:232-234`). It signs the grant transaction with `AAClient` as the meta-account (`:279`, `:365-370`).
- `buildGrantMessages` puts all contracts into one `generateContractGrant` call (main `packages/account-management/src/grants/construction.ts:376-406`).
- `generateContractGrant` (main `construction.ts:193-271`) emits one `ContractExecutionAuthorization`. A string entry gets `MaxCallsLimit(255)` and `AllowAllMessagesFilter` (`:215-230`). An object entry gets `CombinedLimit(255, amounts)` and `AllowAllMessagesFilter` (`:233-248`). The expiry is the caller's `expiration` argument (`:252-264`). Nothing on main can emit any other filter.
- `generateBankGrant` (`:162-188`) and `generateStakeAndGovGrant` (`:277-371`) follow the same pattern: build the authorization with `cosmjs-types`, wrap it in `MsgGrant` with the caller's expiry.

### Treasury grants

- `generateTreasuryGrants` (main `construction.ts:85-157`) copies the treasury contract's stored authorization bytes into `MsgGrant` unchanged (`constructTreasuryGrantMessage`, `:42-72`). The SDK does not choose filters on this path; the treasury admin does. Dossier's scoping records that a treasury config cannot name per-owner vaults and that `deploy_fee_grant` requires the chain grant to equal the config (Dossier `docs/scoping/dashboard-and-app-access.md:116-122`). Not re-checked here.

### Signing as the session key

- `GranteeSignerClient.sign` wraps owner-sender messages in one `MsgExec` for the grantee and returns `TxRaw` without broadcasting (`packages/abstraxion-core/src/GranteeSignerClient.ts:281-304`). It does not add a fee granter. `signAndBroadcast` sets `granter = treasury ?? granterAddress` (`:237`). Unchanged by this branch.

### Grant reuse check

- On session restore, `restoreSession` calls `sessionManager.authenticate()` (`packages/account-management/src/orchestrator/flow/sessionRestoration.ts:45`), which runs `pollForGrants` and logs out when it returns false (`packages/abstraxion-core/src/AbstraxionAuth.ts:601-621`).
- Without a treasury, `pollForGrants` fetches grants with `fetchChainGrantsABCI` and compares them with `compareContractGrants` (`AbstraxionAuth.ts:509-528`, `:355-363`).
- On main, `fetchChainGrantsABCI` converts only Generic, Send and Stake authorizations to REST JSON; a `ContractExecutionAuthorization` falls into the default branch and comes back as `{ "@type", value }` with no `grants` field (main `packages/abstraxion-core/src/utils/grant/query.ts:72-77`, used at `:273-275`).
- `compareContractGrants` reads `grant.authorization.grants.some(...)` (main `packages/abstraxion-core/src/utils/grant/compare.ts:467-471`). On that shape it throws. Observed on main's build:

  ```
  $ node -e '...compareContractGrants([{ authorization: { "@type": "/cosmwasm.wasm.v1.ContractExecutionAuthorization", value: new Uint8Array([10,0]) } }], ["xion1vault"])'
  threw: TypeError Cannot read properties of undefined (reading 'some')
  ```

  `pollForGrants` catches errors, retries five times and then throws (`AbstraxionAuth.ts:530-545`), so a restore with a `contracts` config and a live contract grant ends in logout [INFERENCE from the code path; not run against a chain].

- Even without the crash, the check ignores filters: any entry for the address satisfies a string request, and an object request only compares funds (main `compare.ts:463-484`). An `AllowAllMessagesFilter` grant would satisfy a filtered request.
- The first redirect login skips this comparison (`packages/abstraxion-js/src/controllers/RedirectController.ts:393-397`); it runs on the next restore.

### Decoding

- `decodeAuthorization` already decodes `AcceptedMessageKeysFilter` keys, `MaxCallsLimit`, `MaxFundsLimit` and `CombinedLimit` per contract entry (`packages/abstraxion-core/src/utils/grant/decoding.ts:76-159`, keys at `:123-126`). Main can read a filtered grant; it cannot request or build one.

## 2. Chain rules that shape the grant

Read from the module cache at `~/go/pkg/mod/github.com/burnt-labs/wasmd@v0.61.14-xion.2` and `~/go/pkg/mod/github.com/cosmos/cosmos-sdk@v0.53.8`. The local `xion` checkout (`v30.0.0-26-gd2559b46`) pins those versions (`xion/go.mod:11`, `:53`). That the deployed chain runs them is [INFERENCE].

- `AcceptedMessageKeysFilter.Accept` admits a message only if it is a JSON object with exactly one top-level key in the list (`x/wasm/types/json_matching.go:10-32`, `x/wasm/types/authz.go:463-472`).
- Its `ValidateBasic` rejects an empty list, an empty key, a key with surrounding whitespace and a duplicate key (`authz.go:475-493`).
- `MaxCallsLimit` refuses any message that carries funds (`authz.go:557-560`). `CombinedLimit.ValidateBasic` rejects empty amounts (`authz.go:641-647`), so `CombinedLimit` cannot express "no funds".
- Several entries for the same contract are allowed (`authz.go:233-235`), and `AcceptGrantedMessage` moves on to the next entry for that contract when one entry's limit or filter refuses (`authz.go:258-283`). A second, broader entry for the vault would therefore widen the grant.
- The authz store keeps one grant per granter, grantee and message type, and a new grant for the same type overwrites the old one (`x/authz/keeper/keeper.go:188-195`). A `ContractExecutionAuthorization` is keyed by `MsgExecuteContract` (`authz.go:158-160`). One session key holds at most one contract grant from one owner: issuing the vault grant replaces any other contract grant that key holds from that owner, and a later contract grant for other contracts replaces the vault grant. A `MsgRevoke` for `MsgExecuteContract` removes all of them.

## 3. What crashland and the local branch carry

- `/Users/mv/Development/burnt/xion.js-crashland` is a detached checkout at `dbef664`, 71 commits behind main (`git rev-list --count dbef664..origin/main` printed `71`), with uncommitted changes (24 modified files, 10 untracked). The grant part:
  - `acceptedMessageKeys?` and `maxCalls?` on `ContractGrantDescription` (`packages/abstraxion-core/src/types/index.ts:72-75`) and on account-management's copy (`packages/account-management/src/types/grants.ts:13-16`).
  - Validation helpers `isAcceptedMessageKeysValid`, `hasContractGrantOptions`, `getContractGrantOptionsError` (`packages/abstraxion-core/src/utils/grant/validation.ts:4-87`), which also reject unknown description fields.
  - Construction in `generateContractGrant` (`packages/account-management/src/grants/construction.ts:204-227` for validation and the unique-address rule, `:252-289` for encoding).
  - Strict reuse matching (`packages/abstraxion-core/src/utils/grant/compare.ts:364-410`).
  - Changeset `.changeset/dossier-filtered-grants.md`.
  - The same tree also carries unrelated "verona" work: untracked `verona/` directories, `export * from "./verona"` added to the abstraxion-core, account-management and signers indexes, and a `packages/constants/src/index.ts` diff with 16 lines mentioning verona (`git diff` in that checkout).
  - `packages/abstraxion-js` did not exist at `dbef664` (`git ls-tree --name-only dbef664 packages/` lists no such directory), so crashland does not touch the abstraxion-js copy of the type.
- The main checkout has an unpushed local branch `feat/dossier-filtered-grants` (7 commits, head `9809a67`, based on `878e8ea`, 29 commits behind main). `git diff --stat origin/main...feat/dossier-filtered-grants` reports 34 files, 2631 insertions, 375 deletions. Its changeset (`.changeset/dossier-filtered-grants.md` on that branch) describes the crashland design plus immutable descriptor snapshots, protobuf wire-format checks before decoding, Bech32 alias handling, a distinct "Malformed" decode result, and its commit `482006e` changes signer fee handling. `git ls-remote origin 'refs/heads/*dossier*'` returned nothing, so neither variant is on GitHub.

## 4. What this branch changes

The design follows crashland's request shape with less machinery, on top of current main.

- `ContractGrantDescription` object form gains `acceptedMessageKeys?: string[]` and `maxCalls?: number`; REST `Filter` gains `keys?` (branch `packages/abstraxion-core/src/types/index.ts:55-58`, `:67-76`).
- abstraxion-js re-exports the core type instead of keeping a copy (branch `packages/abstraxion-js/src/types.ts:5-11`), so `AbstraxionConfig.contracts` (`:241`) and the React and React Native re-exports accept the new fields. `GrantConfig.contracts` uses the shared type (branch `packages/account-management/src/types/grants.ts:5`, `:56`).
- `generateContractGrant` (branch `packages/account-management/src/grants/construction.ts:209`):
  - Applies its new checks only to object entries that carry `acceptedMessageKeys` or `maxCalls`, checked with `in`, so `acceptedMessageKeys: undefined` also counts (`:217-219`). This is the same routing `compareContractGrants` uses (`compare.ts:468-473`). Strings and other objects pass through as on main, including main's handling of unknown fields: they are ignored.
  - For those constrained entries: throws on fields other than `address`, `amounts`, `acceptedMessageKeys`, `maxCalls` (`:191-196`, `:220-227`); requires a string address and an `amounts` array, checks keys with the wasmd rules, requires `maxCalls` to be a positive safe integer, and requires the address to appear in no other entry, compared case-insensitively (`:228-268`).
  - Encodes `AcceptedMessageKeysFilter` when keys are given, `MaxCallsLimit(maxCalls ?? 255)` when `amounts` is empty and an option is present, otherwise `CombinedLimit(maxCalls ?? 255, sorted amounts)` (`:305-343`). Strings and option-free `{ address, amounts }` objects encode exactly as on main.
- `fetchChainGrantsABCI` now returns contract grants in REST form, `grants[].contract`, `limit` (`remaining`, `calls_remaining`, `amounts`) and `filter` (`keys`), and keeps `value` for `decodeRestFormatAuthorization` (branch `packages/abstraxion-core/src/utils/grant/query.ts:77-107`). This removes the crash above.
- `compareContractGrants` sends any description with `acceptedMessageKeys` or `maxCalls` to `isConstrainedContractGrantSatisfied` (branch `packages/abstraxion-core/src/utils/grant/compare.ts:468-473`, `:495-535`). It accepts only exactly one chain entry for the address; the same key set (an `AllowAllMessagesFilter`, a missing key or an extra key fails); a call budget above zero and at most the requested one; `MaxCallsLimit` when no funds were requested, or `CombinedLimit` within the requested amounts otherwise.
- The treasury comparison `validateContractExecution` compared `AcceptedMessageKeysFilter` keys index by index, so the same keys in another order counted as a mismatch, while the chain ignores order (section 2). It now checks that every chain key is in the treasury list, with the existing equal-length check (branch `packages/abstraxion-core/src/utils/grant/compare.ts:207-216`). wasmd rejects duplicate keys in any stored grant (`authz.go:487-489`), so this is set equality.
- Changeset `.changeset/contract-grant-message-keys.md` (minor for abstraxion-core, account-management, abstraxion-js). `packages/abstraxion-react/README.md:59-61` has a commented example entry and `:100-104` lists the consumer-visible changes: a constrained entry with unknown fields or a second entry for its address throws, while legacy entries still ignore unknown fields; the stricter restore check; and the REST shape from `fetchChainGrantsABCI`.

Tests:

- `packages/account-management/src/grants/__tests__/contract-grant-filter.test.ts` (28 tests): filter encoding (exact keys, `MaxCallsLimit`, `CombinedLimit`, default budget, unchanged legacy wire); single-contract restriction (only the vault is named, entries stay separate, a second entry for the vault as a string, upper-case string, legacy object or second filtered object is refused); unknown and malformed fields (a misspelt field on a constrained entry throws, a legacy entry with the same misspelt field still encodes `CombinedLimit` with `AllowAllMessagesFilter` as on main, malformed key lists, bad `maxCalls`, missing amounts); expiry and limits round-trip through `MsgGrant.encode`/`decode` and `decodeAuthorization`, and through `buildGrantMessages`.
- `packages/abstraxion-core/src/utils/grant/__tests__/contract-grant-filter.test.ts` (13 tests): runs protobuf grants through `fetchChainGrantsABCI` with the authz query client mocked, then through `compareContractGrants`. Covers REST conversion with keys, limits and expiry; the legacy string request on an ABCI contract grant; acceptance of the exact grant (any key order, lower budget); rejection of `AllowAllMessagesFilter`, an unknown extra key, a missing key, a different key, a second entry for the vault, a grant for another contract, a budget above the request, funds when none were requested, and funds above the requested amount. One more test calls `validateContractExecution` directly: the same keys in reverse order match, a different key set does not.

## 5. API for a dashboard

Exported names:

- `generateContractGrant(expiration: bigint, grantee: string, granter: string, contracts: ContractGrantDescription[]): EncodeObject` from `@burnt-labs/account-management` (also reachable through `buildGrantMessages`).
- `ContractGrantDescription` from `@burnt-labs/abstraxion-core`, re-exported by `@burnt-labs/account-management`, `@burnt-labs/abstraxion-js`, `@burnt-labs/abstraxion-react` and `@burnt-labs/abstraxion-react-native`.
- `compareContractGrants(grants, contracts)` from `@burnt-labs/abstraxion-core` to check what the chain holds.
- `getMsgTypeUrlForRevoke` from `@burnt-labs/account-management` for revocation (`packages/account-management/src/grants/revoke.ts:76-89`).

Issuing the vault grant from a dashboard that signs as the owner's meta-account, mirroring `createGrants` (`grantCreation.ts:279-370`). The example was neither compiled nor run; the signatures were read from `construction.ts:207-212`, `grantCreation.ts:279-281`, `:323-327` and `:365-370`:

```ts
import { generateContractGrant } from "@burnt-labs/account-management";
import type { ContractGrantDescription } from "@burnt-labs/abstraxion-core";
import { AAClient } from "@burnt-labs/signers";
import { GasPrice } from "@cosmjs/stargate";

const vaultGrant: ContractGrantDescription = {
  address: vaultAddress, // the owner's discovered vault
  amounts: [], // no funds: encodes MaxCallsLimit
  acceptedMessageKeys: ["admit_private", "cancel_pending_admission"],
  maxCalls: 50, // reviewed call budget
};
const expiration = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60); // reviewed expiry, seconds

const grantMsg = generateContractGrant(
  expiration,
  sessionGrantee, // the app's session key address
  ownerAccount, // the owner's meta-account (granter)
  [vaultGrant],
);

const client = await AAClient.connectWithSigner(rpcUrl, ownerSigner, {
  gasPrice: GasPrice.fromString("0.001uxion"),
});
const gas = await client.simulate(
  ownerAccount,
  [grantMsg],
  "Dossier vault grant",
);
await client.signAndBroadcast(ownerAccount, [grantMsg], {
  amount: [{ denom: "uxion", amount: String(Math.ceil(gas * 0.001 * 2)) }],
  gas: String(Math.ceil(gas * 1.6)),
});
```

Revoking it:

```ts
import { MsgRevoke } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { getMsgTypeUrlForRevoke } from "@burnt-labs/account-management";

const revokeMsg = {
  typeUrl: MsgRevoke.typeUrl,
  value: MsgRevoke.fromPartial({
    granter: ownerAccount,
    grantee: sessionGrantee,
    msgTypeUrl: getMsgTypeUrlForRevoke(
      "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
    ), // "/cosmwasm.wasm.v1.MsgExecuteContract"
  }),
};
```

An app requesting the grant through Abstraxion puts the same description in its config (`AbstraxionConfig.contracts`). In signer mode the SDK builds it through `createGrants`; in redirect, popup and iframe modes the description reaches the Abstraxion dashboard as JSON, and that dashboard must build it. On restore the SDK checks the chain grant with `compareContractGrants` and logs out if it is broader.

## 6. Limits this branch does not remove

- The Abstraxion dashboard must be updated to read `acceptedMessageKeys` and `maxCalls`. A dashboard built against main drops them and issues `AllowAllMessagesFilter` [INFERENCE: dashboard source not inspected]. The SDK then refuses that grant on the next restore, but the first redirect login does not compare (`RedirectController.ts:393-397`).
- `createGrants` returns early when storage records grants for the same granter (`grantCreation.ts:184-193`), so a vault discovered after connect is never granted by the SDK path. The static `contracts` config needs the vault address at configuration time.
- Signer-mode expiry is fixed at one year (`grantCreation.ts:232-234`). A dApp cannot request a shorter expiry through `contracts`; a dashboard calling `generateContractGrant` chooses it.
- With a treasury configured, manual `contracts` are ignored whenever the treasury yields grants (`grantCreation.ts:214-231`).
- One contract grant per owner and session key (section 2): issuing the vault grant from a separate dashboard overwrites any other contract grant of that key from that owner, and the reverse.
- Nothing here enforces Dossier's allowlist over every grant held by the session key (Dossier `docs/predicate-language.md:696-718`).
- The JavaScript key check uses `String.prototype.trim`, whose whitespace set differs slightly from Go's `strings.TrimSpace` (for example U+0085 and U+FEFF). A key that passes here and fails on chain makes the grant transaction fail; it cannot widen the grant.
- Legacy entries stay lenient, as on main. An entry whose filter field is misspelt (for example `acceptedKeys`) and that has no `maxCalls` is a legacy entry: its unknown field is ignored, it encodes `AllowAllMessagesFilter`, and on restore it goes through the legacy comparison, which accepts any grant for the address. Only an entry that carries `acceptedMessageKeys` or `maxCalls` is checked strictly. A dashboard building the Dossier grant should set both fields.

## 7. Verification run

All commands ran in `/Users/mv/Development/burnt/xion.js-wt/vault-grant-filter` unless noted. Baseline unit-test numbers come from this worktree before any edit (it was then at `d74b2a2`); baseline lint and `check-types` numbers come from a detached worktree at `d74b2a2` (`/tmp/xionjs-baseline-d74b2a2`, removed afterwards). The "Branch" column is the run after the last change in section 8. Earlier commits: `1ddec78` had 410 abstraxion-core and 855 account-management tests, `8e36829` had 411 and 855, with the same lint and `check-types` results.

| Command                                                                                                                  | Baseline `d74b2a2`           | Branch                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------ |
| `corepack pnpm install --frozen-lockfile`                                                                                | completed, output not kept   | Done in 17.1s                              |
| `corepack pnpm turbo run build --filter=@burnt-labs/abstraxion-js...`                                                    | Tasks: 5 successful, 5 total | Tasks: 5 successful, 5 total               |
| `packages/abstraxion-core`: `corepack pnpm vitest run`                                                                   | 23 files, 398 passed         | 24 files, 411 passed                       |
| `packages/account-management`: `corepack pnpm test:unit` (`vitest run src`)                                              | 30 files, 828 passed         | 31 files, 856 passed                       |
| `packages/abstraxion-js`: `corepack pnpm vitest run`                                                                     | not run                      | 18 files, 191 passed                       |
| `packages/abstraxion-react`: `corepack pnpm vitest run`                                                                  | not run                      | 5 files, 33 passed                         |
| `packages/abstraxion-react-native`: `corepack pnpm vitest run`                                                           | not run                      | 4 files, 23 passed                         |
| `corepack pnpm -s lint` in abstraxion-core, account-management, abstraxion-js, abstraxion-react, abstraxion-react-native | no problems reported         | exit 0 in each, no problems reported       |
| `corepack pnpm -s check-types` error count: abstraxion-core / account-management / abstraxion-js / abstraxion-react      | 37 / 3 / 10 / 0              | 37 / 3 / 10 / 0, same per-file counts      |
| `corepack pnpm exec prettier --check` on changed files                                                                   |                              | All matched files use Prettier code style! |

The `check-types` errors predate this branch and sit in files it does not touch: abstraxion-core test files (`src/__tests__/CacheUtils.test.ts` 18, `src/api/__tests__/client.test.ts` 4, `src/__tests__/AbstraxionAuth.test.ts` 3, two each in `GranteeSignerClient.test.ts`, `SignArbSecp256k1HdWallet.test.ts`, `ValidationUtils.test.ts`, one in `CacheManager.test.ts`, five in `../test-utils/src/vitest/index.ts`), account-management `src/grants/strategies/treasury-composite-strategy.ts` (3), abstraxion-js `tests/integration/helpers.ts` (7), `tests/integration/fixtures.ts` (2), `vitest.config.integration.ts` (1).

Nothing was run against a chain. The chain behaviour in section 2 comes from reading the Go sources named there.

## 8. Review

Three read-only reviews of commit `1ddec78`, by the Kimi, MiMo and Mistral reviewer seats of the Dossier wave-2 session. None found a blocker. Each named one gap; follow-up commit `8e36829` acts on two of them.

- Kimi checked the protobuf encoding against the cosmjs-types 0.11 codegen installed in `node_modules` (`cosmjs-types/cosmwasm/wasm/v1/authz.js`): type URLs, field numbers, `Any` packing of the empty `AllowAllMessagesFilter`, `MaxCallsLimit` for `amounts: []`, the expiry round-trip, the REST decode path and the set semantics of the new key comparison. Gap: the treasury comparison `validateContractExecution`, unchanged by `1ddec78`, compared keys by position. A reordering could only cause a false mismatch, never a false match. Fixed in section 4 with one test. Two other remarks were not acted on: the hard-coded `"/cosmwasm.wasm.v1.CombinedLimit"` string in `construction.ts:323`, which main already had and which equals `CombinedLimit.typeUrl`, and `Number()` conversion of call budgets above 2^53.
- MiMo listed the behaviour changes for existing consumers and confirmed from the `d74b2a2` sources that `fetchChainGrantsABCI` returned only `{ "@type", value }` for contract grants and that `compareContractGrants` read `grant.authorization.grants` unguarded, which is the `TypeError` in section 1. Gap: the README stated only the duplicate-entry rule. Fixed in `packages/abstraxion-react/README.md:100-104`. MiMo also pointed out that `1ddec78` made legacy `{ address, amounts }` entries with a stray field throw where main ignored it; see the paragraph after this list. Another remark was not acted on: an untyped JavaScript caller that passes `acceptedMessageKeys` without `amounts` to `compareContractGrants` gets a `TypeError` at `compare.ts:531` instead of the error that construction gives.
- Mistral mapped each test to the four required behaviours and checked the section 5 example against the exported signatures (`generateContractGrant`, `getMsgTypeUrlForRevoke`, `compareContractGrants`, `AAClient.connectWithSigner`, `simulate`, `signAndBroadcast`). Gap: no test of a `MaxFundsLimit`-only chain grant against an `amounts: []` request. The code refuses that grant because it requires `MaxCallsLimit` when no funds were requested (`compare.ts:531-534`), but no test covers it; none was added. Mistral also noted no test of case-insensitive address matching in `compareContractGrants`.

After the reviews the integrator asked that existing consumers not break, because xion.js is an established public package. `1ddec78` and `8e36829` threw on unknown fields for every object entry. The next commit applies that check only to entries that carry `acceptedMessageKeys` or `maxCalls` (section 4) and keeps legacy entries lenient as on main. The duplicate-address refusal for constrained entries is unchanged. The test "legacy entries still ignore unknown fields" covers the legacy case and "rejects unknown fields on a filtered description" the constrained one. The residual risk of a misspelt filter field is listed in section 6.
