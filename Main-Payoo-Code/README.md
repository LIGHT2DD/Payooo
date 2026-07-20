# Payoo — Digital Wallet & Personal Finance Demo

Payoo is a responsive front-end digital-wallet application built as a Programming Hero project. It simulates common mobile-banking tasks—adding money, cashing out, sending money, paying bills, tracking savings, and reviewing transactions—within a polished desktop and mobile-friendly interface.

> Important: Payoo is a front-end demonstration. Financial information is simulated and stored in browser storage; it is not connected to a real bank or payment provider.

## Project overview

The goal of Payoo is to provide a clear, user-friendly banking experience while demonstrating practical JavaScript skills: form validation, session handling, reusable modules, local persistence, responsive layouts, charts, accessibility, and transaction-style workflows.

### Main objectives

- Create a realistic digital-wallet interface.
- Keep each financial action simple, validated, and easy to understand.
- Support desktop, tablet, and mobile views without changing the core flow.
- Persist demo data locally so users can continue a session after navigation.
- Add usability and safety features without requiring a backend.

## Features

### Account and dashboard

- Demo login and local session handling.
- Available-balance display with optional hide/show control.
- Theme and language controls.
- Responsive sidebar, header, breadcrumb, notifications, and profile access.
- Dashboard statistics, charts, recent activity, quick actions, and optional widget visibility customization.
- Session inactivity warning with a **Continue session** action.

### Money actions

- Add Money with validation and draft saving.
- Cashout with PIN validation, balance checks, amount preview, fee preview, and a final confirmation summary.
- Send Money with contact lookup, recent contacts, pinned contacts, quick amounts, review-before-send, and transfer history.
- Pay Bill by category with saved bills, reminders, validation, and a final confirmation summary.
- Get Bonus and Donate workflows.

### Finance tools

- Savings-goal creation and deposits.
- Friendly savings-goal delete confirmation and a time-limited Undo action.
- Budget calculator with saved scenarios.
- Currency converter with conversion history.
- Currency database.
- QR scanner interface with scan history and helpful empty state.
- Calendar and upcoming updates pages.

### Transactions and receipts

- Searchable and filterable transaction list.
- Sort by date or amount.
- Pagination for large lists.
- CSV export and print view.
- Individual printable transaction receipts.
- Saved search, filter, and sort preferences.

### User experience and accessibility

- Toast notifications announced through `aria-live`.
- Keyboard shortcuts and focus-visible styles.
- Focus handling inside dialogs.
- Tooltips for icon-only controls.
- Inline amount previews in BDT.
- Improved empty states for first-time users.
- Browser-data notice and reset control in Profile.

## User flow

```text
Login
  ↓
Dashboard
  ├── Add Money
  ├── Cashout → validate → confirm → transaction recorded
  ├── Send Money → review → confirm → transaction recorded
  ├── Pay Bill → validate → confirm → transaction recorded
  ├── Savings → create/manage goals
  └── Transactions → filter/export/print receipt
```

The flow is intentionally consistent: users select an action, enter details, receive validation feedback, confirm sensitive financial actions, and then see the updated balance and transaction data.

## Technology stack

| Area | Technology |
| --- | --- |
| Structure | HTML5 |
| Styling | Tailwind CSS browser build + DaisyUI |
| Interactivity | Vanilla JavaScript (ES modules) |
| Icons | Font Awesome |
| Charts | Chart.js |
| Persistence | `localStorage` and `sessionStorage` |
| Architecture | Page-specific controllers plus shared utility modules |

## Project structure

```text
Main-Payoo-Code/
├── assets/                  # Logo and visual assets
├── data/                    # Demo data
├── script/
│   ├── bankservice.js       # Mock banking service and session manager
│   ├── dom.js               # Reusable DOM and toast utilities
│   ├── desktop-shell.js     # Shared desktop sidebar/header shell
│   ├── dashboard.js         # Dashboard controller and widgets
│   ├── enhancements.js      # Shared safety, receipt, and accessibility helpers
│   ├── ux.js                # Keyboard shortcuts, tooltips, focus styles
│   ├── validation.js        # Form validation rules
│   └── pages/               # Controllers for individual feature pages
├── index.html               # Login page
├── home.html                # Dashboard
├── transaction.html         # Transaction history
├── user-profile.html        # Profile and demo-data controls
└── presentation.html        # Submission presentation slide deck
```

## Recent improvements

The following enhancements were added while preserving the original navigation and transaction flow:

1. Session inactivity warning with a Continue Session button.
2. Printable individual transaction receipts.
3. Undo support for deleting savings goals, saved bills, and bill reminders.
4. Improved empty states for transactions and QR scan history.
5. Local-data notice and Reset Demo Data control in the profile page.
6. Toast announcements, dialog focus management, and clearer icon labels.
7. BDT amount previews and estimated-fee display.
8. Transaction search/filter/sort preference persistence.
9. Dashboard widget visibility customization.
10. Pinned frequent contacts in Send Money.
11. Confirmation summaries before Cashout and Pay Bill.
12. A friendly, accessible savings-goal deletion dialog with a recovery option.

## Running the project

This is a static front-end project.

1. Download or clone the project folder.
2. Open the folder in VS Code.
3. Start it with **Live Server** (recommended), or serve the folder using any static web server.
4. Open `index.html` in the browser.

### Demo credentials

| Phone number | PIN | Role |
| --- | --- | --- |
| `01234567890` | `1234` | Main demo account |
| `09876543210` | `5678` | Demo recipient account |

## Testing checklist

- [x] Login validation and demo session
- [x] Add Money, Cashout, Send Money, and Pay Bill validation
- [x] Balance updates after transactions
- [x] Transaction search, filter, sorting, pagination, CSV export, and receipt printing
- [x] Savings goal create, add money, delete, Undo, and restore
- [x] Saved bill and reminder deletion Undo
- [x] Profile demo-data reset
- [x] Desktop, tablet, and mobile layouts
- [x] JavaScript syntax checks for updated modules

## Limitations

- The application uses mock banking data rather than a real API.
- Browser storage is not appropriate for production financial data.
- PINs and authentication must be handled by a secure backend in a real system.
- Currency values and fee estimates are demonstrational.

## Future scope

- Build a Node.js/Express or similar backend with a secure database.
- Hash PINs/passwords and use secure JWT or server sessions.
- Add real payment-gateway and bank-provider integrations.
- Add two-factor authentication and device management.
- Add real exchange-rate APIs and bill-provider APIs.
- Add automated unit, integration, and end-to-end tests.
- Add downloadable PDF receipts and email/SMS notifications.

## Presentation

Open [presentation.html](presentation.html) in a browser to present the project. Use the arrow keys, Space, or the on-screen buttons to navigate slides.

## Author

**Project:** Payoo Mobile Bank
**Name:** Sabber Rahman
**Id:**B220102018
**Dept:**ICT

Replace this section with your name, student ID, batch, and submission date before submitting.
