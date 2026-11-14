/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Design Tokens from ParsaPlan Concept
                primary: '#4648d4',
                'on-primary': '#ffffff',
                'primary-container': '#6063ee',
                'on-primary-container': '#fffbff',
                'primary-fixed': '#e1e0ff',
                'primary-fixed-dim': '#c0c1ff',
                'on-primary-fixed': '#07006c',
                'on-primary-fixed-variant': '#2f2ebe',
                'inverse-primary': '#c0c1ff',

                secondary: '#006c49',
                'on-secondary': '#ffffff',
                'secondary-container': '#6cf8bb',
                'on-secondary-container': '#00714d',
                'secondary-fixed': '#6ffbbe',
                'secondary-fixed-dim': '#4edea3',
                'on-secondary-fixed': '#002113',
                'on-secondary-fixed-variant': '#005236',

                tertiary: '#825100',
                'on-tertiary': '#ffffff',
                'tertiary-container': '#a36700',
                'on-tertiary-container': '#fffbff',
                'tertiary-fixed': '#ffddb8',
                'tertiary-fixed-dim': '#ffb95f',
                'on-tertiary-fixed': '#2a1700',
                'on-tertiary-fixed-variant': '#653e00',

                surface: '#f8f9ff',
                'on-surface': '#0b1c30',
                'surface-variant': '#d3e4fe',
                'on-surface-variant': '#464554',
                'surface-dim': '#cbdbf5',
                'surface-bright': '#f8f9ff',
                'surface-container-lowest': '#ffffff',
                'surface-container-low': '#eff4ff',
                'surface-container': '#e5eeff',
                'surface-container-high': '#dce9ff',
                'surface-container-highest': '#d3e4fe',

                outline: '#767586',
                'outline-variant': '#c7c4d7',
                'inverse-surface': '#213145',
                'inverse-on-surface': '#eaf1ff',
                'surface-tint': '#494bd6',

                // Error colors
                error: '#ba1a1a',
                'on-error': '#ffffff',
                'error-container': '#ffdad6',
                'on-error-container': '#93000a',

                // Premium Gray palette
                gray: {
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                    300: '#d4d4d8',
                    400: '#a1a1aa',
                    500: '#71717a',
                    600: '#52525b',
                    700: '#3f3f46',
                    800: '#27272a',
                    900: '#18181b',
                    950: '#09090b',
                },
                // Premium Indigo
                indigo: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                // Premium Violet
                violet: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                }
            },
            screens: {
                '2xs': '320px',
                'xs': '375px',
                '3xl': '1920px',
                '4xl': '2560px',
            },
            spacing: {
                'space-xs': '0.25rem',
                'space-sm': '0.5rem',
                'space-md': '1rem',
                'space-lg': '1.5rem',
                'space-xl': '2rem',
                'margin': '1rem',
                'margin-desktop': '2rem',
                'gutter': '1rem',
                'gutter-desktop': '1.5rem',
            },
            fontFamily: {
                'display-lg': ['Plus Jakarta Sans', 'Vazirmatn', 'sans-serif'],
                'headline-lg': ['Plus Jakarta Sans', 'Vazirmatn', 'sans-serif'],
                'headline-md': ['Plus Jakarta Sans', 'Vazirmatn', 'sans-serif'],
                'body-lg': ['Inter', 'Vazirmatn', 'sans-serif'],
                'body-md': ['Inter', 'Vazirmatn', 'sans-serif'],
                'body-sm': ['Inter', 'Vazirmatn', 'sans-serif'],
                'label-md': ['Inter', 'Vazirmatn', 'sans-serif'],
                'label-sm': ['Inter', 'Vazirmatn', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'bounce-subtle': 'bounceSubtle 0.6s ease-out',
                'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 3s ease-in-out infinite',
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
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                bounceSubtle: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-3px)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
            },
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
                'premium': '0 10px 40px -10px rgba(99, 102, 241, 0.2)',
                'card': '0 2px 10px -2px rgba(0, 0, 0, 0.08)',
                'card-hover': '0 12px 24px -6px rgba(0, 0, 0, 0.1)',
            },
            backdropBlur: {
                'glass': '10px',
            }
        },
    },
    plugins: [],
}
