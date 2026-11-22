import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Search, SlidersHorizontal, Bookmark, BookmarkCheck, Trash2, Edit3, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../services/api';
import { Page, Card, Badge, Skeleton, EmptyState } from '../components/ui';
import { formatNPR } from '../lib/utils';

export default function HistoryPage() {
  const nav = useNavigate();
  const [bootstrap, setBootstrap] = useState(null);
  const [scope, setScope] = useState('personal');
  const [familyId, setFamilyId] = useState('');
  const [items, setItems] = useState([]);
  const [q, setQ] = useState({ search: '', type: '', category: '', paymentMethod: '', bookmarked: '', paymentStatus: '', sort: 'newest' });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = { scope };
      if (scope === 'family') params.familyId = familyId;
      Object.entries(q).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await api.get('/transactions', { params });
      setItems(data.transactions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { (async () => {
    const { data } = await api.get('/meta/bootstrap');
    setBootstrap(data);
    const s = data.settings?.currentScope || 'personal';
    const f = data.settings?.selectedFamilyId || (data.families?.[0]?.id || '');
    setScope(s === 'family' && data.families?.length ? 'family' : 'personal');
    setFamilyId(f);
  })(); }, []);

  useEffect(() => { if (bootstrap && (scope === 'personal' || familyId)) load(); }, [bootstrap, scope, familyId, q.sort, q.type, q.bookmarked, q.paymentStatus, q.category, q.paymentMethod]);

  useEffect(() => {
    if (!bootstrap) return;
    if (scope === 'family' && !familyId) return;
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, scope === 'family' ? 12000 : 30000);
    return () => clearInterval(id);
  }, [bootstrap, scope, familyId, q.search, q.type, q.category, q.paymentMethod, q.bookmarked, q.paymentStatus, q.sort]);

  async function toggleBookmark(id) { try { await api.patch(`/transactions/${id}/bookmark`); toast.success('Bookmark updated'); load(); } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); } }
  async function settle(id) { try { await api.patch(`/transactions/${id}/settle`); toast.success('Marked as settled'); load(); } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); } }
  async function del(id) { if (!confirm('Delete this transaction?')) return; try { await api.delete(`/transactions/${id}`); toast.success('Transaction deleted'); load(); } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); } }

  const families = bootstrap?.families || [];
  const cats = bootstrap?.categories || { expense: [], income: [] };
  const allCats = useMemo(() => [...new Set([...(cats.expense || []), ...(cats.income || [])])], [bootstrap]);
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    items.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
    return { income, expense, count: items.length };
  }, [items]);

  return (
    <Page>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{totals.count} transactions · <span className="text-emerald-700">{formatNPR(totals.income)}</span> in · <span className="text-rose-700">{formatNPR(totals.expense)}</span> out</p>
        </div>
      </div>

      <Card className="p-3 space-y-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Chip active={scope === 'personal'} onClick={() => setScope('personal')}>Personal</Chip>
          {families.map(f => <Chip key={f.id} active={scope === 'family' && familyId === f.id} onClick={() => { setScope('family'); setFamilyId(f.id); }}>{f.name || f.family?.familyName}</Chip>)}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input className="input pl-10 py-2.5" placeholder="Search by title" value={q.search} onChange={e => setQ({ ...q, search: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') load(); }} />
          </div>
          <button onClick={() => setShowFilters(s => !s)} className={`h-[46px] w-[46px] rounded-2xl border flex items-center justify-center transition ${showFilters ? 'bg-teal-700 text-white border-teal-700' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}><SlidersHorizontal size={18} /></button>
          <button onClick={load} className="h-[46px] px-4 rounded-2xl bg-slate-900 text-white text-sm font-semibold">Go</button>
        </div>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 overflow-hidden">
              <select className="input py-2.5 text-sm" value={q.type} onChange={e => setQ({ ...q, type: e.target.value })}><option value="">All types</option><option value="expense">Expense</option><option value="income">Income</option></select>
              <select className="input py-2.5 text-sm" value={q.sort} onChange={e => setQ({ ...q, sort: e.target.value })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select>
              <select className="input py-2.5 text-sm" value={q.category} onChange={e => setQ({ ...q, category: e.target.value })}><option value="">All categories</option>{allCats.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select className="input py-2.5 text-sm" value={q.paymentMethod} onChange={e => setQ({ ...q, paymentMethod: e.target.value })}><option value="">All payments</option>{(bootstrap?.paymentMethods || []).map(p => <option key={p} value={p}>{p}</option>)}</select>
              <select className="input py-2.5 text-sm" value={q.paymentStatus} onChange={e => setQ({ ...q, paymentStatus: e.target.value })}><option value="">All status</option><option value="paid">Paid</option><option value="unpaid">Unpaid (Udharo)</option></select>
              <select className="input py-2.5 text-sm" value={q.bookmarked} onChange={e => setQ({ ...q, bookmarked: e.target.value })}><option value="">All items</option><option value="true">Bookmarked</option></select>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="No transactions found" description="Try adjusting filters or add a new transaction." /></Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {items.map((tx, i) => (
              <motion.div key={tx._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700'}`}>
                        {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{tx.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">{tx.category} · {tx.paymentMethod}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{new Date(tx.transactionAt).toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tx.isBookmarked && <Badge tone="teal">Bookmarked</Badge>}
                          {tx.paymentStatus === 'unpaid' && <Badge tone="amber">Udharo</Badge>}
                          <Badge tone="slate">{tx.type}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className={`text-base font-semibold tabular-nums shrink-0 ${tx.type === 'income' ? 'text-emerald-700' : 'text-slate-900 dark:text-slate-100'}`}>
                      {tx.type === 'income' ? '+' : '-'} {formatNPR(tx.amount)}
                    </div>
                  </div>
                  {tx.notes ? <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">{tx.notes}</div> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionBtn onClick={() => nav(`/add?edit=${tx._id}`)} icon={Edit3}>Edit</ActionBtn>
                    <ActionBtn onClick={() => toggleBookmark(tx._id)} icon={tx.isBookmarked ? BookmarkCheck : Bookmark}>{tx.isBookmarked ? 'Saved' : 'Save'}</ActionBtn>
                    {tx.paymentStatus === 'unpaid' && <ActionBtn onClick={() => settle(tx._id)} icon={CheckCircle2} tone="amber">Settle</ActionBtn>}
                    <ActionBtn onClick={() => del(tx._id)} icon={Trash2} tone="danger">Delete</ActionBtn>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Page>
  );
}

function Chip({ active, children, ...props }) {
  return (
    <button {...props} className={`relative px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${active ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500'}`}>
      {active && <motion.div layoutId="hist-scope" className="absolute inset-0 rounded-xl bg-teal-700" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function ActionBtn({ children, icon: Icon, onClick, tone }) {
  const tones = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
    amber: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    danger: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 hover:bg-rose-100',
  };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${tones[tone] || tones.default}`}>
      <Icon size={14} /> {children}
    </button>
  );
}
