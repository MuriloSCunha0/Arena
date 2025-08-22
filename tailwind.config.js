/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          'green': '#A7D700', // Verde Neon
          'green-light': '#B8E600',
          'green-dark': '#8FB300',
          'orange': '#F15A24', // Laranja Vibrante
          'orange-light': '#FF7A47',
          'orange-dark': '#D44A1F',
          'purple': '#2F2D82', // Roxo Escuro
          'purple-light': '#413D9F',
          'purple-dark': '#262468',
          'blue': '#192b56', // Azul Escuro
          'blue-light': '#2D4A7A',
          'blue-dark': '#12213F',
          'sand': '#F9F9F6', // Branco Areia
          'sand-light': '#FCFCFA',
          'sand-dark': '#F0F0ED',
          'gray': '#E5E5E5', // Cinza Claro
          'gray-light': '#F3F3F3',
          'gray-dark': '#D1D1D1',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
