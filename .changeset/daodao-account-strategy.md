---
"@burnt-labs/account-management": minor
"@burnt-labs/abstraxion-js": minor
---

Account discovery can use the DaoDao indexer instead of Numia, which is being retired:

```ts
indexer: {
  type: "daodao",
  url: getDaoDaoIndexerUrl(chainId), // "https://daodaoindexer.burnt.com"
  chainId,
}
```

- `@burnt-labs/account-management`: new `DaoDaoAccountStrategy` (`new DaoDaoAccountStrategy(url, chainId, timeoutMs?)`), selected by `type: "daodao"` in `createCompositeAccountStrategy` and `convertIndexerConfig`. It calls `GET {url}/{chainId}/generic/_/xion/accountsByAuthenticator?type=…&authenticator=…` and returns every account the indexer tracks that currently holds the authenticator, each with its authenticators and their on-chain indices. On `xion-testnet-2` the indexer does not track `abstract:account` contracts (code ID 1986) or contracts recorded with code ID 0, so a lookup for one of those comes back empty, like a miss. Authenticators of a type the SDK has no signer for (e.g. `Secp256R1`) are left out of that list, so it is not a complete view of an account's authenticators. A miss is an empty list; a `200` body that is not a list, or an entry missing a valid address, code ID or authenticator field, throws. Any other status, including `404` while the indexer has not deployed the lookup, throws so the composite falls through to the next strategy. A request is aborted after 30 seconds (`timeout` in the config, in milliseconds, or the third constructor argument) so a stalled indexer also falls through. No token is needed. `DaoDaoIndexerConfig` and `NumiaIndexerConfig` are exported.
- **Deprecated:** `NumiaAccountStrategy` and the `type: "numia"` indexer config (also the default when `type` is omitted). They keep working for now and will be removed in a later release; move to `type: "daodao"`.
- `@burnt-labs/abstraxion-js`: `IndexerConfig` accepts the DaoDao variant. Signer mode with `smartAccountContract` still ignores `indexer` (the AA API is the only discovery source there), so signer-mode apps can drop a Numia indexer block without replacing it.
