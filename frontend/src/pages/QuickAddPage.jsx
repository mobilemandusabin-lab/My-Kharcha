import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, Wallet, Users, Calendar, Clock, Tag, CreditCard, FileText, Bookmark } from 'lucide-react';
import api from '../services/api';
import { queueTransaction, syncPendingTransactions } from '../services/offline';
import { v4 as uuidv4 } from 'uuid';
import { Page, Card, Button } from '../components/ui';
import { suggestCategory } from '../utils/categorySuggest';
import { Sparkles } from 'lucide-react';

function nepalNowParts() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function nepalDateTimeToUtcISO(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0) - (5 * 60 + 45) * 60 * 1000;
  return new Date(utcMs).toISOString();
}

export default function QuickAddPage({ quick }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [sp] = useSearchParams();
  const editId = sp.get('edit');
  const isQuick = quick || loc.pathname === '/quick-add';
  const [bootstrap, setBootstrap] = useState(null);
  const [families, setFamilies] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);
  const now = nepalNowParts();
  const [form, setForm] = useState({
    scope: 'personal', familyId: '', type: 'expense', amount: '', title: '', category: '',
    date: now.date, time: now.time, paymentMethod: 'Cash', paidBy: '', notes: '', isBookmarked: false, paymentStatus: 'paid'
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/meta/bootstrap');
        setBootstrap(data);
        setFamilies(data.families || []);
        const me = data.user;
        setForm(f => ({ ...f, paidBy: me?.id || '' }));
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!editId) return;
      try {
        const { data } = await api.get(`/transactions/${editId}`);
        const tx = data.transaction;
        const d = new Date(tx.transactionAt);
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
        const parts = Object.fromEntries(fmt.formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
        setForm(f => ({
          ...f,
          scope: tx.scope,
          familyId: tx.familyId || '',
          type: tx.type,
          amount: String(tx.amount),
          title: tx.title,
          category: tx.category,
          date: `${parts.year}-${parts.month}-${parts.day}`,
          time: `${parts.hour}:${parts.minute}`,
          paymentMethod: tx.paymentMethod || 'Cash',
          paidBy: tx.paidBy || f.paidBy,
          notes: tx.notes || '',
          isBookmarked: !!tx.isBookmarked,
          paymentStatus: tx.paymentStatus || 'paid',
        }));
      } catch (e) { console.error(e); }
    })();
  }, [editId]);

  useEffect(() => {
    (async () => {
      if (form.scope === 'family' && form.familyId) {
        try {
          const { data } = await api.get(`/families/${form.familyId}/members`);
          const active = (data.members || []).filter(m => m.status === 'active');
          setMembers(active);
          if (!form.paidBy && active.length) setForm(f => ({ ...f, paidBy: active[0].userId?._id || active[0].userId }));
        } catch (e) { setMembers([]); }
      } else { setMembers([]); }
    })();
  }, [form.scope, form.familyId]);

  useEffect(() => {
    (async () => {
      try {
        const params = { scope: form.scope, limit: 150, sort: 'newest' };
        if (form.scope === 'family') {
          if (!form.familyId) { setHistory([]); return; }
          params.familyId = form.familyId;
        }
        const { data } = await api.get('/transactions', { params });
        setHistory(data.transactions || []);
      } catch (e) { setHistory([]); }
    })();
  }, [form.scope, form.familyId]);

  useEffect(() => {
    (async () => {
      try {
        const bs = bootstrap?.nepal?.bs;
        if (!bs) return;
        if (form.scope === 'family' && !form.familyId) { setLimitInfo(null); return; }
        const params = { scope: form.scope, bsYear: bs.year, bsMonth: bs.month };
        if (form.scope === 'family') params.familyId = form.familyId;
        const [bRes, sRes] = await Promise.all([
          api.get('/budgets', { params }),
          api.get('/reports/summary', { params: { scope: form.scope, familyId: form.scope === 'family' ? form.familyId : undefined } }),
        ]);
        const budget = (bRes.data.budgets || [])[0];
        setLimitInfo({ totalBudget: budget?.totalBudget || 0, spent: sRes.data?.month?.expense || 0 });
      } catch (e) { setLimitInfo(null); }
    })();
  }, [bootstrap, form.scope, form.familyId]);

  const categories = useMemo(() => {
    const c = bootstrap?.categories || { expense: [], income: [] };
    return form.type === 'income' ? c.income : c.expense;
  }, [bootstrap, form.type]);

  const suggestion = useMemo(() => {
    return suggestCategory({ title: form.title, type: form.type, categories, history });
  }, [form.title, form.type, categories, history]);

  useEffect(() => { if (!form.category && categories.length && !categoryTouched) setForm(f => ({ ...f, category: categories[0] })); }, [categories, categoryTouched]);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error('Amount must be greater than zero');
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.category) return toast.error('Category is required');
    if (form.scope === 'family' && !form.familyId) return toast.error('Please select a family');
    const tx = {
      clientTransactionId: uuidv4(),
      scope: form.scope,
      familyId: form.scope === 'family' ? form.familyId : null,
      type: form.type,
      title: form.title.trim(),
      amount,
      category: form.category,
      paymentMethod: form.paymentMethod,
      paidBy: form.scope === 'family' ? (form.paidBy || undefined) : undefined,
      notes: form.notes,
      transactionAt: nepalDateTimeToUtcISO(form.date, form.time),
      isBookmarked: form.isBookmarked,
      paymentStatus: form.paymentStatus,
      source: isQuick ? 'quick-add' : 'manual',
    };
    setLoading(true);
    try {
      if (!navigator.onLine) throw new Error('offline');
      if (editId) await api.put(`/transactions/${editId}`, tx); else await api.post('/transactions', tx);
      toast.success(editId ? 'Transaction updated' : 'Transaction saved');
      setForm(f => ({ ...f, amount: '', title: '', notes: '', isBookmarked: false, paymentStatus: 'paid' }));
      if (isQuick || editId) setTimeout(() => nav(editId ? '/history' : '/'), 500);
    } catch (error) {
      const offline = !navigator.onLine || error.message === 'offline' || error.code === 'ERR_NETWORK';
      if (offline && !editId) {
        await queueTransaction(tx);
        toast.success('Saved offline. Will sync when connected.');
        setForm(f => ({ ...f, amount: '', title: '', notes: '', isBookmarked: false, paymentStatus: 'paid' }));
      } else {
        toast.error(error?.response?.data?.message || 'Failed to save');
      }
    } finally { setLoading(false); try { await syncPendingTransactions(); } catch {} }
  }

  const isExpense = form.type === 'expense';

  return (
    <Page>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{editId ? 'Edit Transaction' : (isQuick ? 'Quick Add' : 'Add Transaction')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Record income or expense in NPR (रु)</p>
      </div>

      <form onSubmit={submit} className="space-y-4 md:max-w-2xl md:mx-auto w-full">
        <Card className="space-y-4">
          <Segment value={form.scope} onChange={v => set('scope', v)} options={[{ value: 'personal', label: 'Personal', icon: Wallet }, { value: 'family', label: 'Family', icon: Users }]} />
          <Segment value={form.type} onChange={v => { set('type', v); set('category', ''); setCategoryTouched(false); }} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} activeClass={isExpense ? 'bg-rose-600' : 'bg-emerald-600'} />

          <div>
            <label className="label">Amount (NPR)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-semibold">रु</span>
              <input className="input w-full min-w-0 pl-11 text-2xl font-semibold tabular-nums py-4" type="number" step="0.01" min="0" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} required />
            </div>
            {form.type === 'expense' && limitInfo?.totalBudget > 0 && Number(form.amount || 0) > 0 && (() => {
              const projectedSpent = (limitInfo.spent || 0) + Number(form.amount || 0);
              const over = projectedSpent - limitInfo.totalBudget;
              if (over <= 0) return null;
              return <div className="mt-2 text-xs rounded-xl px-3 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50">This expense may exceed your monthly spending limit by रु {Math.abs(over).toLocaleString('en-IN')}.</div>;
            })()}
          </div>

          {form.scope === 'family' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 gap-3">
              <Field label="Family" icon={Users}>
                <select className="input" value={form.familyId} onChange={e => set('familyId', e.target.value)} required>
                  <option value="">Select family</option>
                  {families.map(f => <option key={f.id} value={f.id}>{f.name || f.family?.familyName}</option>)}
                </select>
              </Field>
              <Field label="Paid by" icon={Users}>
                <select className="input" value={form.paidBy} onChange={e => set('paidBy', e.target.value)}>
                  <option value="">Me</option>
                  {members.map(m => <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>{m.userId?.name || 'Member'}</option>)}
                </select>
              </Field>
            </motion.div>
          )}

          <Field label="Title" icon={FileText}>
            <input className="input" placeholder={isExpense ? 'e.g. Lunch, Electricity bill' : 'e.g. Salary, Business income'} value={form.title} onChange={e => set('title', e.target.value)} required />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Category" icon={Tag}>
              <select className="input" value={form.category} onChange={e => { setCategoryTouched(true); set('category', e.target.value); }} required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {suggestion && suggestion.category && suggestion.category !== form.category && (
                <button type="button" onClick={() => { set('category', suggestion.category); setCategoryTouched(true); }} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 px-3 py-2 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-950/50 transition">
                  <Sparkles size={13} /> Suggested: {suggestion.category}
                  <span className="text-[10px] opacity-70">({Math.round((suggestion.confidence || 0) * 100)}%)</span>
                </button>
              )}
            </Field>
            <Field label="Payment method" icon={CreditCard}>
              <select className="input" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                {(bootstrap?.paymentMethods || ['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'Card', 'Other']).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Date (Nepal)" icon={Calendar}>
              <input className="input w-full min-w-0" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </Field>
            <Field label="Time" icon={Clock}>
              <input className="input w-full min-w-0" type="time" value={form.time} onChange={e => set('time', e.target.value)} required />
            </Field>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">You can set a past date and time to add a backdated transaction.</p>

          <Field label="Payment status">
            <div className="grid grid-cols-2 gap-2">
              <OptionBtn active={form.paymentStatus === 'paid'} onClick={() => set('paymentStatus', 'paid')}>Paid</OptionBtn>
              <OptionBtn active={form.paymentStatus === 'unpaid'} onClick={() => set('paymentStatus', 'unpaid')} activeClass="bg-amber-500">Unpaid (Udharo)</OptionBtn>
            </div>
          </Field>

          <Field label="Notes">
            <textarea className="input min-h-[96px] resize-none" placeholder="Optional notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>

          <button type="button" onClick={() => set('isBookmarked', !form.isBookmarked)} className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition ${form.isBookmarked ? 'border-teal-200 bg-teal-50 dark:bg-teal-950/30 text-teal-800' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}>
            <span className="flex items-center gap-2"><Bookmark size={16} /> Bookmark this transaction</span>
            <span className={`h-5 w-5 rounded-md border flex items-center justify-center ${form.isBookmarked ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-300'}`}>{form.isBookmarked && <Check size={14} />}</span>
          </button>
        </Card>

        <motion.button whileTap={{ scale: 0.98 }} disabled={loading} className="btn-primary w-full py-4 text-base shadow-card">
          {loading ? <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Check size={18} />}
          {loading ? 'Saving...' : (editId ? 'Update Transaction' : 'Save Transaction')}
        </motion.button>
      </form>
    </Page>
  );
}

function Segment({ value, onChange, options, activeClass = 'bg-teal-700' }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)} className={`relative rounded-xl py-2.5 text-sm font-semibold transition ${value === opt.value ? 'text-white' : 'text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-slate-100'}`}>
          {value === opt.value && <motion.div layoutId={`seg-${options.map(o=>o.value).join('-')}`} className={`absolute inset-0 rounded-xl ${activeClass}`} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
          <span className="relative z-10 flex items-center justify-center gap-1.5">{opt.icon ? <opt.icon size={15} /> : null}{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function OptionBtn({ active, onClick, children, activeClass = 'bg-teal-700' }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl py-3 text-sm font-semibold border transition ${active ? `${activeClass} text-white border-transparent` : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}>{children}</button>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">{Icon ? <Icon size={14} className="text-slate-400 dark:text-slate-500" /> : null}{label}</label>
      {children}
    </div>
  );
}
