import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: ['class'],
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: '#000000',
                foreground: '#ffffff',
                primary: {
                    DEFAULT: '#CCFF00',
                    foreground: '#000000',
                },
                secondary: {
                    DEFAULT: '#1A1A1A',
                    foreground: '#ffffff',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: '#27272a',
                    foreground: '#a1a1aa',
                },
                accent: {
                    DEFAULT: '#CCFF00',
                    foreground: '#000000',
                },
                popover: {
                    DEFAULT: '#111111',
                    foreground: '#ffffff',
                },
                card: {
                    DEFAULT: '#111111',
                    foreground: '#ffffff',
                },
                // Custom aliases for the new design
                lime: {
                    DEFAULT: '#CCFF00',
                    400: '#CCFF00',
                    500: '#bfff00',
                    600: '#a3d900',
                },
                surface: {
                    DEFAULT: '#111111',
                    hover: '#1A1A1A',
                }
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            fontFamily: {
                sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'fade-out': {
                    from: { opacity: '1' },
                    to: { opacity: '0' },
                },
                'slide-in-from-top': {
                    from: { transform: 'translateY(-100%)' },
                    to: { transform: 'translateY(0)' },
                },
                'slide-in-from-bottom': {
                    from: { transform: 'translateY(100%)' },
                    to: { transform: 'translateY(0)' },
                },
                'slide-in-from-left': {
                    from: { transform: 'translateX(-100%)' },
                    to: { transform: 'translateX(0)' },
                },
                'slide-in-from-right': {
                    from: { transform: 'translateX(100%)' },
                    to: { transform: 'translateX(0)' },
                },
                shimmer: {
                    '100%': { transform: 'translateX(100%)' },
                },
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.2s ease-out',
                'fade-out': 'fade-out 0.2s ease-out',
                'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
                'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
                'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
                'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
                shimmer: 'shimmer 8s linear infinite',
                pulse: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
                'soft-lg': '0 10px 40px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                'glow': '0 0 20px rgba(79, 70, 229, 0.3)',
                'glow-lg': '0 0 40px rgba(79, 70, 229, 0.4)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'mesh-gradient': 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)',
            },
        },
    },
    plugins: [],
};

export default config;
