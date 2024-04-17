import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Need to be polyfilled for graz.
      // Only these three are polyfilled.
      include: ["buffer", "util", "stream"],
    }),
  ],
});
