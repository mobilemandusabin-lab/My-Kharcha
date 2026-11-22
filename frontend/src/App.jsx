import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import QuickAddPage from './pages/QuickAddPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import BudgetsPage from './pages/BudgetsPage';
import FamilyPage from './pages/FamilyPage';
import Layout from './components/Layout';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800/60">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-card">रु</div>
          <div className="mt-3 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Loading MyKharcha...</div>
        </motion.div>
      </div>
    );
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800/60">
      <div className="h-12 w-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-card animate-pulse">रु</div>
    </div>
  );
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<DashboardPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="add" element={<QuickAddPage />} />
          <Route path="quick-add" element={<QuickAddPage quick />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="family" element={<FamilyPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </AnimatePresence>
  );
}
