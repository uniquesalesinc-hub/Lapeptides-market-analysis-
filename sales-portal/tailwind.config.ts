import type { Config } from "tailwindcss";

// LA Peptides light design system (DESIGN.md): tinted neutrals + teal accent,
// matching lapeptides.net as the canonical brand surface.
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
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-outfit)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jbmono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        lap: "0 1px 2px rgb(12 83 94 / 0.06)",
        lapDrawer: "0 8px 30px rgb(7 56 65 / 0.18)",
      },
      spacing: {
        touch: "44px",
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
