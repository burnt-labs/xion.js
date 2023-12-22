import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        primary: "#000",
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
};
export default config
