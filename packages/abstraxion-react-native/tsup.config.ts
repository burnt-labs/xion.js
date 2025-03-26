import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-native",
    "@react-native-async-storage/async-storage",
    "expo-web-browser",
    "expo-linking",
    "react-native-libsodium",
  ],
});
