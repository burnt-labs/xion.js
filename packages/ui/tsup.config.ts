import { defineConfig, Options } from "tsup";
import copy from "rollup-plugin-copy";

const copyPlugin = copy({
  targets: [{ src: "src/assets", dest: "dist" }],
  copyOnce: true,
});

export default defineConfig((options: Options) => ({
  treeshake: true,
  splitting: true,
  entry: ["src/**/*.tsx"],
  format: ["esm", "cjs"],
  dts: true,
  minify: false,
  clean: true,
  external: ["react"],
  plugins: [copyPlugin as any],
  ...options,
}));
