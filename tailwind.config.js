/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F7F0E6",
        ivory: "#FFF9F0",
        espresso: "#2B2118",
        brown: "#5A4635",
        gold: "#B9935A",
        "gold-soft": "#CDA877",
        beige: "#E8DCCB",
        card: "#FFFBF4",
        "line": "#EADFCB",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 40px -24px rgba(43, 33, 24, 0.35)",
        card: "0 12px 30px -18px rgba(43, 33, 24, 0.28)",
        float: "0 24px 60px -28px rgba(43, 33, 24, 0.45)",
        pin: "0 6px 14px -4px rgba(43, 33, 24, 0.55)",
      },
      borderRadius: {
        xl2: "1.5rem",
        xl3: "2rem",
      },
      keyframes: {
        sheetUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeJustIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        popIn: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.12)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(28px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        heartBurst: {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.35)" },
          "60%": { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)" },
        },
        spinSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        sheetUp: "sheetUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        fadeIn: "fadeIn 0.4s ease both",
        fadeJustIn: "fadeJustIn 0.35s ease both",
        rise: "rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        pop: "pop 0.25s ease both",
        popIn: "popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        slideIn: "slideIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        scaleIn: "scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.4s linear infinite",
        floaty: "floaty 3s ease-in-out infinite",
        heartBurst: "heartBurst 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
        spinSlow: "spinSlow 1.1s linear infinite",
      },
    },
  },
  plugins: [],
};
