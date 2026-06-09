---
"@burnt-labs/abstraxion-react": major
---

`@burnt-labs/ui` is deprecated and not supported in v1.0.0. Its source has been removed from the active workspace; the last published version is `@burnt-labs/ui@1.0.0-alpha.26`. The legacy `<Abstraxion>` modal it powered is fully superseded by the iframe embed in `@burnt-labs/abstraxion-react` (`AbstraxionEmbed` + `AbstraxionProvider`). Consumers should migrate off `@burnt-labs/ui` and use the dashboard iframe embed or app-local UI primitives instead.

The release checklist will run `npm deprecate @burnt-labs/ui@* "<message>"` manually once v1 ships.
