# MyKharcha — Integrated Development Plan (Personal + Family)

## Clarifications incorporated

- **Auth:** Email/password multi-user accounts. `/quick-add` requires authentication; if opened via Shortcut/Back Tap without an active session, show a “Please log in first” prompt and redirect to login, then return to `/quick-add` after successful sign-in.
- **Nepali month cycle:** Every monthly period follows **Bikram Sambat (BS) month**. A month starts on **BS day 1** and ends on the last day of that BS month (in `Asia/Kathmandu`) for dashboard current month, budgets, monthly reports, and month-end summaries.
- **Categories:** Typed categories (`expense`, `income`, or `both`) and transactions store the **category name** (denormalized). Defaults cover utilities and daily kharcha (Rent, Electricity, Water, Internet & Phone, Bills & Utilities, Groceries, Lunch, Dinner, Snacks/Khaja, Breakfast, Tea/Coffee, Food & Drinks, Transportation, Fuel/Petrol, Vehicle Maintenance, Taxi/Ride, Shopping, Entertainment, Health, Family, Travel, Education, Personal, Other) and income sources (Salary, Business Income, Freelance, Investment, Rental Income, Gift/Family Support, Other Income).
- **Offline/IDs:** Generate a unique `clientTransactionId` for **every** new transaction create (online/offline) for idempotent sync. Offline support includes queued create + sync/retry on reconnect/app focus; edit/delete of synced records requires connectivity unless extended.
- **Credit/Udharo:** Unpaid status on a transaction, settle later. `paymentStatus` (`paid` | `unpaid`, default `paid`) with optional `settledAt`. Unpaid transactions count in totals/budgets/reports at `transactionAt`, are filterable/outstanding, and are settled without duplication. (Inter-member debt splitting/settlement is a separate optional later feature.)
- **Week:** **Sunday–Saturday** week in `Asia/Kathmandu`; **Saturday marked as holiday** in breakdowns.
- **Seed:** 20 listed personal rows (Income NPR 70,000; Expenses NPR 25,230; Net NPR 44,770), distributed over current/previous BS months, ≥5 bookmarked. Extended with family seed (Awal Family) separate from personal data.
- **Income & month-end matching:** Users can add multiple income entries/sources per BS month; BS month-end/monthly summary matches all income (total/breakdown) against all expenses (total/breakdown) with net savings/deficit and outstanding udhar.

---

## 1. Project Objective
Build a modern, minimal, fast, functional personal & family expense tracker (PWA, iPhone-first). Support multi-user email/password auth, personal and family scopes with strict isolation, income/expense/udhar transactions, BS-primary calendar (month starts BS day 1), Nepal timezone, bookmarks, history, budgets, reports and month-end income-vs-expense matching, offline create+sync, and Quick Add via Apple Shortcut/Back Tap (`/quick-add`, login-first if unauthenticated).

## 2. Technology Stack
- Frontend: React, Vite, Tailwind CSS, React Router, Lucide Icons, Recharts, PWA
- Backend: Node.js, Express.js, REST, Mongoose
- Database: MongoDB + IndexedDB (offline queue)
- Testing: Vitest/Jest, Supertest, React Testing Library, Playwright, MongoDB Memory Server or isolated test DB
- Constraints: No Firebase/Supabase; no fake APIs or hardcoded dashboard data.

## 3. UI/UX Requirements
App name **MyKharcha**. Minimal premium mobile-first, native-like PWA, light default + dark mode, rounded cards, subtle borders, clean typography, large amounts, bottom nav, touch-friendly, no unnecessary animations. Clear Personal/Family scope, pending-sync and udhar labels.

## 4. Authentication, Users, and Sessions
- Email/password multi-user (register/login/logout/me), hashed passwords, backend-enforced authz.
- Persistent/refreshable session for PWA. `/quick-add` requires login; if unauthenticated show “Please log in first” and return after login.
- Users may belong to multiple families; access only own personal data and active-member families/roles.

## 5. Scope Model: Personal vs Family
- `scope`: `personal` or `family`. Personal owned by user (`familyId` null). Family belongs to `familyId` with active membership; `userId` creator, `paidBy` actual payer.
- Never mix totals, never auto-assign personal to family, never expose personal to family, no double counting. Persist selected scope/family.

## 6. Dashboard and Month-End Summary
- Switcher: Personal | Families.
- Personal: today expenses/count/income, current BS-month expenses/income/net, BS month-end summary (income vs expenses matched, breakdowns, net, outstanding udhar), budget remaining/utilization, recent transactions, BS date + AD date + Nepal time.
- Family: same scope-correct family totals/summary, budget utilization, member-wise paid, recent family history.
- Updates immediately after changes/sync; DB-calculated; pending offline creates shown clearly.

## 7. Transaction Management (Expense, Income, Credit/Udharo)
- Quick Add (`/quick-add`) and add/edit/detail flows. Fields: type, amount>0, title, category (valid for type), date/time (Nepal defaults), payment method, notes, bookmark, paymentStatus (paid/unpaid).
- Scope selector Personal/Family; family requires `familyId`, active membership, `paidBy` (default current user).
- Unique `clientTransactionId` for every create, `source` recorded. Udhar settle later without duplication. Validation, no duplicate submit, confirmations/errors.
- Permissions: personal owner only; family per role (admin/member/viewer, backend enforced).

## 8. Family Expense Management System
- Multiple families/users/memberships. Roles: Admin (manage family/members/roles/invites/transactions/budgets/reports/export), Member (view/add, edit own family expenses as authorized, bookmark, view budgets/reports/contributions), Viewer (view only). Backend-enforced.
- Family creation: name, description/image, NPR, Asia/Kathmandu; creator Admin; unique invitation code/link.
- Invitations: link/code, expiration, revocable, single-use or max uses, pending/accepted tracking, no private data in URLs, no unauthorized/duplicate joins.
- Family expense: amount/title/category/date/time/payment/paidBy/notes/bookmark/paymentStatus, valid family and membership.
- Contributions: expenses paid by member (count/monthly/category/%), labeled as paid/contributed not consumption.
- Family budgets: admin-defined overall/category BS-month budgets, utilization/remaining/warnings, members view.
- Family reports: totals/income/balance, month-end matching, member-wise paid, category/daily/weekly(Sun–Sat, Sat holiday)/monthly BS spending, payment breakdown, budget utilization, filters.
- Optional later phase: shared splits/settlement records (not expenses, no double counting), distinct from udhar status.

## 9. Categories and Payment Methods
- Typed, named categories stored denormalized on transactions. Default income: Salary, Business Income, Freelance, Investment, Rental Income, Gift/Family Support, Other Income. Default expense: Rent, Electricity, Water, Internet & Phone, Bills & Utilities, Groceries, Lunch, Dinner, Snacks/Khaja, Breakfast, Tea/Coffee, Food & Drinks, Transportation, Fuel/Petrol, Vehicle Maintenance, Taxi/Ride, Shopping, Entertainment, Health, Family, Travel, Education, Personal, Other.
- Payment methods: Cash, eSewa, Khalti, Bank Transfer, Card, Other.

## 10. iPhone Back Tap Integration
- Physical back double-tap is iOS Back Tap (not detectable by PWA). Dedicated `https://YOUR_DOMAIN/quick-add` (cold start works; login-first if unauthenticated).
- Apple Shortcut **“Add Expense - MyKharcha”** opens URL. Document setup in `docs/IOS_BACK_TAP_SETUP.md` (Settings > Accessibility > Touch > Back Tap > Double Tap). Test assignability/workarounds per iOS; real-device testing required; never mark passed from simulation.

## 11. Nepali Calendar and Timezone
- Asia/Kathmandu (UTC+05:45). BS primary, AD secondary. Store timestamps UTC, convert for display/grouping. BS months start day 1.
- Reliable pinned BS conversion library/dataset (no fixed month lengths). Tests: BS↔AD, month/year boundaries, leap years, midnight rollover, UTC→Nepal.

## 12. Transaction History
Scope-aware search/filter (title, category, payment, BS date/range, type, bookmark, udhar, family member/paidBy), sort (newest/oldest/highest/lowest), daily and BS monthly totals, month-end summary view, pagination/infinite loading for long lists.

## 13. Bookmark System
Toggle from cards/details, dedicated bookmarks view, filter/sort, persisted in MongoDB, scope/permission respecting.

## 14. Reports and Analytics
- Personal & Family: daily/weekly (Sun–Sat, Sat holiday)/monthly (BS) reports; totals, averages/high/low, category/payment breakdowns, daily trends, member-wise paid (family), **month-end income-vs-expense matching**. Income excluded from expense totals; udhar included at transaction date and identifiable.
- Charts: daily bar, monthly trend, category distribution, payment breakdown, income-vs-expense comparison.

## 15. Budget Management
- Personal/family BS-month budgets (year/month BS, start day 1), overall and category-specific, no duplicates per scope+period.
- Display budget/spent/remaining/%/category comparison; warnings at 75%, 90%, exceeded. Family admin manages by default.

## 16. PWA and Offline Support
- Manifest, service worker, icons/apple-touch, offline fallback, standalone, theme, Apple meta; Safari Add to Home Screen/standalone. No background sync guarantee on all iOS states.
- IndexedDB queue for creates with unique `clientTransactionId`, pending status, sync on reconnect/open/focus, retry, never discard. Server idempotency unique `(userId, clientTransactionId)`; safe sync responses. Membership/permissions validated on sync.

## 17. MongoDB Data Models
(Use money-safe values and appropriate indexes.)
- **User:** _id, name, email(unique), passwordHash, profileImage, status, timestamps
- **Family:** _id, familyName, description, familyImage, createdBy, currency, timezone, invitationCode, isActive, timestamps
- **FamilyMember:** _id, familyId, userId, role(admin/member/viewer), status(pending/active/removed), joinedAt, invitedBy, timestamps; unique (familyId,userId)
- **FamilyInvitation:** _id, familyId, invitationCode, invitedBy, expiresAt, maxUses, usedCount, status, createdAt
- **Transaction:** _id, userId, familyId(nullable), clientTransactionId, scope, type(expense/income), title, amount, category(name), paymentMethod, paidBy, notes, transactionAt(UTC), isBookmarked, source, paymentStatus(paid/unpaid), settledAt, timestamps; enforce scope/membership rules
- **Category:** _id, owner/scope, name, type(expense/income/both), icon, color, isDefault, isActive
- **Budget:** _id, userId(nullable family), familyId(nullable personal), scope, year, month(BS), totalBudget, categoryBudgets[{category,amount}], timestamps; no duplicate scope+period
- **Settings:** _id, userId, currency, timezone, calendarPreference, theme, persisted scope/selectedFamilyId

## 18. Backend API
All private endpoints authenticated/authorized; family endpoints verify active membership & role. Validate and secure errors.
- Auth: register/login/logout/me
- Transactions: CRUD, bookmark, settle, sync; personal and family-scoped endpoints
- Families: CRUD, members, invite/list/revoke, join, role/remove
- Reports: daily/weekly/monthly/categories/summary/month-end-summary (personal & family)
- Budgets: CRUD (personal & family, BS month)
- Settings: get/put; Export: protected CSV (personal/family as authorized)

## 19. Navigation and Settings
Bottom nav: Home, History, Add, Reports, Settings. Dashboard scope selector persisted. Settings: profile, family management/members/invitations/budgets, preferences.

## 20. Test Data and Seed
`backend/src/seed/seed.js` (dev-only load/reset/clear/reload seeded records only; never delete real data; TEST DATA indicator). 20 personal rows as specified (70k/25230/44770), BS-distributed, ≥5 bookmarked; personal budgets; Awal Family users/memberships, sample personal txns for Sabin/Shivani, 5 family txns totaling 11,550, family budget 30k.

## 21. Testing Requirements
Automated backend/frontend/calendar/timezone/offline tests; family security (15 cases) and acceptance scenarios A–H; real iPhone manual tests for Safari install/standalone, quick-add/login-first, shortcut/back-tap, save/udhar, MongoDB/report verification, offline+sync. No simulation-only pass for Back Tap.

## 22. Test Results
`docs/TEST_RESULTS.md` with actual results only (date, version, env, device/iOS/browser, command, result, errors, fixes; statuses Not run/Passed/Failed/Blocked/Needs retesting).

## 23. Security
Env vars, auth/authz, validation, Mongo injection protection, rate limiting, CORS, secure errors, HTTPS prod, backups, protected export, no exposed credentials, strict personal/family isolation.

## 24. Project Structure
As specified (`frontend/`, `backend/src/{models,routes,controllers,middleware,services,seed,tests}`, `docs/`, `.env.example`, `package.json`, `README.md`, `plan.md`).

## 25. Implementation Phases
1. Foundation & Auth  2. Core Personal (incl. BS/udhar/month-end matching)  3. Family core  4. Reports & Budgets (BS)  5. PWA/Offline/Quick Add & iOS docs  6. QA, hardening, deployment. Optional later: family settlement/splitting.

## 26. Definition of Done
All scope/auth/data/isolation, income-expense matching, udhar, BS/Nepal-time correctness, budgets/reports accuracy, PWA/offline safe sync, quick-add/login-first and documented/tested Back Tap, executed tests with actual recorded results, and complete docs/README/deployment instructions.
