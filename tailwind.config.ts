import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        lgred: "#B6144B",
        lgdark: "#7F1637",
        mint: "#D65A82",
        cloud: "#F4F6FA",
      },
      boxShadow: {
        phone: "0 24px 60px rgba(17, 24, 39, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
