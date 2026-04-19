/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        tajawal: ["'Tajawal'", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,.05)",
        cardHover: "0 12px 28px rgba(99,102,241,.15)",
      },
    },
  },
  plugins: [],
};
