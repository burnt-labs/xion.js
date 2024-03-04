---
"abstraxion-dashboard": minor
"@burnt-labs/abstraxion": minor
"@burnt-labs/constants": minor
---

Update default RPC/Rest Urls and allow for dapps to pass in rest url via the AbstraxionProvider.

```typescript
        <AbstraxionProvider
          config={{
            restUrl: "https://api.example.com",
          }}
        >
          {children}
        </AbstraxionProvider>

```
