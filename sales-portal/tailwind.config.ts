import type { Config } from "tailwindcss";

// LA Peptides brand palette — matches the existing market-analysis site
// (deep navy surface, teal accent) so the Sales Portal reads as the same brand.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // LA Peptides v2 light design system (DESIGN.md). Tinted neutrals + teal accent.
        lap: {
          ink: "#0F1B1F",
          slate: "#4A5862",
          page: "#F5FAFB",
          surface: "#FFFFFF",
          border: "#D3DFE2",
          teal: { DEFAULT: "#0C535E", dark: "#073841", bright: "#0DA5BC", wash: "#E8F4F6" },
          amber: "#F2A03D",
          green: "#2D8A5F",
          red: "#C9492A",
        },
        // Legacy v1 navy tokens. Unmigrated pages still use these; removed in Task 10.
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
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-outfit)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jbmono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)",
        lap: "0 1px 2px rgb(12 83 94 / 0.06)",
        lapDrawer: "0 8px 30px rgb(7 56 65 / 0.18)",
      },
      spacing: {
        touch: "44px",
      },
      borderRadius: {
        card: "12px",
      },
      keyframes: {
        // Cart-count bump on add-to-cart (DESIGN.md motion: 150-250ms, ease-out, no layout props).
        "cart-bump": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "cart-bump": "cart-bump 200ms cubic-bezier(0.25, 1, 0.5, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
