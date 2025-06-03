/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0a0a',
        'dark-card': '#161616',
        'dark-border': '#2a2a2a',
        'light-bg': '#ffffff',
        'light-card': '#f9fafb',
        'light-border': '#e5e7eb',
        'primary-blue': '#3b82f6',
        'primary-purple': '#8b5cf6',
      }
    },
  },
  plugins: [],
} 