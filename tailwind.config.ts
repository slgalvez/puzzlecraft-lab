import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "surface-warm": "hsl(var(--surface-warm))",
        "surface-elevated": "hsl(var(--surface-elevated))",
        puzzle: {
          cell: "hsl(var(--puzzle-cell))",
          "cell-active": "hsl(var(--puzzle-cell-active))",
          "cell-highlight": "hsl(var(--puzzle-cell-highlight))",
          "cell-black": "hsl(var(--puzzle-cell-black))",
          "cell-error": "hsl(var(--puzzle-cell-error))",
          "cell-correct": "hsl(var(--puzzle-cell-correct))",
          border: "hsl(var(--puzzle-border))",
          number: "hsl(var(--puzzle-number))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "cell-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)" },
        },
        "milestone-glow": {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.6)", transform: "scale(1)" },
          "25%": { boxShadow: "0 0 16px 4px hsl(var(--primary) / 0.4)", transform: "scale(1.03)" },
          "50%": { boxShadow: "0 0 24px 8px hsl(var(--primary) / 0.2)", transform: "scale(1.01)" },
          "100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)", transform: "scale(1)" },
        },
        "milestone-sparkle": {
          "0%": { opacity: "0", transform: "scale(0.5) rotate(-10deg)" },
          "50%": { opacity: "1", transform: "scale(1.2) rotate(5deg)" },
          "100%": { opacity: "0", transform: "scale(0.8) rotate(0deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "cell-pop": "cell-pop 0.15s ease-out",
        "milestone-glow": "milestone-glow 1.2s ease-out forwards",
        "milestone-sparkle": "milestone-sparkle 0.8s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
