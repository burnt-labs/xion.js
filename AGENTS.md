# AGENTS.md

## Dashboard messaging

- Use `MessageTarget.XION_IFRAME` for dashboard iframe request targets, including React Native WebView bridge envelopes; its wire value is `"xion_iframe"`, not `"XION_IFRAME"`. When changing either transport, add or update a regression test that checks the serialized request target is `"xion_iframe"`.
