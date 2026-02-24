import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import Layout from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import ScrollToTop from './components/ScrollToTop';

// Lazy Load Pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const DailyRoutine = React.lazy(() => import('./pages/DailyRoutine'));
const Subjects = React.lazy(() => import('./pages/Subjects'));
const Analysis = React.lazy(() => import('./pages/Analysis'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const History = React.lazy(() => import('./pages/History'));
const Welcome = React.lazy(() => import('./pages/Welcome'));

import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { ToastContainer, ConfirmModal } from './components/Feedback';
import FocusTimer from './components/FocusTimer';

function App() {
  return (
    <StoreProvider>
      <ErrorBoundary>
        <HashRouter>
          <ScrollToTop />
          <Suspense fallback={<LoadingSpinner fullScreen />}>
            <Routes>
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="routine" element={<DailyRoutine />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="analysis" element={<Analysis />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="settings" element={<Settings />} />
                <Route path="history" element={<History />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
        <PWAUpdatePrompt />
        <ToastContainer />
        <ConfirmModal />
        <FocusTimer />
      </ErrorBoundary>
    </StoreProvider>
  );
}

export default App;