import type { Config } from "tailwindcss";

// LA Peptides brand palette — matches the existing market-analysis site
// (deep navy surface, teal accent) so the Sales Portal reads as the same brand.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0b1220",
          surface: "#0e1829",
          surfaceAlt: "#111c30",
          border: "#1a2b3e",
          teal: {
            DEFAULT: "#00C4A7",
            deep: "#0f6e6e",
            50: "#e6faf7",
            100: "#c1f1e9",
            300: "#5fdcc9",
            500: "#00C4A7",
            600: "#049c86",
            700: "#0f6e6e",
            900: "#0a3a3a",
          },
          slate: {
            50: "#f8fafc",
            100: "#e2e8f0",
            300: "#cbd5e1",
            400: "#94a3b8",
            600: "#475569",
            800: "#1e293b",
          },
          danger: "#f87171",
          warning: "#fbbf24",
          success: "#34d399",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)",
      },
      spacing: {
        touch: "44px",
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
