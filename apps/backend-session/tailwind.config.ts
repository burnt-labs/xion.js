import type { Config } from "tailwindcss";
import baseConfig from "@burnt-labs/tailwind-config/tailwind.config";

export default {
  ...baseConfig,
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
} satisfies Config;
