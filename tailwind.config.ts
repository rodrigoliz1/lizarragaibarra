import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#050505",
          2: "#0B0B0B",
          3: "#111111",
          line: "#292929",
        },
        paper: {
          DEFAULT: "#F7F7F5",
          pure: "#FFFFFF",
          muted: "#D3D3D0",
          quiet: "#8B8B87",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      letterSpacing: {
        editorial: "0.18em",
      },
      maxWidth: {
        shell: "90rem",
      },
      boxShadow: {
        lift: "0 24px 80px rgba(0,0,0,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
