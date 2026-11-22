import React, { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, History, PlusCircle, BarChart3, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/history', label: 'History', icon: History },
  { to: '/add', label: 'Add', icon: PlusCircle },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const { setTheme } = useTheme();
  useEffect(() => { (async () => { try { const { data } = await api.get('/settings'); if (data.settings?.theme) setTheme(data.settings.theme); } catch {} })(); }, []);
  return (
    <div className="min-h-screen bg-transparent" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
      <div className="max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto min-h-screen px-0 md:px-4">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto px-3 pb-2">
          <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-card border-slate-200/70 dark:border-slate-800 grid grid-cols-5 px-1 py-1">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className="relative flex flex-col items-center justify-center py-2.5 min-h-[56px] text-[11px] font-medium">
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-x-1 inset-y-1 rounded-2xl bg-teal-50 dark:bg-teal-950/50"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className={cn('relative z-10 flex flex-col items-center gap-0.5', isActive ? 'text-teal-800 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500')}>
                      <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                      <span className={isActive ? 'font-semibold' : ''}>{label}</span>
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
