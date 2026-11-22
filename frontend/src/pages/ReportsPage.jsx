import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Users, ArrowUpRight, ArrowDownRight, Minus, CalendarRange, Download, AlertTriangle, Flame } from 'lucide-react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Page, Card, SectionTitle, Badge } from '../components/ui';
import { formatNPR } from '../lib/utils';

const COLORS = ['#0f766e', '#14b8a6', '#0891b2', '#6366f1', '#f59e0b', '#ef4444', '#84cc16', '#64748b'];

function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [bootstrap, setBootstrap] = useState(null);
  const [scope, setScope] = useState('personal');
  const [familyId, setFamilyId] = useState('');
  const [bsYear, setBsYear] = useState('');
  const [bsMonth, setBsMonth] = useState('');
  const [monthsCount, setMonthsCount] = useState(6);
  const [monthly, setMonthly] = useState(null);
  const [monthEnd, setMonthEnd] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [memberReport, setMemberReport] = useState(null);
  const [comparison, setComparison] = useState(null);

  async function load() {
    if (!bsYear || !bsMonth) return;
    if (scope === 'family' && !familyId) return;
    const params = { scope, bsYear, bsMonth };
    if (scope === 'family') params.familyId = familyId;
    try {
      const [m, me, w, cmp] = await Promise.all([
        api.get('/reports/monthly', { params }),
        api.get('/reports/month-end-summary', { params }),
        api.get('/reports/weekly', { params: { scope, familyId: scope === 'family' ? familyId : undefined } }),
        api.get('/reports/comparison', { params: { ...params, months: monthsCount } }),
      ]);
      setMonthly(m.data); setMonthEnd(me.data); setWeekly(w.data); setComparison(cmp.data);
      if (scope === 'family') {
        const mr = await api.get(`/families/${familyId}/reports/members`, { params });
        setMemberReport(mr.data);
      } else setMemberReport(null);
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

  useEffect(() => { if (bootstrap) load(); }, [bootstrap, scope, familyId, bsYear, bsMonth, monthsCount]);

  const families = bootstrap?.families || [];
  const daily = monthly?.daily || [];
  const cats = monthly?.expenseByCategory || [];
  const cmpMonths = comparison?.months || [];
  const latest = cmpMonths[cmpMonths.length - 1];
  const anomalies = monthly?.anomalies || [];
  const cashflowByDay = monthly?.cashflowByDay || [];

  const heatMax = useMemo(() => Math.max(1, ...cashflowByDay.map(d => d.expense || 0)), [cashflowByDay]);

  function exportComparison() {
    downloadCSV(`mykharcha-comparison-${bsYear}-${bsMonth}.csv`, cmpMonths.map(m => ({
      bs_month: m.label, income: m.income, expense: m.expense, net: m.net,
      savings_rate_pct: m.savingsRate ?? '', expense_to_income_pct: m.expenseToIncomeRatio ?? '',
      budget: m.budgetTotal, budget_remaining: m.budgetRemaining ?? '', budget_used_pct: m.budgetUsedPercent ?? '',
      income_count: m.incomeCount, expense_count: m.expenseCount,
    })));
  }

  function exportCategories() {
    downloadCSV(`mykharcha-categories-${bsYear}-${bsMonth}.csv`, (monthly?.expenseByCategory || []).map(c => ({ type: 'expense', category: c.category, total: c.total, count: c.count })));
  }

  return (
    <Page>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monthly analytics, income vs expenses, trends, and spending insights</p>
      </div>

      <Card className="space-y-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Chip active={scope === 'personal'} onClick={() => setScope('personal')}>Personal</Chip>
          {families.map(f => <Chip key={f.id} active={scope === 'family' && familyId === f.id} onClick={() => { setScope('family'); setFamilyId(f.id); }}>{f.name || f.family?.familyName}</Chip>)}
        </div>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
          <div className="min-w-0"><label className="label">BS Year</label><input className="input w-full min-w-0" value={bsYear} onChange={e => setBsYear(e.target.value)} placeholder="2083" /></div>
          <div className="min-w-0"><label className="label">BS Month</label><input className="input w-full min-w-0" value={bsMonth} onChange={e => setBsMonth(e.target.value)} placeholder="1-12" /></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[6, 12].map(n => (
            <button key={n} onClick={() => setMonthsCount(n)} className={`px-3 py-2 rounded-xl text-xs font-semibold border ${monthsCount === n ? 'bg-teal-700 text-white border-teal-700' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>Last {n} BS months</button>
          ))}
          <button onClick={load} className="btn-secondary px-4 py-2 text-xs">Refresh</button>
          <button onClick={exportComparison} className="btn-ghost px-3 py-2 text-xs ml-auto"><Download size={14} /> Export CSV</button>
        </div>
      </Card>

      {comparison && latest && (
        <Card className="space-y-4">
          <SectionTitle><span className="flex items-center gap-2"><CalendarRange size={16} className="text-teal-700 dark:text-teal-300" /> Month-to-Month Analytics</span></SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <CompareCard label="Income" value={latest.income} delta={latest.mom?.income} tone="income" />
            <CompareCard label="Expenses" value={latest.expense} delta={latest.mom?.expense} tone="expense" invert />
            <CompareCard label="Net" value={latest.net} delta={latest.mom?.net} tone={latest.net >= 0 ? 'income' : 'expense'} />
            <CompareCard label="Savings Rate" value={latest.savingsRate} delta={null} tone={latest.savingsRate != null && latest.savingsRate >= 0 ? 'income' : 'expense'} percentValue />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Info label="Avg Income/mo" value={formatNPR(comparison.averages?.income || 0)} />
            <Info label="Avg Expense/mo" value={formatNPR(comparison.averages?.expense || 0)} />
            <Info label="Avg Net/mo" value={formatNPR(comparison.averages?.net || 0)} />
            <Info label="Expense/Income" value={latest.expenseToIncomeRatio != null ? `${latest.expenseToIncomeRatio.toFixed(1)}%` : '—'} />
          </div>
          {comparison.highlights?.bestMonth && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 px-3 py-2">Best net month: <b>{comparison.highlights.bestMonth.label}</b> ({formatNPR(comparison.highlights.bestMonth.net)})</div>
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 px-3 py-2">Lowest net month: <b>{comparison.highlights.worstMonth?.label}</b> ({formatNPR(comparison.highlights.worstMonth?.net || 0)})</div>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Income vs Expenses vs Net</div>
            <div className="h-60 w-full rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2">
              <ResponsiveContainer>
                <LineChart data={cmpMonths}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatNPR(v)} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} name="Income" />
                  <Line type="monotone" dataKey="expense" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3 }} name="Expense" />
                  <Line type="monotone" dataKey="net" stroke="#0f766e" strokeWidth={2} dot={{ r: 2 }} name="Net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Monthly comparison table</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-2">BS Month</th><th className="py-2 pr-2">Income</th><th className="py-2 pr-2">Expense</th><th className="py-2 pr-2">Net</th><th className="py-2 pr-2">MoM Exp</th><th className="py-2 pr-2">Budget</th><th className="py-2">Left</th>
                </tr></thead>
                <tbody>
                  {cmpMonths.slice().reverse().map((m) => (
                    <tr key={m.label} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="py-2 pr-2 font-medium text-slate-900 dark:text-slate-100">{m.label}</td>
                      <td className="py-2 pr-2 tabular-nums text-emerald-700 dark:text-emerald-400">{formatNPR(m.income)}</td>
                      <td className="py-2 pr-2 tabular-nums text-rose-700 dark:text-rose-400">{formatNPR(m.expense)}</td>
                      <td className={`py-2 pr-2 tabular-nums font-medium ${m.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{formatNPR(m.net)}</td>
                      <td className="py-2 pr-2"><Delta delta={m.mom?.expense} invert /></td>
                      <td className="py-2 pr-2 tabular-nums text-slate-600 dark:text-slate-400">{m.budgetTotal ? formatNPR(m.budgetTotal) : '—'}</td>
                      <td className={`py-2 tabular-nums ${m.budgetRemaining != null && m.budgetRemaining < 0 ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>{m.budgetRemaining != null ? formatNPR(m.budgetRemaining) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(comparison.categoryTrends?.length > 0 || comparison.incomeSourceTrends?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TrendList title="Top expense category trends" items={comparison.categoryTrends || []} tone="expense" />
              <TrendList title="Income source trends" items={comparison.incomeSourceTrends || []} tone="income" />
            </div>
          )}
        </Card>
      )}

      {anomalies.length > 0 && (
        <Card className="space-y-3">
          <SectionTitle><span className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" /> Unusual Spending Alerts</span></SectionTitle>
          <div className="space-y-2">
            {anomalies.map(a => (
              <div key={a.id} className={`rounded-2xl px-3 py-2.5 text-sm border ${a.severity === 'high' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50'}`}>
                <div className="flex justify-between gap-2"><span className="font-medium text-slate-900 dark:text-slate-100 truncate">{a.title}</span><span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatNPR(a.amount)}</span></div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{a.category} · {a.reason}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {monthEnd && (
        <Card className="space-y-4">
          <SectionTitle><span className="flex items-center gap-2"><BarChart3 size={16} className="text-teal-700 dark:text-teal-300" /> Month-end Summary (BS {monthEnd.bsMonth?.year}-{monthEnd.bsMonth?.month})</span></SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Income" value={monthEnd.income?.total || 0} tone="income" icon={TrendingUp} />
            <Metric label="Expenses" value={monthEnd.expenses?.total || 0} tone="expense" icon={TrendingDown} />
            <Metric label="Net" value={monthEnd.net || 0} tone={monthEnd.net >= 0 ? 'income' : 'expense'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ListBlock title="Income by source" items={monthEnd.income?.byCategory || []} empty="No income" tone="income" />
            <ListBlock title="Expenses by category" items={monthEnd.expenses?.byCategory || []} empty="No expenses" tone="expense" />
          </div>
        </Card>
      )}

      {cashflowByDay.length > 0 && (
        <Card className="space-y-3">
          <SectionTitle><span className="flex items-center gap-2"><Flame size={16} className="text-rose-500" /> Daily Cashflow Heatmap</span></SectionTitle>
          <div className="grid grid-cols-7 gap-1.5">
            {cashflowByDay.map(d => {
              const intensity = Math.min(1, (d.expense || 0) / heatMax);
              const bg = intensity === 0 ? 'bg-slate-100 dark:bg-slate-800' : intensity < 0.25 ? 'bg-teal-100 dark:bg-teal-950/50' : intensity < 0.5 ? 'bg-amber-200 dark:bg-amber-900/50' : intensity < 0.75 ? 'bg-orange-300 dark:bg-orange-900/60' : 'bg-rose-400 dark:bg-rose-900/70';
              return (
                <div key={d.date} title={`${d.date}\nExpense: ${formatNPR(d.expense)}\nIncome: ${formatNPR(d.income)}`} className={`rounded-lg p-1.5 text-center ${bg}`}>
                  <div className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">{d.date.slice(-2)}</div>
                  <div className="text-[9px] text-slate-600 dark:text-slate-400 tabular-nums">{Math.round((d.expense||0)/1000)}k</div>
                </div>
              );
            })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Darker/redder = higher expense day. Tap/hover for exact amounts.</div>
        </Card>
      )}

      {monthly && (
        <Card className="space-y-4">
          <SectionTitle>Category & Daily Spending (BS {monthly.bsMonth?.year}-{monthly.bsMonth?.month})</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Info label="Total Expenses" value={formatNPR(monthly.totals?.expense)} />
            <Info label="Total Income" value={formatNPR(monthly.totals?.income)} />
            <Info label="Net Balance" value={formatNPR(monthly.totals?.net)} />
            <Info label="Avg Daily Spending" value={formatNPR(monthly.averageDailySpending)} />
          </div>
          {daily.length > 0 && (
            <div className="h-44 w-full rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2">
              <ResponsiveContainer>
                <BarChart data={daily}>
                  <XAxis dataKey="date" hide /><YAxis hide /><Tooltip formatter={(v) => formatNPR(v)} />
                  <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {cats.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2"><div className="text-sm font-medium text-slate-700 dark:text-slate-300">Category distribution</div><button onClick={exportCategories} className="text-xs text-teal-700 dark:text-teal-300 font-medium">Export</button></div>
              <div className="h-52 w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={cats} dataKey="total" nameKey="category" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatNPR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>
      )}

      {weekly && (
        <Card>
          <SectionTitle>Weekly (Sun–Sat, Saturday holiday)</SectionTitle>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-3">Total expenses: <b className="text-slate-900 dark:text-slate-100">{formatNPR(weekly.totals?.expense)}</b></div>
          <div className="space-y-2">
            {(weekly.daily || []).map(d => (
              <div key={d.date} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">{d.date} {d.isHoliday ? <Badge tone="amber">Sat holiday</Badge> : null}</span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatNPR(d.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {memberReport && (
        <Card>
          <SectionTitle><span className="flex items-center gap-2"><Users size={16} className="text-teal-700 dark:text-teal-300" /> Member-wise Expenses Paid</span></SectionTitle>
          <div className="mt-3 space-y-2">
            {(memberReport.members || []).map(m => (
              <div key={m.userId} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
                <div className="flex justify-between text-sm"><span className="font-medium text-slate-900 dark:text-slate-100">{m.name} <span className="text-slate-500 dark:text-slate-400 font-normal">({m.count} txns)</span></span><span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatNPR(m.total)}</span></div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"><div className="h-full rounded-full bg-teal-600" style={{ width: `${m.percentage || 0}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Page>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button onClick={onClick} className={`relative px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap ${active ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
      {active && <motion.div layoutId="rep-scope" className="absolute inset-0 rounded-2xl bg-teal-700" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function CompareCard({ label, value, delta, tone, invert, percentValue }) {
  const cls = tone === 'income' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : tone === 'expense' ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30' : 'text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60';
  return (
    <div className={`rounded-2xl p-3 ${cls}`}>
      <div className="text-[11px] font-medium opacity-80">{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-1">{percentValue ? (value == null ? '—' : `${value.toFixed(1)}%`) : formatNPR(value || 0)}</div>
      {delta ? <div className="mt-1"><Delta delta={delta} invert={invert} /></div> : <div className="mt-1 text-[11px] opacity-60">vs prev. month</div>}
    </div>
  );
}

function Delta({ delta, invert }) {
  if (!delta) return <span className="text-[11px] text-slate-400 dark:text-slate-500 inline-flex items-center gap-1"><Minus size={12} /> —</span>;
  const up = delta.amount > 0;
  const down = delta.amount < 0;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const color = good ? 'text-emerald-600 dark:text-emerald-400' : bad ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400';
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return <span className={`text-[11px] font-medium inline-flex items-center gap-0.5 ${color}`}><Icon size={12} /> {delta.percent != null ? `${Math.abs(delta.percent).toFixed(1)}%` : formatNPR(Math.abs(delta.amount))}</span>;
}

function TrendList({ title, items, tone }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</div>
      <div className="space-y-2">
        {items.length ? items.map(item => {
          const last = item.series[item.series.length - 1]?.total || 0;
          const prev = item.series[item.series.length - 2]?.total || 0;
          const delta = prev ? ((last - prev) / Math.abs(prev)) * 100 : null;
          return (
            <div key={item.category} className="text-sm">
              <div className="flex justify-between gap-2"><span className="text-slate-700 dark:text-slate-300 truncate">{item.category}</span><span className={`font-semibold tabular-nums ${tone === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>{formatNPR(last)}</span></div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{delta == null ? 'No prior month' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% vs prev month`} · Total {formatNPR(item.total)}</div>
            </div>
          );
        }) : <div className="text-xs text-slate-500 dark:text-slate-400">No data</div>}
      </div>
    </div>
  );
}

function Metric({ label, value, tone, icon: Icon }) {
  const cls = tone === 'income' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : tone === 'expense' ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30' : 'text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60';
  return <div className={`rounded-2xl p-3 ${cls}`}><div className="flex items-center gap-1 text-[11px] font-medium opacity-80">{Icon ? <Icon size={12} /> : null} {label}</div><div className="text-sm font-semibold tabular-nums mt-1">{formatNPR(value)}</div></div>;
}

function ListBlock({ title, items, empty, tone }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</div>
      <div className="space-y-1.5">{items.length ? items.map(x => <div key={x.category} className="flex justify-between text-sm"><span className="text-slate-700 dark:text-slate-300 truncate pr-2">{x.category}</span><span className={`font-semibold tabular-nums ${tone === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>{formatNPR(x.total)}</span></div>) : <div className="text-xs text-slate-500 dark:text-slate-400">{empty}</div>}</div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3"><div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div><div className="text-sm font-semibold tabular-nums mt-1 text-slate-900 dark:text-slate-100">{value}</div></div>;
}
