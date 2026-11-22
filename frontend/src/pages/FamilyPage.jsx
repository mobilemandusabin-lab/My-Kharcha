import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Users, UserPlus, Link2, Crown, Trash2, ShieldX, Copy } from 'lucide-react';
import api from '../services/api';
import { Page, Card, SectionTitle, Badge, Button } from '../components/ui';

export default function FamilyPage() {
  const [families, setFamilies] = useState([]);
  const [selected, setSelected] = useState('');
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [newFamily, setNewFamily] = useState({ familyName: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadFamilies() { const { data } = await api.get('/families'); setFamilies(data.families || []); if (!selected && data.families?.[0]) setSelected(data.families[0]._id); }
  async function loadDetails(fid) {
    if (!fid) return;
    try {
      const [m, i] = await Promise.all([api.get(`/families/${fid}/members`), api.get(`/families/${fid}/invitations`).catch(() => ({ data: { invitations: [] } }))]);
      setMembers(m.data.members || []); setInvites(i.data.invitations || []);
    } catch (e) { setMembers([]); setInvites([]); }
  }
  useEffect(() => { loadFamilies(); }, []);
  useEffect(() => { if (selected) loadDetails(selected); }, [selected]);

  async function createFamily(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/families', newFamily); setNewFamily({ familyName: '', description: '' }); toast.success('Family created'); loadFamilies(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed to create family'); }
    finally { setLoading(false); }
  }
  async function join(e) {
    e.preventDefault(); setLoading(true);
    try { const { data } = await api.post('/families/join', { invitationCode: joinCode }); toast.success(data.message || 'Joined family'); setJoinCode(''); loadFamilies(); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed to join'); }
    finally { setLoading(false); }
  }
  async function invite() {
    if (!selected) return;
    try { const { data } = await api.post(`/families/${selected}/invite`, {}); const code = data.invitationCode || data.invitation?.invitationCode; toast.success(`Invitation created: ${code}`); loadDetails(selected); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed to create invitation'); }
  }
  async function removeMember(userId) {
    if (!confirm('Remove this member?')) return;
    try { await api.delete(`/families/${selected}/members/${userId}`); toast.success('Member updated'); loadDetails(selected); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
  }
  async function revoke(inviteId) {
    try { await api.post(`/families/${selected}/invitations/${inviteId}/revoke`); toast.success('Invitation revoked'); loadDetails(selected); }
    catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
  }

  return (
    <Page>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Family</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Manage shared expenses, members and invitations</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <SectionTitle><span className="flex items-center gap-2"><UserPlus size={16} className="text-teal-700" /> Create Family</span></SectionTitle>
          <form onSubmit={createFamily} className="mt-3 space-y-3">
            <input className="input" placeholder="Family name (e.g. Awal Family)" value={newFamily.familyName} onChange={e => setNewFamily({ ...newFamily, familyName: e.target.value })} required />
            <input className="input" placeholder="Description (optional)" value={newFamily.description} onChange={e => setNewFamily({ ...newFamily, description: e.target.value })} />
            <Button loading={loading} className="w-full">Create Family</Button>
          </form>
        </Card>

        <Card>
          <SectionTitle><span className="flex items-center gap-2"><Link2 size={16} className="text-teal-700" /> Join Family</span></SectionTitle>
          <form onSubmit={join} className="mt-3 space-y-3">
            <input className="input uppercase tracking-widest" placeholder="Invitation code" value={joinCode} onChange={e => setJoinCode(e.target.value)} required />
            <Button variant="secondary" loading={loading} className="w-full !bg-slate-900 !text-white hover:!bg-slate-800">Join with code</Button>
          </form>
        </Card>
      </div>

      <Card className="space-y-4">
        <SectionTitle><span className="flex items-center gap-2"><Users size={16} className="text-teal-700" /> My Families</span></SectionTitle>
        <select className="input" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Select family</option>
          {families.map(f => <option key={f._id} value={f._id}>{f.familyName} ({f.myRole})</option>)}
        </select>

        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Button onClick={invite} className="w-full sm:w-auto">Generate invitation</Button>

            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Members</div>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m._id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 dark:text-slate-500 font-semibold">{(m.userId?.name || 'U').charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">{m.userId?.name || 'User'} {m.role === 'admin' && <Crown size={13} className="text-amber-500" />}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{m.role} · {m.status}</div>
                      </div>
                    </div>
                    {m.status === 'active' && <button onClick={() => removeMember(m.userId?._id || m.userId)} className="text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-xl">Remove</button>}
                  </div>
                ))}
                {members.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No members found.</div>}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Invitations</div>
              <div className="space-y-2">
                {invites.map(i => (
                  <div key={i._id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-3">
                    <div>
                      <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-wider">{i.invitationCode}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">{i.status} · used {i.usedCount}/{i.maxUses}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={i.status === 'pending' ? 'amber' : i.status === 'accepted' ? 'emerald' : 'slate'}>{i.status}</Badge>
                      {i.status === 'pending' && <button onClick={() => revoke(i._id)} className="p-2 rounded-xl text-rose-700 bg-rose-50 dark:bg-rose-950/30"><ShieldX size={15} /></button>}
                    </div>
                  </div>
                ))}
                {invites.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No invitations (or no admin access to view).</div>}
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </Page>
  );
}
