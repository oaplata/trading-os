/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores semánticos para trading
        profit: {
          DEFAULT: '#10b981', // Verde para ganancias
          light: '#34d399',
          dark: '#059669',
        },
        loss: {
          DEFAULT: '#ef4444', // Rojo para pérdidas
          light: '#f87171',
          dark: '#dc2626',
        },
        neutral: {
          DEFAULT: '#eab308', // Amarillo para BE/neutral
          light: '#facc15',
          dark: '#ca8a04',
        },
        info: {
          DEFAULT: '#3b82f6', // Azul para info
          light: '#60a5fa',
          dark: '#2563eb',
        },
        // Fondos oscuros tipo terminal
        background: {
          DEFAULT: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#1a1a1a',
          card: '#151515',
        },
        border: {
          DEFAULT: '#262626',
          light: '#404040',
        },
        text: {
          DEFAULT: '#fafafa',
          secondary: '#a3a3a3',
          muted: '#737373',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
    },
  },
  plugins: [],
};

