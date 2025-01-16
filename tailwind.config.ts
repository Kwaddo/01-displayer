import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      "t-black": "#29353C",
      "t-darkb": "#44576D",
      "t-normalg": "#768A96",
      "t-normalb": "#AAC7D8",
      "t-lightb": "#DFEBF6",
      "t-lightg": "#E6E6E6",
    },
    extend: {},
  },
  plugins: [],
} satisfies Config;
