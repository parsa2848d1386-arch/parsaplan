
import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();

    useEffect(() => {
        // Preserve scroll position when returning via Back (Baymard 2026 Back-button continuity)
        if (navigationType === 'POP') return;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }, [pathname, navigationType]);

    return null;
};

export default ScrollToTop;
