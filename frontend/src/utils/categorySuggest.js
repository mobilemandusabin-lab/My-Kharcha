const RULES = [
  { keywords: ['rent', 'house rent', 'room rent', 'bhada'], category: 'Rent', types: ['expense'] },
  { keywords: ['khaja', 'snack', 'snacks', 'momo', 'samosa', 'chiya'], category: 'Snacks/Khaja', types: ['expense'] },
  { keywords: ['petrol', 'fuel', 'diesel'], category: 'Fuel/Petrol', types: ['expense'] },
  { keywords: ['taxi', 'pathao', 'indrive', 'ride', 'cab'], category: 'Taxi/Ride', types: ['expense'] },
  { keywords: ['bus', 'tempo', 'fare', 'transport', 'yatayat'], category: 'Transportation', types: ['expense'] },
  { keywords: ['lunch'], category: 'Lunch', types: ['expense'] },
  { keywords: ['dinner'], category: 'Dinner', types: ['expense'] },
  { keywords: ['breakfast'], category: 'Breakfast', types: ['expense'] },
  { keywords: ['tea', 'coffee', 'chai'], category: 'Tea/Coffee', types: ['expense'] },
  { keywords: ['grocery', 'kirana', 'supermarket', 'bazar'], category: 'Groceries', types: ['expense'] },
  { keywords: ['electricity', 'bijuli', 'light bill'], category: 'Electricity', types: ['expense'] },
  { keywords: ['water', 'pani', 'dhara'], category: 'Water', types: ['expense'] },
  { keywords: ['internet', 'wifi', 'phone', 'recharge', 'mobile', 'data'], category: 'Internet & Phone', types: ['expense'] },
  { keywords: ['medicine', 'hospital', 'doctor', 'pharmacy', 'clinic'], category: 'Health', types: ['expense'] },
  { keywords: ['movie', 'cinema', 'netflix', 'entertainment'], category: 'Entertainment', types: ['expense'] },
  { keywords: ['salary', 'payroll'], category: 'Salary', types: ['income'] },
  { keywords: ['business', 'sales', 'profit'], category: 'Business Income', types: ['income'] },
  { keywords: ['freelance', 'project', 'client'], category: 'Freelance', types: ['income'] },
  { keywords: ['investment', 'dividend', 'interest'], category: 'Investment', types: ['income'] },
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text) {
  const n = normalize(text);
  return n ? n.split(' ').filter(Boolean) : [];
}

function similarity(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let overlap = 0;
  for (const t of sa) if (sb.has(t)) overlap++;
  const union = new Set([...sa, ...sb]).size;
  const jaccard = union ? overlap / union : 0;
  const na = normalize(a);
  const nb = normalize(b);
  const contains = na.includes(nb) || nb.includes(na) ? 0.35 : 0;
  return Math.min(1, jaccard + contains);
}

function ruleScore(title, category, type) {
  const n = normalize(title);
  if (!n) return 0;
  let best = 0;
  for (const rule of RULES) {
    if (rule.category !== category) continue;
    if (rule.types && !rule.types.includes(type)) continue;
    for (const kw of rule.keywords) {
      const nk = normalize(kw);
      if (!nk) continue;
      if (n === nk) best = Math.max(best, 1);
      else if (n.includes(nk)) best = Math.max(best, 0.95);
      else if (nk.includes(n) && n.length >= 3) best = Math.max(best, 0.7);
    }
  }
  return best;
}

function behaviorScores(title, type, history = []) {
  const scores = new Map();
  const nTitle = normalize(title);
  if (!nTitle) return scores;
  const now = Date.now();
  for (const tx of history) {
    if (!tx || tx.type !== type || !tx.title || !tx.category) continue;
    const sim = similarity(title, tx.title);
    if (sim < 0.45) continue;
    const ageDays = Math.max(0, (now - new Date(tx.transactionAt || tx.createdAt || now).getTime()) / (1000 * 60 * 60 * 24));
    const recency = 1 / (1 + ageDays / 30); // recent transactions weigh more
    const weight = sim * (0.7 + 0.3 * recency);
    scores.set(tx.category, (scores.get(tx.category) || 0) + weight);
  }
  // normalize 0..1
  let max = 0;
  for (const v of scores.values()) max = Math.max(max, v);
  if (max > 0) for (const [k, v] of scores.entries()) scores.set(k, v / max);
  return scores;
}

export function suggestCategory({ title, type, categories = [], history = [] }) {
  const n = normalize(title);
  if (!n || n.length < 2) return null;
  const allowed = new Set(categories);
  const bScores = behaviorScores(title, type, history);
  let best = null;

  for (const cat of categories) {
    const r = ruleScore(title, cat, type);
    const b = bScores.get(cat) || 0;
    const hasBehavior = bScores.size > 0;
    // 75% behavior, 25% rules when behavior exists; otherwise rules
    const final = hasBehavior ? (0.75 * b + 0.25 * r) : r;
    const confidence = final;
    if (!best || confidence > best.confidence) {
      best = { category: cat, confidence, behavior: b, rule: r, hasBehavior };
    }
  }

  if (!best) return null;
  const threshold = best.hasBehavior ? 0.28 : 0.55;
  if (best.confidence < threshold) return null;
  if (!allowed.has(best.category)) return null;
  return best;
}

export function suggestCategories({ title, type, categories = [], history = [], limit = 3 }) {
  const n = normalize(title);
  if (!n || n.length < 2) return [];
  const bScores = behaviorScores(title, type, history);
  const hasBehavior = bScores.size > 0;
  const scored = categories.map(cat => {
    const r = ruleScore(title, cat, type);
    const b = bScores.get(cat) || 0;
    const confidence = hasBehavior ? (0.75 * b + 0.25 * r) : r;
    return { category: cat, confidence, behavior: b, rule: r, hasBehavior };
  }).filter(x => x.confidence >= (hasBehavior ? 0.28 : 0.55))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
  return scored;
}
