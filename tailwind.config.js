/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          50: '#F5F0E8',
          100: '#E8DFD0',
          200: '#D4C4A8',
          300: '#B89F7A',
          400: '#9C7A4E',
          500: '#8B5A2B',
          600: '#734821',
          700: '#5A381A',
          800: '#422913',
          900: '#2A1A0C',
        },
        brass: {
          50: '#FBF5E5',
          100: '#F5E9C6',
          200: '#EBD694',
          300: '#DEC162',
          400: '#D4AE3C',
          500: '#B8860B',
          600: '#9A6E08',
          700: '#7B5606',
          800: '#5C4004',
          900: '#3D2A03',
        },
        ink: {
          50: '#F0F2F5',
          100: '#D9DEE5',
          200: '#B5BECB',
          300: '#8A96A8',
          400: '#5F7085',
          500: '#2C3E50',
          600: '#243242',
          700: '#1C2733',
          800: '#141B24',
          900: '#0C1015',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Lora"', 'serif'],
      },
      boxShadow: {
        'card': '0 4px 20px rgba(139, 90, 43, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 8px 30px rgba(139, 90, 43, 0.15), 0 2px 6px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
