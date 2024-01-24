// tailwind config is required for editor support
import fs from "node:fs";
import type { Config } from "tailwindcss";
import sharedConfig from "@burnt-labs/tailwind-config/tailwind.config.ts";

// Convert image to base64
const imageToBase64 = (path: string): string => {
  const bitmap = fs.readFileSync(path);
  return `data:image/png;base64,${Buffer.from(bitmap).toString("base64")}`;
};

const config: Pick<Config, "prefix" | "presets" | "theme"> = {
  prefix: "ui-",
  presets: [sharedConfig],
  theme: {
    extend: {
      backgroundImage: {
        "modal-overlay": `url('${imageToBase64(
          "./src/assets/xion-bg-blur.png",
        )}')`,
      },
      fontFamily: {
        akkuratLL: ["Akkurat", "sans-serif"],
      },
    },
  },
};

export default config;
