import { useEffect } from 'react';
import { useStore } from '../context/StoreContext';

export const useBioperformance = () => {
    const { settings, toggleDarkMode, darkMode, updateSettings } = useStore();

    useEffect(() => {
        if (!settings?.bioTheme) {
            // Remove any biorhythm classes if disabled
            document.documentElement.classList.remove('bio-morning', 'bio-day', 'bio-evening', 'bio-night');
            return;
        }

        const applyBioTheme = () => {
            const hour = new Date().getHours();
            let isDarkTarget = false;
            let bioClass = '';

            if (hour >= 5 && hour < 9) {
                // 5 AM - 9 AM: Morning (Sharp, energetic, bright)
                isDarkTarget = false;
                bioClass = 'bio-morning';
            } else if (hour >= 9 && hour < 17) {
                // 9 AM - 5 PM: Day (Productive, light)
                isDarkTarget = false;
                bioClass = 'bio-day';
            } else if (hour >= 17 && hour < 21) {
                // 5 PM - 9 PM: Evening (Warm, transitioning to dark)
                isDarkTarget = true;
                bioClass = 'bio-evening';
            } else {
                // 9 PM - 5 AM: Night (Dark, calm, low contrast)
                isDarkTarget = true;
                bioClass = 'bio-night';
            }

            // Sync with actual dark mode state cleanly
            if (isDarkTarget !== darkMode) {
                updateSettings({ darkMode: isDarkTarget });
            }

            // Manage bio classes on the root HTML element for custom CSS hook-ins
            const root = document.documentElement;
            root.classList.remove('bio-morning', 'bio-day', 'bio-evening', 'bio-night');
            root.classList.add(bioClass);
        };

        // Initial apply
        applyBioTheme();

        // Check every minute
        const interval = setInterval(applyBioTheme, 60000);

        return () => clearInterval(interval);
    }, [settings?.bioTheme, darkMode, updateSettings]);
};
