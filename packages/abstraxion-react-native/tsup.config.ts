import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  external: [
    "react",
    "react-native",
    "@react-native-async-storage/async-storage",
    "expo-web-browser",
    "expo-linking",
    "react-native-libsodium",
  ],
}));
