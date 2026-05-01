// tailwind config is required for editor support
import fs from "node:fs";
import type { Config } from "tailwindcss";

// Convert image to base64
const imageToBase64 = (path: string): string => {
  const bitmap = fs.readFileSync(path);
  return `data:image/png;base64,${Buffer.from(bitmap).toString("base64")}`;
};

const config: Config = {
  prefix: "ui-",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      backgroundImage: {
        "glow-conic":
          "conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)",
        "modal-overlay": `url('${imageToBase64(
          "./src/assets/xion-bg-blur.png",
        )}')`,
      },
      fontFamily: {
        akkuratLL: ["Akkurat", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
