import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { FocusProvider } from './context/FocusContext';
import Layout from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import ScrollToTop from './components/ScrollToTop';
import { FloatingPiPWidget } from './components/focus/FloatingPiPWidget';
import { CommandPalette } from './components/CommandPalette';
import { MorningPlanningModal } from './components/rituals/MorningPlanningModal';
import { EveningReflectionModal } from './components/rituals/EveningReflectionModal';
import { BrainDumpModal } from './components/BrainDumpModal';

// Lazy Load Pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const DailyRoutine = React.lazy(() => import('./pages/DailyRoutine'));
const Subjects = React.lazy(() => import('./pages/Subjects'));
const Analysis = React.lazy(() => import('./pages/Analysis'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const History = React.lazy(() => import('./pages/History'));
const Welcome = React.lazy(() => import('./pages/Welcome'));
const AIChat = React.lazy(() => import('./pages/AIChat'));
const VisualPlanner = React.lazy(() => import('./pages/VisualPlanner'));
const WorkspaceNotes = React.lazy(() => import('./pages/WorkspaceNotes'));
const LeitnerBox = React.lazy(() => import('./pages/LeitnerBox'));


import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer, ConfirmModal, LevelUpShowcase, ConfettiContainer } from './components/Feedback';
import FocusTimer from './components/FocusTimer';

function App() {
  return (
    <StoreProvider>
      <FocusProvider>
        <ErrorBoundary>
          <HashRouter>
            <ScrollToTop />
            <Suspense fallback={<LoadingSpinner fullScreen />}>
              <Routes>
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="routine" element={<DailyRoutine />} />
                  <Route path="planner" element={<VisualPlanner />} />
                  <Route path="subjects" element={<Subjects />} />
                  <Route path="notes" element={<WorkspaceNotes />} />
                  <Route path="leitner" element={<LeitnerBox />} />
                  <Route path="analysis" element={<Analysis />} />
                  <Route path="leaderboard" element={<Leaderboard />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="history" element={<History />} />
                  <Route path="ai-chat" element={<AIChat />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
            <CommandPalette />
            <MorningPlanningModal />
            <EveningReflectionModal />
            <BrainDumpModal />
          </HashRouter>
          <ToastContainer />
          <ConfirmModal />
          <LevelUpShowcase />
          <ConfettiContainer />
          <FocusTimer />
          <FloatingPiPWidget />
        </ErrorBoundary>
      </FocusProvider>
    </StoreProvider>
  );
}

export default App;