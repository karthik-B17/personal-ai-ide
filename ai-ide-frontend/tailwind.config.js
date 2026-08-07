/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#14151A",
        panel: "#1B1D23",
        raised: "#22242B",
        line: "#2C2F38",
        "line-soft": "#23252C",
        ink: "#E7E8EC",
        "ink-muted": "#8B8F9C",
        "ink-faint": "#5B5F6B",
        amber: {
          DEFAULT: "#D9A441",
          hover: "#F0B429",
          dim: "rgba(217,164,65,0.14)",
        },
        add: "#4FAE7A",
        "add-bg": "rgba(79,174,122,0.12)",
        del: "#D9707A",
        "del-bg": "rgba(217,112,122,0.12)",
      },
      fontFamily: {
        ui: ["Manrope", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
