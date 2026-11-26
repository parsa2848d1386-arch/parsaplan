import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { ThemePreference, resolveThemeDarkMode } from '../utils/designSystemHelpers';

export type ThemePaletteType = 'indigo' | 'forest' | 'rosegold';
export type { ThemePreference };

interface ThemeContextType {
    darkMode: boolean;
    themePreference: ThemePreference;
    setThemePreference: (pref: ThemePreference) => void;
    toggleDarkMode: () => void;
    setDarkMode: (value: boolean) => void;
    viewMode: 'normal' | 'compact';
    setViewMode: (mode: 'normal' | 'compact') => void;
    showQuotes: boolean;
    toggleShowQuotes: () => void;
    themePalette: ThemePaletteType;
    setThemePalette: (value: ThemePaletteType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemPrefersDark = (): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
        const savedPref = localStorage.getItem('parsaplan_theme_preference') as ThemePreference | null;
        if (savedPref === 'system' || savedPref === 'light' || savedPref === 'dark') {
            return savedPref;
        }
        const legacyDark = localStorage.getItem('parsaplan_dark_mode');
        if (legacyDark === 'true') return 'dark';
        if (legacyDark === 'false') return 'light';
        return 'system';
    });

    const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPrefersDark);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
        setSystemPrefersDark(mql.matches);
        if (typeof mql.addEventListener === 'function') {
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        }
        mql.addListener?.(onChange);
        return () => mql.removeListener?.(onChange);
    }, []);

    const darkMode = resolveThemeDarkMode(themePreference, systemPrefersDark);

    const [viewMode, setViewModeState] = useState<'normal' | 'compact'>(() => {
        return (localStorage.getItem('parsaplan_view_mode') as 'normal' | 'compact') || 'normal';
    });

    const [showQuotes, setShowQuotes] = useState(() => {
        const saved = localStorage.getItem('parsaplan_show_quotes');
        return saved ? saved === 'true' : true;
    });

    const [themePalette, setThemePaletteState] = useState<ThemePaletteType>(() => {
        const saved = localStorage.getItem('parsaplan_theme_palette') as ThemePaletteType | null;
        if (saved === 'indigo' || saved === 'forest' || saved === 'rosegold') return saved;
        return 'indigo';
    });

    const setThemePreference = useCallback((pref: ThemePreference) => {
        localStorage.setItem('parsaplan_theme_preference', pref);
        if (pref === 'system') {
            localStorage.removeItem('parsaplan_dark_mode');
        } else {
            localStorage.setItem('parsaplan_dark_mode', String(pref === 'dark'));
        }
        setThemePreferenceState(pref);
    }, []);

    const toggleDarkMode = useCallback(() => {
        const nextDark = !darkMode;
        const nextPref: ThemePreference = nextDark ? 'dark' : 'light';
        localStorage.setItem('parsaplan_theme_preference', nextPref);
        localStorage.setItem('parsaplan_dark_mode', String(nextDark));
        setThemePreferenceState(nextPref);
    }, [darkMode]);

    const setDarkMode = useCallback((value: boolean) => {
        const nextPref: ThemePreference = value ? 'dark' : 'light';
        localStorage.setItem('parsaplan_theme_preference', nextPref);
        localStorage.setItem('parsaplan_dark_mode', String(value));
        setThemePreferenceState(nextPref);
    }, []);

    const setViewMode = useCallback((mode: 'normal' | 'compact') => {
        localStorage.setItem('parsaplan_view_mode', mode);
        setViewModeState(mode);
    }, []);

    const toggleShowQuotes = useCallback(() => {
        setShowQuotes((prev) => {
            localStorage.setItem('parsaplan_show_quotes', (!prev).toString());
            return !prev;
        });
    }, []);

    const setThemePalette = useCallback((value: ThemePaletteType) => {
        localStorage.setItem('parsaplan_theme_palette', value);
        setThemePaletteState(value);
    }, []);

    // Apply dark mode class, native color-scheme, and status bar tint
    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        root.style.colorScheme = darkMode ? 'dark' : 'light';
    }, [darkMode]);

    // Apply theme palette class to html tag
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('theme-indigo', 'theme-forest', 'theme-rosegold');
        root.classList.add(`theme-${themePalette}`);
    }, [themePalette]);

    return (
        <ThemeContext.Provider
            value={{
                darkMode,
                themePreference,
                setThemePreference,
                toggleDarkMode,
                setDarkMode,
                viewMode,
                setViewMode,
                showQuotes,
                toggleShowQuotes,
                themePalette,
                setThemePalette,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
