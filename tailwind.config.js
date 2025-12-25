/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        workflow: {
          start: '#22C55E',
          end: '#EF4444',
          action: '#0EA5E9',
          mutation: '#8B5CF6',
          query: '#3B82F6',
          condition: '#F59E0B',
          delay: '#6366F1',
          parallel: '#EC4899',
          loop: '#14B8A6',
          ai: '#A855F7',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
