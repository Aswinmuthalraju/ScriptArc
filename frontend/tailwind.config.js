/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                outfit: ['Outfit', 'sans-serif'],
                manrope: ['Manrope', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',

                /* Surface layers */
                surface: 'hsl(var(--surface))',
                'surface-elevated': 'hsl(var(--surface-elevated))',
                'surface-highlight': 'hsl(var(--surface-elevated))',

                /* Semantic */
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',

                /* Palette */
                warning: '#F59E0B',
                cyan: '#38BDF8',
                'text-secondary': 'hsl(var(--foreground-muted))',
            },
            borderRadius: {
                lg: '1rem',
                md: '0.75rem',
                sm: '0.5rem',
                xl: '1.25rem',
                '2xl': '1.5rem',
            },
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'orb-drift': 'orb-drift 60s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'float': 'float 4s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'star-twinkle': 'star-twinkle 3s ease-in-out infinite',
                'fade-in': 'page-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'orb-drift': {
                    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
                    '25%': { transform: 'translate(40px, -30px) scale(1.05)' },
                    '50%': { transform: 'translate(-30px, 40px) scale(0.95)' },
                    '75%': { transform: 'translate(20px, 20px) scale(1.02)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 6px currentColor)' },
                    '50%': { opacity: '0.7', filter: 'drop-shadow(0 0 16px currentColor)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'star-twinkle': {
                    '0%, 100%': { opacity: '0.15', transform: 'scale(1)' },
                    '50%': { opacity: '0.6', transform: 'scale(1.3)' },
                },
                'page-enter': {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
            boxShadow: {
                'glow-primary': '0 0 24px rgba(37, 99, 235, 0.3)',
                'glow-primary-sm': '0 0 12px rgba(37, 99, 235, 0.2)',
                'card': '0 4px 24px rgba(0, 0, 0, 0.2)',
                'card-hover': '0 8px 40px rgba(0, 0, 0, 0.3)',
                'glass': '0 4px 24px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
            },
            backdropBlur: {
                xs: '4px',
            },
            transitionTimingFunction: {
                'spring': 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
        }
    },
    plugins: [require("tailwindcss-animate")],
};
