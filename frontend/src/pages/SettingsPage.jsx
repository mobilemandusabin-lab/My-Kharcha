import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User, LogOut, Palette, Users, Wallet, Shield, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Page, Card, SectionTitle, Badge, Skeleton } from '../components/ui';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminFamilies, setAdminFamilies] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => { (async () => { try { const { data } = await api.get('/settings'); setSettings(data.settings); } catch (e) {} })(); }, []);

  useEffect(() => { (async () => {
    if (user?.role !== 'superadmin') return;
    setAdminLoading(true);
    try {
      const [u, f] = await Promise.all([api.get('/admin/users'), api.get('/admin/families')]);
      setAdminUsers(u.data.users || []);
      setAdminFamilies(f.data.families || []);
    } catch (e) { console.error(e); }
    finally { setAdminLoading(false); }
  })(); }, [user]);

  async function save(patch) {
    try {
      const { data } = await api.put('/settings', patch);
      setSettings(data.settings);
      if (patch.theme) setTheme(patch.theme);
      toast.success('Settings saved');
    }
    catch (e) { toast.error('Failed to save'); }
  }

  return (
    <Page>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center text-xl font-semibold shadow-sm">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">{user?.name} {user?.role === 'superadmin' && <Badge tone="amber">Super Admin</Badge>}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate">{user?.email}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 capitalize">Role: {user?.role || 'user'}</div>
          </div>
        </div>
        <button onClick={logout} className="mt-4 w-full btn-secondary text-rose-700 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100"><LogOut size={16} /> Log out</button>
      </Card>

      <Card className="space-y-4">
        <SectionTitle><span className="flex items-center gap-2"><Palette size={16} className="text-teal-700" /> Preferences</span></SectionTitle>
        <div>
          <label className="label">Theme</label>
          <select className="input" value={settings?.theme || 'light'} onChange={e => save({ theme: e.target.value })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <InfoPill label="Currency" value="NPR (रु)" />
          <InfoPill label="Timezone" value="Asia/Kathmandu" />
          <InfoPill label="Calendar" value="BS primary" />
        </div>
      </Card>

      <Card className="space-y-2">
        <SectionTitle>Manage</SectionTitle>
        <NavRow to="/family" icon={Users} title="Family Management" desc="Families, members & invitations" />
        <NavRow to="/budgets" icon={Wallet} title="Budgets" desc="Personal & family BS-month budgets" />
      </Card>

      {user?.role === 'superadmin' && (
        <Card className="space-y-4">
          <SectionTitle><span className="flex items-center gap-2"><Shield size={16} className="text-amber-600" /> Super Admin</span></SectionTitle>
          {adminLoading ? <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : (
            <>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">All Users ({adminUsers.length})</div>
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {adminUsers.map(u => (
                    <div key={u._id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{u.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate">{u.email}</div>
                      </div>
                      <Badge tone={u.role === 'superadmin' ? 'amber' : 'slate'}>{u.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">All Families ({adminFamilies.length})</div>
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {adminFamilies.map(f => (
                    <div key={f._id} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2"><span className="font-medium text-sm text-slate-900 dark:text-slate-100">{f.familyName}</span><Badge tone={f.isActive ? 'emerald' : 'slate'}>{f.isActive ? 'Active' : 'Inactive'}</Badge></div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">Members: {f.activeMemberCount}/{f.memberCount}</div>
                    </div>
                  ))}
                  {adminFamilies.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No families found.</div>}
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      <Card>
        <SectionTitle>Quick Add / iPhone</SectionTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 mt-1">Shortcut URL: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-lg text-slate-800 dark:text-slate-200">/quick-add</code></p>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Configure Apple Shortcut to open your deployed URL + <code>/quick-add</code>. See <code>docs/IOS_BACK_TAP_SETUP.md</code> for Back Tap setup.</p>
      </Card>
    </Page>
  );
}

function NavRow({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-slate-800/60 transition group">
      <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-700 flex items-center justify-center"><Icon size={18} /></div>
      <div className="flex-1 min-w-0"><div className="font-medium text-slate-900 dark:text-slate-100">{title}</div><div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{desc}</div></div>
      <ExternalLink size={16} className="text-slate-300 group-hover:text-slate-500 dark:text-slate-400 dark:text-slate-500" />
    </Link>
  );
}

function InfoPill({ label, value }) {
  return <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5"><div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">{label}</div><div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">{value}</div></div>;
}
