/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        // MD3 Light/Dark Tones
        primary: {
          0: '#000000',
          10: '#00210e',
          20: '#00391c',
          30: '#00522b',
          40: '#006d3b',
          50: '#00894c',
          60: '#00a65d',
          70: '#00c46f',
          80: '#00e381',
          90: '#3eff94',
          95: '#baffc8',
          99: '#f7ffee',
          100: '#ffffff',
          // Legacy mappings
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        surface: {
          light: '#fdfdfd',
          dark: '#1a1c1e',
          container: {
            light: '#f3f4f9',
            dark: '#2d3033'
          }
        },
        accent: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        sage: {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c7cfc7',
          300: '#a1afa1',
          400: '#7a8a7a',
          500: '#5e6f5e',
          600: '#4a5a4a',
          700: '#3d483d',
          800: '#333c33',
          900: '#2d332d',
        }
      },
      borderRadius: {
        'md3': '28px',
        'md3-small': '12px',
        'md3-medium': '16px',
        'md3-large': '24px',
      },
      boxShadow: {
        'md3-1': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'md3-2': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'md3-3': '0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px 0 rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
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
      },
    },
  },
  plugins: [],
};