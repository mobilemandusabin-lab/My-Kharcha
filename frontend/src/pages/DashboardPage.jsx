import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, TrendingDown, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, Target, CalendarDays, PiggyBank } from 'lucide-react';
import api from '../services/api';
import { setupOfflineSync, getPendingTransactions } from '../services/offline';
import { Page, Card, StatCard, Badge, Skeleton, SectionTitle } from '../components/ui';
import { formatNPR } from '../lib/utils';

export default function DashboardPage() {
  const [bootstrap, setBootstrap] = useState(null);
  const [scope, setScope] = useState('personal');
  const [familyId, setFamilyId] = useState('');
  const [summary, setSummary] = useState(null);
  const [monthEnd, setMonthEnd] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);

  async function loadAll(s = scope, f = familyId, bs = bootstrap) {
    try {
      setLoading(true);
      const famId = s === 'family' ? (f || (bs?.families?.[0]?.id || '')) : '';
      if (s === 'family' && famId && famId !== f) setFamilyId(famId);
      const params = { scope: s };
      if (s === 'family' && famId) params.familyId = famId;
      if (s === 'family' && !famId) { setSummary(null); setMonthEnd(null); setBudgets([]); setLoading(false); return; }
      const [sumRes, meRes, budRes] = await Promise.all([
        api.get('/reports/summary', { params }),
        api.get('/reports/month-end-summary', { params }),
        api.get('/budgets', { params }),
      ]);
      setSummary(sumRes.data);
      setMonthEnd(meRes.data);
      setBudgets(budRes.data.budgets || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/meta/bootstrap');
        setBootstrap(data);
        const savedScope = data.settings?.currentScope || 'personal';
        const savedFam = data.settings?.selectedFamilyId || (data.families?.[0]?.id || '');
        const initialScope = savedScope === 'family' && data.families?.length ? 'family' : 'personal';
        setScope(initialScope);
        setFamilyId(savedFam);
        await loadAll(initialScope, savedFam, data);
      } catch (e) { console.error(e); setLoading(false); }
      const p = await getPendingTransactions(); setPendingCount(p.length);
    })();
    const cleanup = setupOfflineSync(async () => { const p = await getPendingTransactions(); setPendingCount(p.length); loadAll(); });
    const onFocus = async () => { const p = await getPendingTransactions(); setPendingCount(p.length); loadAll(); };
    window.addEventListener('focus', onFocus);
    return () => { cleanup && cleanup(); window.removeEventListener('focus', onFocus); };
  }, []);

  useEffect(() => { if (bootstrap) loadAll(scope, familyId, bootstrap); }, [scope, familyId]);

  useEffect(() => {
    if (!bootstrap) return;
    const intervalMs = scope === 'family' ? 12000 : 30000;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadAll(scope, familyId, bootstrap);
    }, intervalMs);
    return () => clearInterval(id);
  }, [bootstrap, scope, familyId]);

  async function changeScope(s, f = '') {
    setScope(s); setFamilyId(f);
    try { await api.put('/settings', { currentScope: s, selectedFamilyId: s === 'family' ? f : null }); } catch {}
  }

  async function saveLimit() {
    const val = Number(limitInput);
    if (!Number.isFinite(val) || val < 0) { toast.error('Enter a valid limit'); return; }
    const bs = bootstrap?.nepal?.bs;
    if (!bs) return;
    setSavingLimit(true);
    try {
      const body = { scope, year: bs.year, month: bs.month, totalBudget: val, categoryBudgets: budgets[0]?.categoryBudgets || [] };
      if (scope === 'family') body.familyId = familyId;
      await api.post('/budgets', body);
      toast.success('Monthly spending limit saved');
      setEditingLimit(false);
      await loadAll();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to save limit'); }
    finally { setSavingLimit(false); }
  }

  const families = bootstrap?.families || [];
  const nepal = bootstrap?.nepal;
  const month = summary?.month || {};
  const today = summary?.today || {};
  const overallBudget = budgets[0];
  const spent = month.expense || 0;
  const budgetTotal = overallBudget?.totalBudget || 0;
  const remaining = budgetTotal ? (budgetTotal - spent) : null;
  const pct = budgetTotal ? (spent / budgetTotal) * 100 : 0;
  const daysInMonth = nepal?.daysInMonth || 30;
  const dayOfMonth = nepal?.bs?.day || 1;
  const daysLeft = Math.max(0, daysInMonth - dayOfMonth);
  const safePerDay = remaining != null ? (daysLeft > 0 ? Math.max(0, remaining) / daysLeft : Math.max(0, remaining)) : null;
  const projected = dayOfMonth > 0 ? spent + (spent / dayOfMonth) * daysLeft : spent;
  const limitStatus = !budgetTotal ? 'unset' : pct >= 100 ? 'over' : pct >= 90 ? 'near' : pct >= 75 ? 'watch' : 'ok';

  return (
    <Page>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">MyKharcha</div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">{nepal?.bsFormatted || 'Dashboard'}</h1>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5"><Clock size={12} />{nepal?.adFormatted} · {nepal?.time} NPT</div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {pendingCount > 0 && <Badge tone="amber">Pending {pendingCount}</Badge>}
          <Link to="/add"><motion.div whileTap={{ scale: 0.96 }} className="h-11 px-4 rounded-2xl bg-teal-700 text-white shadow-card flex items-center gap-2 text-sm font-semibold"><Plus size={18} /> Add</motion.div></Link>
        </div>
      </div>

      <Card className="p-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <ScopeBtn active={scope === 'personal'} onClick={() => changeScope('personal')}>Personal</ScopeBtn>
          {families.map(f => (
            <ScopeBtn key={f.id} active={scope === 'family' && familyId === f.id} onClick={() => changeScope('family', f.id)}>
              {f.name || f.family?.familyName}
            </ScopeBtn>
          ))}
          <Link to="/family" className="px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap bg-slate-50 dark:bg-slate-800/60 text-teal-700 dark:text-teal-300 border border-dashed border-teal-200 dark:border-teal-800">+ Family</Link>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-40" />
        </div>
      ) : scope === 'family' && families.length === 0 ? (
        <Card className="text-center py-10">
          <div className="font-semibold text-slate-900 dark:text-slate-100">No family yet</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create or join a family to track shared expenses.</div>
          <Link to="/family" className="btn-primary mt-4 inline-flex">Manage Family</Link>
        </Card>
      ) : summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Today's Expenses" value={today.expense || 0} sub={`${today.expenseTransactionCount || 0} expense txns`} tone="expense" icon={TrendingDown} />
            <StatCard title="Today's Income" value={today.income || 0} sub={`${today.incomeCount || 0} income txns`} tone="income" icon={TrendingUp} />
            <StatCard title="Month Expenses" value={month.expense || 0} sub={`BS ${summary.bsMonth?.year}-${summary.bsMonth?.month}`} tone="expense" icon={ArrowDownRight} />
            <StatCard title="Month Income" value={month.income || 0} sub={`Net ${formatNPR(month.net || 0)}`} tone="income" icon={ArrowUpRight} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="space-y-4">
            <SectionTitle action={
              <button onClick={() => { setLimitInput(budgetTotal ? String(budgetTotal) : ''); setEditingLimit(v => !v); }} className="text-sm text-teal-700 dark:text-teal-300 font-semibold">
                {budgetTotal ? 'Edit limit' : 'Set limit'}
              </button>
            }>
              <span className="flex items-center gap-2"><Target size={16} className="text-teal-700 dark:text-teal-300" /> Monthly Spending Limit</span>
            </SectionTitle>

            {editingLimit && (
              <div className="flex gap-2">
                <input className="input w-full min-w-0 tabular-nums" type="number" min="0" step="0.01" placeholder="e.g. 30000" value={limitInput} onChange={e => setLimitInput(e.target.value)} />
                <button onClick={saveLimit} disabled={savingLimit} className="btn-primary shrink-0">{savingLimit ? 'Saving...' : 'Save'}</button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Limit" value={budgetTotal || 0} />
              <MiniStat label="Spent" value={spent} tone="expense" />
              <MiniStat label="Left" value={remaining == null ? 0 : remaining} tone={remaining != null && remaining < 0 ? 'expense' : 'income'} empty={remaining == null} />
            </div>

            {budgetTotal ? (
              <>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5"><span>{pct.toFixed(1)}% used</span><span>{remaining < 0 ? `Over by ${formatNPR(Math.abs(remaining))}` : `${formatNPR(remaining)} remaining`}</span></div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-500' : pct >= 75 ? 'bg-amber-400' : 'bg-teal-600'}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InfoPill icon={CalendarDays} label="Days left (BS month)" value={`${daysLeft} day${daysLeft !== 1 ? 's' : ''}`} />
                  <InfoPill icon={PiggyBank} label="Safe to spend/day" value={remaining != null && remaining > 0 ? formatNPR(safePerDay) : '—'} />
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-sm flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Projected month-end expense</span>
                  <span className={`font-semibold tabular-nums ${projected > budgetTotal ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>{formatNPR(projected)}</span>
                </div>
                <div className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 ${limitStatus === 'over' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300' : limitStatus === 'near' || limitStatus === 'watch' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'}`}>
                  <AlertCircle size={14} />
                  {limitStatus === 'over' ? 'Spending limit exceeded. Review expenses.' : limitStatus === 'near' ? '90% of spending limit used. Be careful.' : limitStatus === 'watch' ? '75% of spending limit used.' : 'On track. Spending is within your limit.'}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Set a monthly spending limit to see how much is left, safe spend/day, and month-end projection.</p>
            )}
          </Card>

          {monthEnd && (
            <Card>
              <SectionTitle>Month-end Summary</SectionTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Income vs expenses (BS {monthEnd.bsMonth?.year}-{monthEnd.bsMonth?.month})</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Income" value={monthEnd.income?.total || 0} tone="income" />
                <MiniStat label="Expenses" value={monthEnd.expenses?.total || 0} tone="expense" />
                <MiniStat label="Net" value={monthEnd.net || 0} tone={monthEnd.net >= 0 ? 'income' : 'expense'} />
              </div>
              {monthEnd.outstandingUdhar?.count > 0 && (
                <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200 flex items-center justify-between">
                  <span>Outstanding udharo</span>
                  <span className="font-semibold tabular-nums">{formatNPR((monthEnd.outstandingUdhar.expense || 0) + (monthEnd.outstandingUdhar.income || 0))} · {monthEnd.outstandingUdhar.count}</span>
                </div>
              )}
            </Card>
          )}

          </div>

          <Card>
            <SectionTitle action={<Link to="/history" className="text-sm text-teal-700 dark:text-teal-300 font-semibold">View all</Link>}>Recent Transactions</SectionTitle>
            <div className="mt-3 space-y-1">
              {(summary.recent || []).slice(0, 6).map((tx, i) => (
                <motion.div key={tx._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'}`}>
                      {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{tx.title} {tx.isBookmarked ? '★' : ''}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{tx.category} · {tx.paymentMethod}{tx.paymentStatus === 'unpaid' ? ' · Udharo' : ''}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold tabular-nums shrink-0 ${tx.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {tx.type === 'income' ? '+' : '-'} {formatNPR(tx.amount)}
                  </div>
                </motion.div>
              ))}
              {(!summary.recent || summary.recent.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No transactions yet</p>
                  <Link to="/add" className="btn-primary mt-3 inline-flex">Add your first transaction</Link>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}

function ScopeBtn({ active, children, ...props }) {
  return (
    <button {...props} className={`relative px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
      {active && <motion.div layoutId="scope-pill" className="absolute inset-0 rounded-2xl bg-teal-700" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function MiniStat({ label, value, tone, empty }) {
  const cls = tone === 'income' ? 'text-emerald-700 dark:text-emerald-400' : tone === 'expense' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100';
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 text-center">
      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</div>
      <div className={`text-sm font-semibold tabular-nums mt-1 ${cls}`}>{empty ? '—' : formatNPR(value)}</div>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Icon size={12} /> {label}</div>
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{value}</div>
    </div>
  );
}
