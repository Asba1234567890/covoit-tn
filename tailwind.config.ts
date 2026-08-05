import type { Config } from "tailwindcss";

// Tokens from the Covoit Redesign Handoff (design spec §3). Hex values are
// the spec's own OKLCH fallbacks — used directly rather than oklch() so
// every Tailwind utility (bg-primary/50, etc.) generates reliably.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2E3E68", // Ink Blue — primary actions, active nav, links, headers
        accent: "#C89A4E", // Champagne Gold — trust/premium signals only (badges, ratings), never generic buttons
        "accent-dark": "#8A6A2F", // darker gold for text on light accent backgrounds (badge chips)
        background: "#FAF9F7",
        ink: "#1D2230", // text primary
        "ink-secondary": "#6D7182", // text secondary
        success: "#2E9E5B",
        "success-dark": "#1F7A45",
        warning: "#DA9A31",
        "warning-dark": "#8A5A12",
        error: "#C7402E",
        "error-dark": "#A6301F",
      },
      fontFamily: {
        display: ["var(--font-manrope)", "sans-serif"],
        body: ["var(--font-plex-sans)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        card: "12px",
        control: "10px", // buttons, inputs
      },
      boxShadow: {
        card: "0 1px 3px rgb(29 34 48 / 0.08)", // flat, no heavy drop shadows (spec §3.3)
      },
    },
  },
  plugins: [],
} satisfies Config;
