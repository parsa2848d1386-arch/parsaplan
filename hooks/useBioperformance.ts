import { useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { resolveBioPhase } from '../utils/designSystemHelpers';

export const useBioperformance = () => {
    const { settings, darkMode, updateSettings } = useStore();
    const lastBioPhaseRef = useRef<string | null>(null);
    const darkModeRef = useRef(darkMode);
    darkModeRef.current = darkMode;

    useEffect(() => {
        const root = document.documentElement;
        // Always strip legacy classes to prevent accidental GPU filter side effects
        root.classList.remove('bio-morning', 'bio-day', 'bio-evening', 'bio-night');

        if (!settings?.bioTheme) {
            lastBioPhaseRef.current = null;
            delete root.dataset.bioPhase;
            return;
        }

        const applyBioTheme = () => {
            const { phase, isDarkTarget } = resolveBioPhase(new Date().getHours());

            // Only auto-switch darkMode on activation or natural circadian phase transitions
            if (lastBioPhaseRef.current !== phase) {
                lastBioPhaseRef.current = phase;
                if (isDarkTarget !== darkModeRef.current) {
                    updateSettings({ darkMode: isDarkTarget });
                }
            }

            root.dataset.bioPhase = phase;
        };

        applyBioTheme();
        const interval = setInterval(applyBioTheme, 60000);
        return () => clearInterval(interval);
    }, [settings?.bioTheme, updateSettings]);
};
