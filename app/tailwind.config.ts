import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          bg: '#0f0e0b',
          surface: '#1a1814',
          'surface-2': '#252219',
          border: 'rgba(255, 255, 255, 0.07)',
          text: 'rgba(255, 255, 255, 0.75)',
          'text-muted': 'rgba(255, 255, 255, 0.4)',
          heading: '#ffffff',
          accent: '#cda45e',
          'accent-hover': '#d4b06e',
          'accent-subtle': 'rgba(205, 164, 94, 0.1)',
          danger: '#ef4444',
          success: '#22c55e',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        playfair: ['Playfair Display', 'serif'],
        poppins: ['Poppins', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fade-in 0.2s ease-in-out',
      },
    },
  },
  plugins: [],
}

export default config
