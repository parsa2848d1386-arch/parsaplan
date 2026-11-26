import React, { Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig, LayoutGroup } from 'framer-motion';
import { setupPwaAutoUpdater } from './services/pwaManager';
import { setupGlobalHapticListeners } from './utils/haptics';
import { StoreProvider, useStore } from './context/StoreContext';
import { FocusProvider } from './context/FocusContext';
import Layout from './components/Layout';
import { AppShellSkeleton } from './components/Skeleton';
import { routeImporters } from './utils/routePrefetch';
import ScrollToTop from './components/ScrollToTop';
import { FloatingPiPWidget } from './components/focus/FloatingPiPWidget';
import { CommandPalette } from './components/CommandPalette';
import { MorningPlanningModal } from './components/rituals/MorningPlanningModal';
import { EveningReflectionModal } from './components/rituals/EveningReflectionModal';
import { BrainDumpModal } from './components/BrainDumpModal';
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

function App() {
    useEffect(() => {
        const cleanupPwa = setupPwaAutoUpdater();
        const cleanupHaptics = setupGlobalHapticListeners();
        return () => {
            cleanupPwa();
            cleanupHaptics();
        };
    }, []);

    return (
        <MotionConfig reducedMotion="user">
            <StoreProvider>
                <FocusProvider>
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
                            <BrainDumpModal />
                        </HashRouter>
                        </LayoutGroup>
                        <ToastContainer />
                        <ConfirmModal />
                        <LevelUpShowcase />
                        <ConfettiContainer />
                        <FocusTimer />
                        <FloatingPiPWidget />
                    </ErrorBoundary>
                </FocusProvider>
            </StoreProvider>
        </MotionConfig>
    );
}

export default App;