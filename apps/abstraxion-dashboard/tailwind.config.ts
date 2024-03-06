import type { Config } from "tailwindcss";
import sharedConfig from "@burnt-labs/tailwind-config/tailwind.config.ts";

const config: Config = {
  content: ["./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/page.tsx"],
  theme: {
    extend: {
      colors: {
        primary: "#000",
        mainnet: "#CAF033",
        "mainnet-bg": "rgba(4, 199, 0, 0.2)",
        testnet: "#FFAA4A",
        "testnet-bg": "rgba(255, 170, 74, 0.2)",
      },
      flexGrow: {
        "2": "2",
      },
      fontFamily: {
        akkuratLL: ["var(--font-akkuratLL)"],
      },
      typography: {
        navigation: {
          css: {
            fontFamily: "akkuratLL",
            fontSize: "1.2rem",
            fontWeight: "400",
            lineHeight: "1.4rem",
            letterSpacing: "0.1rem",
            textTransform: "uppercase",
          },
        },
      },
    },
  },
  plugins: [],
  prefix: "ui-",
  presets: [sharedConfig],
};
export default config;
