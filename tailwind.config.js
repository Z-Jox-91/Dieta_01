/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // "Bussola": accento viola vivido, usato solo per CTA, stati attivi, focus e il dato chiave del momento
        primary: {
          50: '#f4f2ff',
          100: '#ebe6ff',
          200: '#d7cdff',
          300: '#b9a3ff',
          400: '#9f83ff',
          500: '#8a6bff',
          600: '#6d4aff',
          700: '#5936e0',
          800: '#472bb3',
          900: '#392390',
        },
        surface: {
          light: '#f9f7f2',
          dark: '#17150f',
          container: {
            light: '#ffffff',
            dark: '#211e17',
            high: {
              dark: '#2a261c',
            },
          }
        },
        // Tono secondario tenue (verde salvia freddo), per badge/informazioni non prioritarie: mai usato per CTA
        accent: {
          50: '#f2f6f5',
          100: '#e1eae8',
          200: '#c3d5d1',
          300: '#9fb8b3',
          400: '#7a9891',
          500: '#5f7d76',
          600: '#4c6961',
          700: '#3f564f',
          800: '#354541',
          900: '#2c3936',
        },
        // Neutro caldo (pietra), base di testo/bordi/superfici per la maggior parte del sito
        sage: {
          50: '#faf8f5',
          100: '#f1ede4',
          200: '#e4ddd0',
          300: '#cfc4b0',
          400: '#a99b83',
          500: '#8a7c66',
          600: '#6f6252',
          700: '#584d40',
          800: '#423a30',
          900: '#2b2722',
        }
      },
      borderRadius: {
        'md3': '28px',
        'md3-small': '12px',
        'md3-medium': '16px',
        'md3-large': '22px',
      },
      boxShadow: {
        'md3-1': '0 1px 2px 0 rgba(43, 39, 34, 0.05), 0 1px 3px 1px rgba(43, 39, 34, 0.04)',
        'md3-2': '0 1px 2px 0 rgba(43, 39, 34, 0.05), 0 6px 18px 2px rgba(43, 39, 34, 0.06)',
        'md3-3': '0 4px 14px 3px rgba(43, 39, 34, 0.08), 0 1px 3px 0 rgba(43, 39, 34, 0.06)',
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