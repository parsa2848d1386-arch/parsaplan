import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DailyRoutine from './pages/DailyRoutine';
import Subjects from './pages/Subjects';
import Analysis from './pages/Analysis';
import Settings from './pages/Settings';
import Leaderboard from './pages/Leaderboard';
import History from './pages/History';

function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
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
      </HashRouter>
    </StoreProvider>
  );
}

export default App;