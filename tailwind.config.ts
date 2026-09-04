import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        primary: {
          DEFAULT: "var(--primary)",
          dark: "var(--primary-dk)",
        },
        gold: "var(--gold)",
        alert: "var(--alert)",
        surface: "var(--surface)",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        serif: ["var(--font-fraunces)"],
      },
    },
  },
  plugins: [],
};
export default config;
