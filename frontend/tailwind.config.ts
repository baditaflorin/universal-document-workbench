import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        mist: "#f8fafc",
        lagoon: "#0f766e",
        plum: "#6d28d9",
        ember: "#c2410c",
      },
      boxShadow: {
        panel: "0 18px 45px rgb(23 32 51 / 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
