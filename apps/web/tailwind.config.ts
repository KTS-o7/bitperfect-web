import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bone: "#f2efe9",
        carbon: "#101010",
        "walkman-orange": "#ff6b35",
        "walkman-yellow": "#ffd23f",
      },
      letterSpacing: {
        widest: "0.15em",
      },
      animation: {
        "slide-in": "slideIn 0.3s ease-out",
        "music-bar": "musicBar 0.5s ease-in-out infinite",
      },
      keyframes: {
        musicBar: {
          "0%, 100%": { height: "4px" },
          "50%": { height: "16px" },
        },
        slideIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
