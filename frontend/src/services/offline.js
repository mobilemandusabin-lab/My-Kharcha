import { openDB } from 'idb';
import api from './api';

const DB_NAME = 'mykharcha';
const STORE = 'pendingTransactions';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'clientTransactionId' });
        store.createIndex('createdAt', 'createdAt');
      }
    },
  });
}

export async function queueTransaction(tx) {
  const db = await getDb();
  await db.put(STORE, { ...tx, queuedAt: new Date().toISOString() });
}

export async function getPendingTransactions() {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function removePending(clientTransactionId) {
  const db = await getDb();
  await db.delete(STORE, clientTransactionId);
}

export async function syncPendingTransactions() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, results: [] };
  const pending = await getPendingTransactions();
  if (!pending.length) return { synced: 0, results: [] };
  try {
    const { data } = await api.post('/transactions/sync', { transactions: pending });
    const results = data.results || [];
    let synced = 0;
    for (const r of results) {
      if (r.status === 'ok' && r.clientTransactionId) {
        await removePending(r.clientTransactionId);
        synced++;
      }
    }
    return { synced, results, remaining: (await getPendingTransactions()).length };
  } catch (e) {
    return { synced: 0, error: e, remaining: pending.length };
  }
}

export function setupOfflineSync(onSynced) {
  const run = async () => {
    const res = await syncPendingTransactions();
    if (res && res.synced && onSynced) onSynced(res);
  };
  window.addEventListener('online', run);
  window.addEventListener('focus', run);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
  // initial try
  setTimeout(run, 1000);
  return () => {
    window.removeEventListener('online', run);
    window.removeEventListener('focus', run);
  };
}
