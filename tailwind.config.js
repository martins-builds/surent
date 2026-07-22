/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a3c5e',
          dark: '#12293f',
          light: '#2c5680'
        },
        accent: {
          DEFAULT: '#f57c00',
          dark: '#c96400',
          light: '#ff9d33'
        },
        bg: '#f5f5f5',
        ink: '#333333'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      }
    },
  },
  plugins: [],
}
