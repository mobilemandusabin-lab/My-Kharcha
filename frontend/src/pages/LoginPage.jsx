import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const showQuickAddMsg = next.startsWith('/quick-add');

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back');
      nav(next, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05, type: 'spring' }} className="h-16 w-16 mx-auto rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center text-2xl font-bold shadow-float">रु</motion.div>
          <h1 className="text-3xl font-semibold tracking-tight mt-4">MyKharcha</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Sign in to manage your money</p>
        </div>

        <div className="card p-6 shadow-card">
          {showQuickAddMsg && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 text-amber-900 text-sm font-medium">
              Please log in first to use Quick Add.
            </motion.div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input className="input pl-11" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input className="input pl-11" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} disabled={loading} className="btn-primary w-full py-3.5 text-base mt-2">
              {loading ? <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <LogIn size={18} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>
          <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 mt-5 text-center">
            New here? <Link className="text-teal-700 font-semibold inline-flex items-center gap-1" to={`/register?next=${encodeURIComponent(next)}`}>Create account <ArrowRight size={14} /></Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
