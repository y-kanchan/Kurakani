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
        pink: {
          DEFAULT: '#ff4d94',
          50: '#fff0f6',
          100: '#ffdeeb',
          200: '#ffb3d1',
          300: '#ff80b3',
          400: '#ff4d94',
          500: '#ff1a75',
          600: '#e6005c',
          700: '#b30047',
          800: '#800033',
          900: '#4d001f',
        },
        dark: {
          50: '#1a000a',
          100: '#15050a',
          200: '#0f0505',
          300: '#0a0a0a',
          400: '#050505',
          500: '#000000',
          bg: '#050505',
          card: '#0a0a0a',
          border: '#1a1a1a',
          hover: '#151515',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'aura-gradient': 'linear-gradient(135deg, #ff4d94 0%, #7B2FBE 50%, #ff0066 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,77,148,0.05) 0%, rgba(123,47,190,0.05) 100%)',
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
        'glow': '0 0 20px rgba(255, 77, 148, 0.3)',
        'glow-lg': '0 0 40px rgba(255, 77, 148, 0.4)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.6)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
}
