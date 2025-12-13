/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f172a', // Slate 900
          start: '#0f172a',
          end: '#1e1b4b', // Indigo 950
        },
        card: {
          bg: 'rgba(30, 41, 59, 0.7)', // Slate 800 alpha
          border: 'rgba(255, 255, 255, 0.1)',
        },
        primary: {
          DEFAULT: '#6366f1', // Indigo 500
          glow: 'rgba(99, 102, 241, 0.5)',
        },
        secondary: {
          DEFAULT: '#10b981', // Emerald 500
        },
        accent: {
          DEFAULT: '#f472b6', // Pink 400
        },
      },
      animation: {
        'float': 'float 10s ease-in-out infinite',
        'float-reverse': 'float 12s ease-in-out infinite reverse',
        'spin-slow': 'spin 3s linear infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(30px, 50px)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
