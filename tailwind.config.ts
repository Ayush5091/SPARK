import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        "background-light": "#F8F9FA",
        "background-dark": "#121212",
        "card-light": "#FFFFFF",
        "card-dark": "#1E1E1E",
        "surface-light": "#ffffff",
        "surface-dark": "#2a2a2a",
        "subtle-light": "#E9ECEF",
        "subtle-dark": "#2D2D2D",
        "text-light": "#212529",
        "text-dark": "#F8F9FA",
        "text-muted-light": "#6C757D",
        "text-muted-dark": "#ADB5BD",
      },
      fontFamily: {
        display: ["var(--font-plus-jakarta-sans)", "sans-serif"],
        body: ["var(--font-plus-jakarta-sans)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        '2xl': "1.5rem",
        '3xl': "2rem",
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(255, 255, 255, 0.1)',
        'neumorphic': '20px 20px 60px #d1d1d1, -20px -20px 60px #ffffff',
      }
    },
  },
  plugins: [],
};
export default config;
