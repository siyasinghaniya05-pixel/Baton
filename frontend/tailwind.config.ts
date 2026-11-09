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
        navy: {
          950: "#090d16",
          900: "#0f172a",
          850: "#141e33",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
        },
        brand: {
          blue: "#2563eb",
          accent: "#3b82f6",
          light: "#60a5fa",
          dark: "#1d4ed8"
        }
      },
    },
  },
  plugins: [],
};
export default config;
