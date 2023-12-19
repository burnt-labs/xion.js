import { defineConfig, Options } from "tsup";
import copy from "rollup-plugin-copy";

const copyPlugin = copy({
  targets: [{ src: "src/assets", dest: "dist" }],
});

export default defineConfig((options: Options) => ({
  treeshake: true,
  splitting: true,
  entry: ["src/**/*.tsx"],
  format: ["esm"],
  dts: true,
  minify: true,
  clean: true,
  external: ["react"],
  plugins: [copyPlugin as any],
  ...options,
}));
