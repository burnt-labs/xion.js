---
"@burnt-labs/abstraxion": minor
"demo-app": minor
"@burnt-labs/ui": minor
---

Now longer use a blanket export in package.json as it was causing some confusion for some bundlers. There is no longer a css alias for "@burnt-labs/abstraxion/style.css", dapps will need to `import "@burnt-labs/abstraxion/dist/index.css"` going forward.
