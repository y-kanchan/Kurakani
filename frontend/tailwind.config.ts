/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        cyan: {
          DEFAULT: '#00D4FF',
          50: '#E5FAFF',
          100: '#CCF5FF',
          200: '#99EBFF',
          300: '#66E0FF',
          400: '#33D6FF',
          500: '#00D4FF',
          600: '#00ABCC',
          700: '#008099',
          800: '#005566',
          900: '#002B33',
        },
        dark: {
          50: '#1a1a2e',
          100: '#16213e',
          200: '#0f3460',
          300: '#0d1b2a',
          400: '#0a0e1a',
          500: '#080c16',
          bg: '#0a0e1a',
          card: '#111827',
          border: '#1f2937',
          hover: '#1a2236',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'aura-gradient': 'linear-gradient(135deg, #00D4FF 0%, #7B2FBE 50%, #FF6B6B 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(123,47,190,0.05) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-ring': 'pulseRing 1.5s ease-in-out infinite',
        'blob': 'blob 7s infinite',
        'typing': 'typing 1.4s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.5' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        typing: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(-6px)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 212, 255, 0.4)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
