require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Settings = require('../models/Settings');
const { getCurrentBS, getDaysInBSMonth, bsToAdDate, fromNepalWallClockToUtc } = require('../utils/nepalDate');
const { v4: uuidv4 } = require('uuid');

const SEED_EMAILS = [
  'sabin.seed@mykharcha.local',
  'shivani.seed@mykharcha.local',
  'member3.seed@mykharcha.local',
  'user@gmail.com',
  'superadmin@gmail.com',
  'user2@gmail.com',
];

function prevBS(year, month) {
  if (month > 1) return { year, month: month - 1 };
  return { year: year - 1, month: 12 };
}

function bsDateToUtc(year, month, day, hour=12, minute=0) {
  const ad = bsToAdDate(year, month, day);
  return fromNepalWallClockToUtc(ad.year, ad.month - 1, ad.day, hour, minute, 0, 0);
}

async function clearSeedData() {
  const seedUsers = await User.find({ email: { $in: SEED_EMAILS } }).select('_id');
  const seedUserIds = seedUsers.map(u => u._id);
  const seedFamilies = await Family.find({ familyName: 'Awal Family' }).select('_id');
  const seedFamilyIds = seedFamilies.map(f => f._id);
  await Transaction.deleteMany({ $or: [{ isSeed: true }, { userId: { $in: seedUserIds } }, { familyId: { $in: seedFamilyIds } }] });
  await Budget.deleteMany({ $or: [{ isSeed: true }, { userId: { $in: seedUserIds } }, { familyId: { $in: seedFamilyIds } }] });
  await FamilyMember.deleteMany({ $or: [{ userId: { $in: seedUserIds } }, { familyId: { $in: seedFamilyIds } }] });
  await Family.deleteMany({ _id: { $in: seedFamilyIds } });
  await Settings.deleteMany({ userId: { $in: seedUserIds } });
  await User.deleteMany({ _id: { $in: seedUserIds } });
}

async function seedData({ resetOnly = false } = {}) {
  await clearSeedData();
  if (resetOnly) {
    return { cleared: true, seeded: false };
  }

  const hash123 = await bcrypt.hash('password123', 10);
  const hash123456 = await bcrypt.hash('123456', 10);
  const sabin = await User.create({ name: 'Sabin Awal', email: 'sabin.seed@mykharcha.local', passwordHash: hash123, status: 'active', role: 'user' });
  const shivani = await User.create({ name: 'Shivani Awal', email: 'shivani.seed@mykharcha.local', passwordHash: hash123, status: 'active', role: 'user' });
  const member3 = await User.create({ name: 'Family Member 3', email: 'member3.seed@mykharcha.local', passwordHash: hash123, status: 'active', role: 'user' });
  const user1 = await User.create({ name: 'User', email: 'user@gmail.com', passwordHash: hash123456, status: 'active', role: 'user' });
  const superadmin = await User.create({ name: 'Super Admin', email: 'superadmin@gmail.com', passwordHash: hash123456, status: 'active', role: 'superadmin' });
  const user2 = await User.create({ name: 'User 2', email: 'user2@gmail.com', passwordHash: hash123456, status: 'active', role: 'user' });
  for (const u of [sabin, shivani, member3, user1, superadmin, user2]) await Settings.create({ userId: u._id });

  const family = await Family.create({ familyName: 'Awal Family', description: 'Seed family', createdBy: sabin._id, currency: 'NPR', timezone: 'Asia/Kathmandu', invitationCode: 'AWAL1234', isActive: true });
  await FamilyMember.create({ familyId: family._id, userId: sabin._id, role: 'admin', status: 'active', joinedAt: new Date() });
  await FamilyMember.create({ familyId: family._id, userId: shivani._id, role: 'member', status: 'active', joinedAt: new Date() });
  await FamilyMember.create({ familyId: family._id, userId: member3._id, role: 'member', status: 'active', joinedAt: new Date() });

  const cur = getCurrentBS();
  const prev = prevBS(cur.year, cur.month);
  const curDays = getDaysInBSMonth(cur.year, cur.month);
  const prevDays = getDaysInBSMonth(prev.year, prev.month);
  const pickDay = (m, i) => Math.max(1, Math.min((m==='cur'?curDays:prevDays), i));

  const rows = [
    { title:'Salary received', type:'income', amount:70000, category:'Salary', paymentMethod:'Bank Transfer', m:'cur', d:1, h:9, min:0, bookmark:true },
    { title:'Lunch', type:'expense', amount:450, category:'Lunch', paymentMethod:'Cash', m:'cur', d:2, h:13, min:0, bookmark:true },
    { title:'Coffee', type:'expense', amount:180, category:'Tea/Coffee', paymentMethod:'Cash', m:'cur', d:2, h:16, min:30 },
    { title:'Petrol', type:'expense', amount:1500, category:'Fuel/Petrol', paymentMethod:'Card', m:'cur', d:3, h:8, min:30, bookmark:true },
    { title:'Grocery shopping', type:'expense', amount:3250, category:'Groceries', paymentMethod:'eSewa', m:'cur', d:4, h:18, min:0 },
    { title:'Electricity bill', type:'expense', amount:1850, category:'Electricity', paymentMethod:'Bank Transfer', m:'cur', d:5, h:10, min:0 },
    { title:'Internet bill', type:'expense', amount:1200, category:'Internet & Phone', paymentMethod:'eSewa', m:'cur', d:5, h:11, min:0 },
    { title:'Family dinner', type:'expense', amount:1800, category:'Dinner', paymentMethod:'Card', m:'cur', d:6, h:20, min:0, bookmark:true },
    { title:'Taxi', type:'expense', amount:450, category:'Taxi/Ride', paymentMethod:'Cash', m:'cur', d:7, h:9, min:15 },
    { title:'Medicine', type:'expense', amount:750, category:'Health', paymentMethod:'Cash', m:'prev', d:28, h:17, min:0 },
    { title:'Clothing', type:'expense', amount:2400, category:'Shopping', paymentMethod:'Card', m:'prev', d:25, h:15, min:0 },
    { title:'Movie', type:'expense', amount:800, category:'Entertainment', paymentMethod:'eSewa', m:'prev', d:22, h:19, min:0 },
    { title:'Mobile recharge', type:'expense', amount:300, category:'Internet & Phone', paymentMethod:'Khalti', m:'prev', d:20, h:12, min:0 },
    { title:'Household items', type:'expense', amount:1350, category:'Personal', paymentMethod:'Cash', m:'prev', d:18, h:14, min:0 },
    { title:'Snacks', type:'expense', amount:250, category:'Snacks/Khaja', paymentMethod:'Cash', m:'prev', d:16, h:16, min:0 },
    { title:'Birthday gift', type:'expense', amount:2000, category:'Shopping', paymentMethod:'Card', m:'prev', d:14, h:13, min:0, bookmark:true },
    { title:'Bus ticket', type:'expense', amount:500, category:'Transportation', paymentMethod:'Cash', m:'prev', d:12, h:8, min:0 },
    { title:'Restaurant', type:'expense', amount:1250, category:'Dinner', paymentMethod:'Card', m:'prev', d:10, h:19, min:30 },
    { title:'Water bill', type:'expense', amount:450, category:'Water', paymentMethod:'Cash', m:'prev', d:8, h:10, min:30 },
    { title:'Online purchase', type:'expense', amount:4500, category:'Shopping', paymentMethod:'Card', m:'prev', d:5, h:21, min:0 },
  ];

  let count = 0;
  for (const r of rows) {
    const ym = r.m === 'cur' ? cur : prev;
    const day = pickDay(r.m, r.d);
    await Transaction.create({
      userId: sabin._id,
      familyId: null,
      clientTransactionId: uuidv4(),
      scope: 'personal',
      type: r.type,
      title: r.title,
      amount: r.amount,
      category: r.category,
      paymentMethod: r.paymentMethod,
      paidBy: sabin._id,
      notes: 'Seed sample',
      transactionAt: bsDateToUtc(ym.year, ym.month, day, r.h, r.min),
      isBookmarked: !!r.bookmark,
      source: 'seed',
      paymentStatus: 'paid',
      isSeed: true,
    });
    count++;
  }

  await Transaction.create({ userId: shivani._id, familyId:null, clientTransactionId: uuidv4(), scope:'personal', type:'income', title:'Freelance payment', amount:15000, category:'Freelance', paymentMethod:'Bank Transfer', paidBy: shivani._id, notes:'Seed sample', transactionAt: bsDateToUtc(cur.year,cur.month,2,11,0), isBookmarked:false, source:'seed', paymentStatus:'paid', isSeed:true });
  await Transaction.create({ userId: shivani._id, familyId:null, clientTransactionId: uuidv4(), scope:'personal', type:'expense', title:'Lunch', amount:350, category:'Lunch', paymentMethod:'Cash', paidBy: shivani._id, notes:'Seed sample', transactionAt: bsDateToUtc(cur.year,cur.month,3,13,0), isBookmarked:false, source:'seed', paymentStatus:'paid', isSeed:true });

  await Budget.create({ userId: sabin._id, familyId:null, scope:'personal', year: cur.year, month: cur.month, totalBudget:30000, categoryBudgets:[{category:'Food & Drinks',amount:8000},{category:'Lunch',amount:4000},{category:'Dinner',amount:4000},{category:'Transportation',amount:5000},{category:'Shopping',amount:6000}], isSeed:true });

  const famRows = [
    { title:'Monthly groceries', amount:5000, category:'Groceries', paidBy:sabin._id, method:'eSewa', d:2 },
    { title:'Electricity', amount:1850, category:'Electricity', paidBy:shivani._id, method:'Bank Transfer', d:3 },
    { title:'Internet', amount:1200, category:'Internet & Phone', paidBy:sabin._id, method:'eSewa', d:3 },
    { title:'Family dinner', amount:2000, category:'Dinner', paidBy:shivani._id, method:'Cash', d:4 },
    { title:'Household items', amount:1500, category:'Personal', paidBy:member3._id, method:'Cash', d:5 },
  ];
  for (const r of famRows) {
    await Transaction.create({ userId: r.paidBy, familyId: family._id, clientTransactionId: uuidv4(), scope:'family', type:'expense', title:r.title, amount:r.amount, category:r.category, paymentMethod:r.method, paidBy:r.paidBy, notes:'Seed family sample', transactionAt: bsDateToUtc(cur.year,cur.month,Math.min(r.d,curDays),18,0), isBookmarked:false, source:'seed', paymentStatus:'paid', isSeed:true });
  }
  await Budget.create({ userId:null, familyId: family._id, scope:'family', year: cur.year, month: cur.month, totalBudget:30000, categoryBudgets:[{category:'Groceries',amount:10000},{category:'Electricity',amount:3000},{category:'Internet & Phone',amount:2000}], isSeed:true });

  return {
    cleared: true,
    seeded: true,
    personalRows: count,
    users: SEED_EMAILS,
    credentials: {
      'sabin.seed@mykharcha.local': 'password123',
      'shivani.seed@mykharcha.local': 'password123',
      'member3.seed@mykharcha.local': 'password123',
      'user@gmail.com': '123456',
      'superadmin@gmail.com': '123456',
      'user2@gmail.com': '123456',
    },
    family: 'Awal Family',
  };
}

async function runCli() {
  await connectDB();
  const resetOnly = process.argv.includes('--reset');
  const result = await seedData({ resetOnly });
  if (resetOnly) console.log('Seed data cleared');
  else {
    console.log('Seed complete. Personal seeded rows:', result.personalRows, '(expected 20)');
    console.log('Seed credentials:', JSON.stringify(result.credentials, null, 2));
  }
  await disconnectDB();
  return result;
}

if (require.main === module) {
  runCli().catch(async (e) => { console.error(e); try { await disconnectDB(); } catch {} process.exit(1); });
}

module.exports = { seedData, clearSeedData, SEED_EMAILS };
