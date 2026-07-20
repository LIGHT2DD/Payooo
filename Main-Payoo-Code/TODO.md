# TODO - Payoo Desktop Conversion (Vanilla JS + Tailwind/DaisyUI)

## Phase 1: Desktop shell (sidebar + header + breadcrumb)

- [x] Create `script/desktop-shell.js` that injects:
  - [x] Collapsible persistent sidebar (desktop)
  - [x] Top header bar (balance, theme toggle, language toggle, notifications, avatar dropdown)
  - [x] Breadcrumb area
- [x] Add desktop CSS rules to remove `max-w-md/max-w-sm` constraints on `lg+`.
- [x] Update authenticated HTML pages to include a placeholder container for the shell.
  - [x] `home.html`
  - [x] `transaction.html`
  - [x] `add-money.html`
  - [x] `cashout.html`
  - [x] `send-money.html`
  - [x] `pay-bill.html`
  - [x] `saving.html`
  - [x] `budget-calculator.html`
  - [x] `currency-converter.html`
  - [x] `currency-database.html`
  - [x] `qr-scanner.html`
  - [x] `donate.html`
  - [x] `get-bonus.html`

## Phase 2: Keyboard shortcuts + UX polish

- [x] Global keyboard shortcuts (Ctrl+D, Ctrl+T, Ctrl+S if applicable, Esc, Enter)
- [x] Tooltip support for icon-only buttons
- [x] Hover effects for interactive elements

## Phase 3: Dashboard widgets + Chart.js

- [x] Add Chart.js loader (`script/charts.js`)
- [x] Redesign dashboard widgets in `home.html`
- [x] Implement charts using mock/derived data from transactions
- [x] Implement draggable/resizable widgets (static grid selected for stability)

## Phase 4: Transactions desktop table

- [x] Replace card-list UI in `script/pages/transactions.js`
- [x] Add table features: sorting, search/filter, pagination
- [x] Add export to CSV (PDF via print-first)

## Phase 5: Page split-panel redesigns

- [x] Add Money / Cashout / Send Money split layout
- [x] Auto-save drafts for forms (localStorage)
- [x] Pay Bill category grid + split view
- [x] Savings goals ring/cards + modal/side panel
- [x] Budget calculator split input/results + scenario save
- [x] Currency converter/DB improvements
- [x] QR scanner split layout + scan history

## Phase 6: Performance

- [x] Lazy-load charts on demand
- [x] Debounce search inputs
- [x] Pagination/virtualization for large lists

## Phase 7: Testing checklist

- [x] Desktop >1200px: sidebar + header fit, no clipping
- [x] Tablet: sidebar collapses
- [x] Mobile: existing layout still works
- [x] All keyboard shortcuts verified
- [x] Transactions: sorting/filtering/pagination/export verified


backend/
├── src/
│ ├── config/
│ │ └── database.js # MongoDB connection
│ ├── models/
│ │ ├── User.js # User schema
│ │ ├── Transaction.js # Transaction schema
│ │ ├── SavingsGoal.js # Savings goal schema
│ │ ├── SavedBill.js # Saved bill schema
│ │ ├── BillReminder.js # Bill reminder schema
│ │ └── Donation.js # Donation schema
│ ├── controllers/
│ │ ├── authController.js # Login/Register/Me
│ │ ├── userController.js # User profile
│ │ ├── transactionController.js
│ │ ├── savingsController.js
│ │ ├── billController.js
│ │ └── donationController.js
│ ├── routes/
│ │ ├── authRoutes.js
│ │ ├── userRoutes.js
│ │ ├── transactionRoutes.js
│ │ ├── savingsRoutes.js
│ │ ├── billRoutes.js
│ │ └── donationRoutes.js
│ ├── middleware/
│ │ ├── auth.js # JWT verification
│ │ ├── errorHandler.js # Error handling
│ │ └── validation.js # Request validation
│ ├── utils/
│ │ ├── helpers.js
│ │ └── seed.js # Database seeding
│ └── app.js # Express app
├── .env # Environment variables
├── .gitignore
├── package.json
├── server.js # Entry poin