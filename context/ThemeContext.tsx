import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type ThemePaletteType = 'indigo' | 'forest' | 'rosegold';

interface ThemeContextType {
    darkMode: boolean;
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

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Load from localStorage if exists
    const [darkMode, setDarkModeState] = useState(() => {
        const saved = localStorage.getItem('parsaplan_dark_mode');
        return saved ? saved === 'true' : false;
    });
    
    const [viewMode, setViewModeState] = useState<'normal' | 'compact'>(() => {
        return (localStorage.getItem('parsaplan_view_mode') as 'normal' | 'compact') || 'normal';
    });
    
    const [showQuotes, setShowQuotes] = useState(() => {
        const saved = localStorage.getItem('parsaplan_show_quotes');
        return saved ? saved === 'true' : true;
    });

    const [themePalette, setThemePaletteState] = useState<ThemePaletteType>(() => {
        return (localStorage.getItem('parsaplan_theme_palette') as ThemePaletteType) || 'indigo';
    });

    const toggleDarkMode = () => setDarkModeState(prev => {
        localStorage.setItem('parsaplan_dark_mode', (!prev).toString());
        return !prev;
    });

    const setDarkMode = (value: boolean) => {
        localStorage.setItem('parsaplan_dark_mode', value.toString());
        setDarkModeState(value);
    };

    const setViewMode = (mode: 'normal' | 'compact') => {
        localStorage.setItem('parsaplan_view_mode', mode);
        setViewModeState(mode);
    };

    const toggleShowQuotes = () => setShowQuotes(prev => {
        localStorage.setItem('parsaplan_show_quotes', (!prev).toString());
        return !prev;
    });

    const setThemePalette = (value: ThemePaletteType) => {
        localStorage.setItem('parsaplan_theme_palette', value);
        setThemePaletteState(value);
    };

    // Apply dark mode class to body/html
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // Apply theme palette class to html tag (2026 Theme Palettes)
    useEffect(() => {
        document.documentElement.classList.remove('theme-indigo', 'theme-forest', 'theme-rosegold');
        document.documentElement.classList.add(`theme-${themePalette}`);
    }, [themePalette]);

    return (
        <ThemeContext.Provider value={{
            darkMode, toggleDarkMode, setDarkMode,
            viewMode, setViewMode,
            showQuotes, toggleShowQuotes,
            themePalette, setThemePalette
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
};
