/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyberpunk Neon Color Palette
        'cyber-purple': {
          50: '#f3f1ff',
          100: '#e5dbff',
          200: '#d1bfff',
          300: '#b794ff',
          400: '#9d5cff',
          500: '#711c91',
          600: '#5a1480',
          700: '#4a0f6b',
          800: '#3d0d57',
          900: '#2f0a43',
        },
        'cyber-pink': {
          50: '#fdf2ff',
          100: '#fce7ff',
          200: '#fbcff8',
          300: '#f9a8f4',
          400: '#f472f2',
          500: '#ea00d9',
          600: '#c026a3',
          700: '#a21c85',
          800: '#861a6b',
          900: '#6b1a57',
        },
        'cyber-cyan': {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#0abdc6',
          600: '#0891a2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        'cyber-blue': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#133e7c',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'cyber-navy': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#091833',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        cyber: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'neon-glow': 'neonGlow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        neonGlow: {
          '0%': {
            boxShadow: '0 0 5px #0abdc6, 0 0 10px #0abdc6, 0 0 15px #0abdc6',
            textShadow: '0 0 5px #0abdc6',
          },
          '100%': {
            boxShadow: '0 0 10px #0abdc6, 0 0 20px #0abdc6, 0 0 30px #0abdc6',
            textShadow: '0 0 10px #0abdc6',
          },
        },
      },
    },
  },
  plugins: [],
};
