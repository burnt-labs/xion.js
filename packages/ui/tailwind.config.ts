// tailwind config is required for editor support
import type { Config } from "tailwindcss";
import sharedConfig from "@burnt-labs/tailwind-config/tailwind.config.ts";

const config: Pick<Config, "prefix" | "presets" | "theme"> = {
  prefix: "ui-",
  presets: [sharedConfig],
  theme: {
    extend: {
      backgroundImage: {
        "modal-overlay": "url('../public/xion-bg-blur.png')",
      },
    },
  },
};

export default config;
