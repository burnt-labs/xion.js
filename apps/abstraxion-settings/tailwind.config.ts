import type { Config } from "tailwindcss";
import sharedConfig from "@burnt-labs/tailwind-config/tailwind.config";
const config: Config = {
  prefix: "ui-",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        akkuratLL: ["AkkuratLL"],
      },
      colors: {
        primary: "#000",
        mainnet: "#CAF033",
        "mainnet-bg": "rgba(4, 199, 0, 0.2)",
        testnet: "#FFAA4A",
        "testnet-bg": "rgba(255, 170, 74, 0.2)",
        inactive: "#BDBDBD",
      },
      flexGrow: {
        "2": "2",
      },
    },
  },
  plugins: [],
  presets: [sharedConfig],
};

export default config;
