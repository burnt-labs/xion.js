import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mirrors xion-dashboard-app/vite.config.ts: redirect node-polyfills shim
// imports from nested workspace dist files (e.g. account-management) to the
// installed shim package — pnpm's nested layout otherwise fails to resolve.
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
    react(),
    tailwindcss(),
    // CosmJS / abstraxion-js depend on Node built-ins (Buffer, stream, etc.).
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
      include: ["buffer", "stream", "util", "crypto"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Pin React resolution to a single copy so the rollup commonjs plugin
      // only sees one jsx-runtime entry. Mirrors xion-dashboard-app's vite config.
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(
        __dirname,
        "node_modules/react/jsx-runtime",
      ),
      "react/jsx-dev-runtime": path.resolve(
        __dirname,
        "node_modules/react/jsx-dev-runtime",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  define: {
    global: "globalThis",
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      requireReturnsDefault: "auto",
    },
  },
  optimizeDeps: {
    esbuildOptions: { define: { global: "globalThis" } },
    include: ["buffer", "process", "react", "react-dom", "react-router-dom"],
  },
});
