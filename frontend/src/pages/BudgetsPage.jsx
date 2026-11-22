import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Target, PiggyBank, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { Page, Card, SectionTitle } from '../components/ui';
import { formatNPR } from '../lib/utils';

export default function BudgetsPage() {
  const [bootstrap, setBootstrap] = useState(null);
  const [scope, setScope] = useState('personal');
  const [familyId, setFamilyId] = useState('');
  const [bsYear, setBsYear] = useState('');
  const [bsMonth, setBsMonth] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load(b) {
    try {
      const boot = b || bootstrap;
      if (!boot) return;
      const params = { scope, bsYear, bsMonth };
      if (scope === 'family') params.familyId = familyId;
      if (scope === 'family' && !familyId) return;
      const [br, sr] = await Promise.all([api.get('/budgets', { params }), api.get('/reports/monthly', { params })]);
      setBudgets(br.data.budgets || []);
      setSummary(sr.data);
      const existing = (br.data.budgets || [])[0];
      if (existing) setTotalBudget(String(existing.totalBudget));
    } catch (e) { console.error(e); }
  }

  useEffect(() => { (async () => {
    const { data } = await api.get('/meta/bootstrap');
    setBootstrap(data);
    const s = data.settings?.currentScope || 'personal';
    const f = data.settings?.selectedFamilyId || (data.families?.[0]?.id || '');
    setScope(s === 'family' && data.families?.length ? 'family' : 'personal');
    setFamilyId(f);
    setBsYear(String(data.nepal?.bs?.year || ''));
    setBsMonth(String(data.nepal?.bs?.month || ''));
  })(); }, []);

  useEffect(() => { if (bootstrap && bsYear && bsMonth && (scope === 'personal' || familyId)) load(bootstrap); }, [bootstrap, scope, familyId, bsYear, bsMonth]);

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      const body = { scope, year: Number(bsYear), month: Number(bsMonth), totalBudget: Number(totalBudget || 0), categoryBudgets: [] };
      if (scope === 'family') body.familyId = familyId;
      await api.post('/budgets', body);
      toast.success('Budget saved');
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to save budget'); }
    finally { setSaving(false); }
  }

  const families = bootstrap?.families || [];
  const spent = summary?.totals?.expense || 0;
  const budget = Number(totalBudget || 0);
  const pct = budget ? (spent / budget * 100) : 0;
  const remaining = budget - spent;

  return (
    <Page>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Plan and track spending by BS month</p>
      </div>

      <Card className="space-y-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <ScopeChip active={scope === 'personal'} onClick={() => setScope('personal')}>Personal</ScopeChip>
          {families.map(f => <ScopeChip key={f.id} active={scope === 'family' && familyId === f.id} onClick={() => { setScope('family'); setFamilyId(f.id); }}>{f.name || f.family?.familyName}</ScopeChip>)}
        </div>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
          <div className="min-w-0"><label className="label">BS Year</label><input className="input w-full min-w-0" value={bsYear} onChange={e => setBsYear(e.target.value)} /></div>
          <div className="min-w-0"><label className="label">BS Month (1-12)</label><input className="input w-full min-w-0" value={bsMonth} onChange={e => setBsMonth(e.target.value)} /></div>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Overall monthly budget (NPR)</label>
            <div className="relative">
              <Target size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input className="input pl-10 tabular-nums" type="number" step="0.01" placeholder="e.g. 30000" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} />
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.98 }} disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : 'Save Budget'}</motion.button>
          {scope === 'family' && <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Only family admins can manage family budgets.</p>}
        </form>
      </Card>

      {summary && (
        <Card className="space-y-4">
          <SectionTitle><span className="flex items-center gap-2"><PiggyBank size={16} className="text-teal-700" /> Utilization (BS {bsYear}-{bsMonth})</span></SectionTitle>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-2 text-center">
            <Mini label="Budget" value={budget ? formatNPR(budget) : '—'} />
            <Mini label="Spent" value={formatNPR(spent)} danger={budget > 0 && spent > budget} />
            <Mini label="Remaining" value={budget ? formatNPR(remaining) : '—'} danger={remaining < 0} />
          </div>
          {budget > 0 && (
            <>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.7 }} className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-500' : 'bg-teal-600'}`} />
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500"><span>{pct.toFixed(1)}% used</span><span>{Math.max(0, 100 - pct).toFixed(1)}% left</span></div>
              {pct >= 75 && (
                <div className={`flex items-center gap-2 text-sm rounded-2xl px-3 py-2.5 ${pct >= 100 ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800'}`}>
                  <AlertTriangle size={16} /> {pct >= 100 ? 'Budget exceeded' : pct >= 90 ? '90% of budget consumed' : '75% of budget consumed'}
                </div>
              )}
            </>
          )}
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Category-wise spending</div>
            <div className="space-y-2">
              {(summary.expenseByCategory || []).map(c => {
                const share = spent ? (c.total / spent) * 100 : 0;
                return (
                  <div key={c.category} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
                    <div className="flex justify-between text-sm"><span className="font-medium text-slate-800 dark:text-slate-200">{c.category}</span><span className="font-semibold tabular-nums">{formatNPR(c.total)}</span></div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-teal-600" style={{ width: `${share}%` }} /></div>
                  </div>
                );
              })}
              {(!summary.expenseByCategory || summary.expenseByCategory.length === 0) && <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No expenses in this period.</div>}
            </div>
          </div>
        </Card>
      )}
    </Page>
  );
}

function ScopeChip({ active, children, onClick }) {
  return (
    <button onClick={onClick} className={`relative px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap ${active ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500'}`}>
      {active && <motion.div layoutId="bud-scope" className="absolute inset-0 rounded-2xl bg-teal-700" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function Mini({ label, value, danger }) {
  return <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3"><div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</div><div className={`text-sm font-semibold tabular-nums mt-1 ${danger ? 'text-rose-700' : 'text-slate-900 dark:text-slate-100'}`}>{value}</div></div>;
}
