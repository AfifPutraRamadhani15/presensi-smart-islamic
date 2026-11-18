/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--primary) / <alpha-value>)',
        dark: '#064E3B',
        emerald: '#10B981',
        light: '#D1FAE5',
        surface: '#F5FAF7',
        gold: '#D4AF37',
        ink: '#172B24',
      },
      boxShadow: { soft: '0 8px 30px rgba(6,78,59,.10)' },
    },
  },
  plugins: [],
};
