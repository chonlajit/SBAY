import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          50: '#f5f9f4',
          100: '#e7f1e6',
          200: '#cfdfcd',
          300: '#acc6a9',
          400: '#85bb6e',
          500: '#7ab363',
          600: '#64964e',
          700: '#5c8c47',
          800: '#497039',
          900: '#3b5a2e',
        }
      },
      fontFamily: {
        sans: ['var(--font-prompt)', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
