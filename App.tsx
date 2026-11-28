import React, { Suspense, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig, LayoutGroup, LazyMotion, domMax } from 'framer-motion';
import { setupPwaAutoUpdater } from './services/pwaManager';
import { setupGlobalHapticListeners } from './utils/haptics';
import { StoreProvider, useStore } from './context/StoreContext';
import { FocusProvider, useOptionalFocus } from './context/FocusContext';
import { useUI } from './context/UIContext';
import Layout from './components/Layout';
import { AppShellSkeleton } from './components/Skeleton';
import { routeImporters } from './utils/routePrefetch';
import ScrollToTop from './components/ScrollToTop';
import { CommandPalette } from './components/CommandPalette';
import { MorningPlanningModal } from './components/rituals/MorningPlanningModal';
import { EveningReflectionModal } from './components/rituals/EveningReflectionModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer, ConfirmModal, LevelUpShowcase, ConfettiContainer } from './components/Feedback';
import FocusTimer from './components/FocusTimer';

// Lazy Load Pages via shared importers (supports instant hover/idle prefetching)
const Dashboard = React.lazy(routeImporters['/']);
const Subjects = React.lazy(routeImporters['/subjects']);
const Analysis = React.lazy(routeImporters['/analysis']);
const Settings = React.lazy(routeImporters['/settings']);
const Leaderboard = React.lazy(routeImporters['/leaderboard']);
const History = React.lazy(routeImporters['/history']);
const Welcome = React.lazy(routeImporters['/welcome']);
const AIChat = React.lazy(routeImporters['/ai-chat']);
const VisualPlanner = React.lazy(routeImporters['/planner']);

const isAutostartRequested = (): boolean => {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('autostart') === '1') return true;
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    return new URLSearchParams(hashQuery).get('autostart') === '1';
};

const FirstVisitGate: React.FC = () => {
    const { user } = useStore();
    let hasOnboarded = false;
    try {
        if (isAutostartRequested()) {
            localStorage.setItem('parsaplan_onboarded', '1');
            hasOnboarded = true;
        } else {
            hasOnboarded = localStorage.getItem('parsaplan_onboarded') === '1';
        }
    } catch {
        hasOnboarded = isAutostartRequested();
    }
    if (!user && !hasOnboarded) {
        return <Navigate to="/welcome" replace />;
    }
    return <Layout />;
};

const AppLifecycleEffects: React.FC = () => {
    const focus = useOptionalFocus();
    const { showToast } = useUI();
    const focusStatusRef = useRef(focus?.status ?? 'idle');
    focusStatusRef.current = focus?.status ?? 'idle';

    useEffect(() => {
        const cleanupPwa = setupPwaAutoUpdater({
            onUpdateAvailable: (applyUpdate) => {
                if (focusStatusRef.current === 'running') {
                    showToast('نسخه جدید برنامه آماده است.', 'info', {
                        durationMs: 12000,
                        action: {
                            label: 'به‌روزرسانی',
                            onClick: () => {
                                void applyUpdate();
                            },
                        },
                    });
                    return true;
                }
                return false;
            },
        });
        const cleanupHaptics = setupGlobalHapticListeners();
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.warn('[ParsaPlan] Unhandled async rejection:', event.reason);
        };
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            cleanupPwa();
            cleanupHaptics();
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [showToast]);

    return null;
};

function App() {
    return (
        <LazyMotion features={domMax}>
        <MotionConfig reducedMotion="user">
            <StoreProvider>
                <FocusProvider>
                    <AppLifecycleEffects />
                    <ErrorBoundary>
                        <LayoutGroup id="app-shell-morph">
                        <HashRouter>
                            <ScrollToTop />
                            <Routes>
                                <Route
                                    path="/welcome"
                                    element={
                                        <Suspense fallback={<AppShellSkeleton />}>
                                            <Welcome />
                                        </Suspense>
                                    }
                                />
                                <Route path="/" element={<FirstVisitGate />}>
                                    <Route index element={<Dashboard />} />
                                    <Route path="planner" element={<VisualPlanner />} />
                                    <Route path="subjects" element={<Subjects />} />
                                    <Route path="analysis" element={<Analysis />} />
                                    <Route path="leaderboard" element={<Leaderboard />} />
                                    <Route path="settings" element={<Settings />} />
                                    <Route path="history" element={<History />} />
                                    <Route path="ai-chat" element={<AIChat />} />

                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Route>
                            </Routes>
                            <CommandPalette />
                            <MorningPlanningModal />
                            <EveningReflectionModal />
                        </HashRouter>
                        </LayoutGroup>
                        <ToastContainer />
                        <ConfirmModal />
                        <LevelUpShowcase />
                        <ConfettiContainer />
                        <FocusTimer />
                    </ErrorBoundary>
                </FocusProvider>
            </StoreProvider>
        </MotionConfig>
        </LazyMotion>
    );
}

export default App;