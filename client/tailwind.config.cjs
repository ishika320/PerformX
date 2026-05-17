module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#e6edff',
          500: '#6c5ce7',
          600: '#5a4bd6'
        },
        accent: {
          50: '#fff5fb',
          100: '#ffe6f3',
          500: '#ff6b9f',
        }
      },
      backgroundImage: {
        'gradient-radial-lg': 'radial-gradient(circle at 10% 10%, rgba(108,92,231,0.12), transparent 15%, transparent), radial-gradient(circle at 90% 90%, rgba(255,107,159,0.08), transparent 15%, transparent)'
      },
      boxShadow: {
        'soft-lg': '0 10px 30px rgba(16,24,40,0.08)'
      }
    },
  },
  plugins: [],
}
