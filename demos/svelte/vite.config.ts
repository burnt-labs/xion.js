import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mirrors xion-dashboard-app/vite.config.ts: redirect node-polyfills shim
// imports from nested workspace dist files to the installed shim package.
function resolveNodePolyfillShims(): Plugin {
  const shimsDir = path.resolve(
    __dirname,
    "node_modules/vite-plugin-node-polyfills/shims",
  );
  return {
    name: "resolve-node-polyfill-shims",
    enforce: "pre",
    resolveId(source) {
      if (source.startsWith("vite-plugin-node-polyfills/shims/")) {
        const shimName = source.replace(
          "vite-plugin-node-polyfills/shims/",
          "",
        );
        return path.resolve(shimsDir, shimName, "dist/index.js");
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    resolveNodePolyfillShims(),
    svelte(),
    tailwindcss(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
      include: ["buffer", "stream", "util", "crypto"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: "globalThis",
  },
});
