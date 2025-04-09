/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          'green': '#A7D700', // Verde Neon
          'orange': '#F15A24', // Laranja Vibrante
          'purple': '#2F2D82', // Roxo Escuro
          'blue': '#192b56', // Azul Escuro
          'sand': '#F9F9F6', // Branco Areia
          'gray': '#E5E5E5', // Cinza Claro
        },
      },
    },
  },
  plugins: [],
};
