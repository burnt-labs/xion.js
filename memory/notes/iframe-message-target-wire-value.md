---
title: Iframe request targets use the enum wire value
type: gotcha
scope: "packages/abstraxion-*/src/**"
confidence: 0.99
sources: [421]
updated: 2026-11-11
---
Iframe requests must serialize `MessageTarget.XION_IFRAME`, whose wire value is lowercase `"xion_iframe"`, not the enum member name `"XION_IFRAME"`.
The definition lives in `abstraxion-core/src/types/iframe.ts`; `abstraxion-js/src/index.ts` re-exports it for transport implementations.
The browser path delegates to `MessageChannelManager`, which already sends the enum value.
The React Native transport constructs its own envelope and copies `envelope.target` unchanged into the synthetic dashboard `MessageEvent`.
The checked-out RN implementation still contains the uppercase literal; PR #421 proposes replacing it after embedded CONNECT requests timed out.
When reviewing alternate transports, verify the serialized envelope against the shared enum rather than assuming matching symbolic names imply matching wire values.
