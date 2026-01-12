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
        // Ancestral Vision color palette
        constellation: {
          primary: "#1a1a2e",
          secondary: "#16213e",
          accent: "#0f3460",
          highlight: "#e94560",
          star: "#ffd700",
        },
      },
    },
  },
  plugins: [],
};

export default config;
