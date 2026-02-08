import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AppSettings } from '../types';

interface ThemeContextType {
    darkMode: boolean;
    toggleDarkMode: () => void;
    viewMode: 'normal' | 'compact';
    setViewMode: (mode: 'normal' | 'compact') => void;
    showQuotes: boolean;
    toggleShowQuotes: () => void;
    // Add other UI states if needed
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewModeState] = useState<'normal' | 'compact'>('normal');
    const [showQuotes, setShowQuotes] = useState(true);

    const toggleDarkMode = () => setDarkMode(prev => !prev);
    const setViewMode = (mode: 'normal' | 'compact') => setViewModeState(mode);
    const toggleShowQuotes = () => setShowQuotes(prev => !prev);

    // Apply dark mode class to body/html
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    return (
        <ThemeContext.Provider value={{
            darkMode, toggleDarkMode,
            viewMode, setViewMode,
            showQuotes, toggleShowQuotes
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
