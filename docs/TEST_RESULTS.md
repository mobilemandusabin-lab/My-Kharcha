# MyKharcha — Test Results

> Record actual execution results only. Never invent successful test results.

## Status legend
- Not run
- Passed
- Failed
- Blocked
- Needs retesting

## Summary

| Test area | Planned tests | Passed | Failed | Blocked | Status |
|---|---:|---:|---:|---:|---|
| Backend API | TBD | — | — | — | Not run |
| Frontend UI | TBD | — | — | — | Not run |
| Calendar | TBD | — | — | — | Not run |
| Timezone | TBD | — | — | — | Not run |
| Offline sync | TBD | — | — | — | Not run |
| PWA installation | Manual | — | — | — | Not run |
| iPhone Back Tap | Manual | — | — | — | Not run |
| Security | TBD | — | — | — | Not run |
| Family creation |  | — | — | — | Not run |
| Member invitation |  | — | — | — | Not run |
| Family transactions |  | — | — | — | Not run |
| Personal privacy |  | — | — | — | Not run |
| Family permissions |  | — | — | — | Not run |
| Family reports |  | — | — | — | Not run |
| Family budgets |  | — | — | — | Not run |
| Member removal |  | — | — | — | Not run |
| Playwright E2E | 6 | 6 | 0 | 0 | Passed |

## Execution log

### 2026-11-21 — Playwright E2E (expanded, executed)
- **Test date:** 2026-11-21
- **Application version:** Local working copy (updated implementation)
- **Environment:** Ubuntu 26.04.1 LTS, Node v22.23.4, npm 10.9.9
- **Device and iOS version:** N/A (desktop/headless browser run)
- **Browser version:** Playwright Chromium 159.0.8154.6 (chromium-1255)
- **Test command:** `npx playwright test`
- **Actual result:** **6 passed, 0 failed** (11.4s).
  1. quick-add route prompts login when unauthenticated — **Passed**
  2. register, add personal expense, and see it in dashboard/history — **Passed**
  3. udhar (unpaid) transaction can be marked settled — **Passed**
  4. offline create queues and syncs when back online — **Passed**
  5. seeded family data: Sabin can view Awal Family and reports — **Passed** (via `/api/dev/seed`)
  6. family invitation and join flow — **Passed**
- **Errors found:** (a) Initial smoke run failed once due to full-page navigation losing SPA auth state (fixed by client-side nav). (b) Expanded run exposed strict-mode selector issues after UI changes (`Add` link duplicated by dashboard quick-add button; `(Udharo)` matched filter option and label) and a truncated invite code in test parsing; backend invite codes made alphanumeric-safe.
- **Fixes applied:** Updated `tests/e2e.spec.js` selectors/navigation; fixed udhar label assertion; made family invitation code generation alphanumeric and robust parsing. Added dev seed endpoint for repeatable seeded E2E scenarios.
- **Notes:** Servers auto-started by Playwright webServer (backend on :5000 with in-memory MongoDB fallback, frontend Vite dev on :5173). An expected `403 Insufficient permissions` was logged server-side when a non-admin member context loaded invitations (UI handles gracefully); test flow passed. This is E2E coverage for key flows, not full coverage of all planned backend/frontend/calendar/timezone/offline/family/security/iPhone manual areas.

> No iPhone physical Back Tap/PWA installation tests were executed on a real device (manual/blocked in this environment). No fabricated results recorded.

### Template
- **Test date:** 
- **Application version:** 
- **Environment:** 
- **Device and iOS version:** 
- **Browser version:** 
- **Test command:** 
- **Actual result:** 
- **Errors found:** 
- **Fixes applied:** 
