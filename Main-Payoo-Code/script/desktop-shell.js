import { initGlobalUX } from "./ux.js";
import { initPageUpgrades } from "./page-upgrades.js";
import { initEnhancements } from "./enhancements.js";
import { updateBalanceDisplay } from "./dom.js";

// Desktop Shell: persistent sidebar and top header injection.
// Works on authenticated pages.

export function initDesktopShell({ pageId, navItems = [] } = {}) {
  initEnhancements();
  const root = document.getElementById("app-shell");
  if (!root || root.dataset.shellReady === "true") return;

  // Preserve every existing page element (including dialogs) and place it in
  // the shell after it has been created. Page controllers continue to find
  // the same element IDs, so the mobile implementation remains intact.
  const pageNodes = [...document.body.children].filter(
    (node) => node !== root && node.tagName !== "SCRIPT",
  );
  root.dataset.shellReady = "true";

  const normalizePath = (value = "") =>
    value.replace(/^\.\//, "").replace(/[#?].*$/, "");
  const currentPath = normalizePath(
    window.location.pathname.split("/").pop() || "",
  );

  // Minimal mapping when pageId isn't provided.
  const activeId = pageId || currentPath.replace(/\.html$/i, "");

  const labelFromId = (id) =>
    id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Default nav list if not passed.
  const items =
    navItems.length > 0
      ? navItems
      : [
          {
            id: "home",
            label: "Dashboard",
            href: "home.html",
            icon: "fa-solid fa-gauge-high",
          },
          {
            id: "user-profile",
            label: "Profile",
            href: "user-profile.html",
            icon: "fa-solid fa-user",
          },
          {
            id: "contact",
            label: "Contact",
            href: "contact.html",
            icon: "fa-solid fa-headset",
          },
          {
            id: "add-money",
            label: "Add Money",
            href: "add-money.html",
            icon: "fa-solid fa-circle-plus",
          },
          {
            id: "cashout",
            label: "Cashout",
            href: "cashout.html",
            icon: "fa-solid fa-arrow-right-arrow-left",
          },
          {
            id: "send-money",
            label: "Send Money",
            href: "send-money.html",
            icon: "fa-solid fa-paper-plane",
          },
          {
            id: "pay-bill",
            label: "Pay Bill",
            href: "pay-bill.html",
            icon: "fa-solid fa-file-invoice",
          },
          {
            id: "transactions",
            label: "Transactions",
            href: "transaction.html",
            icon: "fa-solid fa-list-check",
          },
          {
            id: "saving",
            label: "Savings",
            href: "saving.html",
            icon: "fa-solid fa-piggy-bank",
          },
          {
            id: "donate",
            label: "Donate",
            href: "donate.html",
            icon: "fa-solid fa-hand-holding-heart",
          },
          {
            id: "budget-calculator",
            label: "Budget Calculator",
            href: "budget-calculator.html",
            icon: "fa-solid fa-calculator",
          },
          {
            id: "currency-converter",
            label: "Currency Converter",
            href: "currency-converter.html",
            icon: "fa-solid fa-money-bill-transfer",
          },
          {
            id: "currency-database",
            label: "Currency Database",
            href: "currency-database.html",
            icon: "fa-solid fa-database",
          },
          {
            id: "qr-scanner",
            label: "QR Scanner",
            href: "qr-scanner.html",
            icon: "fa-solid fa-qrcode",
          },
          {
            id: "get-bonus",
            label: "Get Bonus",
            href: "get-bonus.html",
            icon: "fa-solid fa-gift",
          },
        ];

  const activeItem = items.find(
    (item) => item.id === activeId || normalizePath(item.href) === currentPath,
  );
  const pageHeading =
    activeItem?.label ||
    labelFromId(activeId) ||
    document.title.replace(/^Payoo\s*\|\s*/i, "") ||
    "Dashboard";

  const html = `
    <style>
      :root {
        --payoo-bg: oklch(var(--b1));
        --payoo-accent: #7460ff;
        --payoo-accent-soft: rgba(116, 96, 255, 0.12);
      }

      .payoo-shell {
        min-height: 100vh;
        width: 100%;
        display: grid;
        grid-template-columns: 1fr;
        transition: grid-template-columns 0.25s ease;
        overflow-x: hidden;
      }

      .payoo-shell.collapsed {
        grid-template-columns: 92px minmax(0, 1fr);
      }

      .payoo-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 20;
        height: 100vh;
        width: 280px;
        overflow-y: auto;
        border-right: 1px solid rgba(116, 96, 255, 0.14);
        background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95));
        backdrop-filter: blur(10px);
        transition: width 0.25s ease, padding 0.25s ease;
      }

      .payoo-shell.collapsed .payoo-sidebar {
        width: 92px;
      }

      .payoo-shell.collapsed .payoo-main {
        margin-left: 92px;
      }

      .payoo-shell.collapsed .payoo-sidebar .p-4 {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 72px;
      }

      .payoo-shell.collapsed .payoo-sidebar .p-4 > .flex {
        justify-content: center;
        gap: 0.25rem;
        width: 100%;
      }

      .payoo-shell.collapsed .payoo-sidebar .p-4 img {
        width: 2.25rem;
        height: 2.25rem;
      }

      .payoo-shell.collapsed .payoo-sidebar .payoo-sidebar-label,
      .payoo-shell.collapsed .payoo-sidebar .divider,
      .payoo-shell.collapsed .payoo-sidebar .mt-auto,
      .payoo-shell.collapsed .payoo-sidebar .payoo-sidebar-brand {
        display: none;
      }

      .payoo-shell.collapsed .payoo-sidebar nav {
        padding-left: 0;
        padding-right: 0;
      }

      .payoo-shell.collapsed .payoo-sidebar nav ul li .payoo-nav-link {
        justify-content: center;
      }

      .payoo-shell.collapsed .payoo-sidebar nav ul li .payoo-nav-link i {
        margin: 0;
      }

      .payoo-shell.collapsed .payoo-sidebar nav ul li .payoo-nav-link .payoo-sidebar-label {
        display: none;
      }

      [data-theme="dark"] .payoo-sidebar {
        background: linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.96));
        border-right-color: rgba(167, 139, 250, 0.18);
      }

      .payoo-main {
        display: grid;
        grid-template-rows: 1fr;
        margin-left: 280px;
        margin-top: 60px;
        position: relative;
      }

      .payoo-topbar {
        position: fixed;
        top: 0;
        left: 280px;
        right: 0;
        z-index: 30;
        border-bottom: 1px solid rgba(116, 96, 255, 0.14);
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(10px);
      }

      [data-theme="dark"] .payoo-topbar {
        border-bottom-color: rgba(52, 211, 153, 0.18);
        background: rgba(15,23,42,0.88);
      }

      .payoo-shell.collapsed .payoo-topbar {
        left: 92px;
      }

      @media (max-width: 1199px) {
        .payoo-shell {
          display: block;
        }
        .payoo-main {
          display: block;
        }
        .payoo-main > section {
          padding: 0;
        }
        .payoo-desktop-only {
          display: none !important;
        }
      }

      /* Calendar popover styles */
      .payoo-calendar-popover {
        position: absolute;
        z-index: 60;
        width: 320px;
        background: var(--payoo-bg, #ffffff);
        border: 1px solid rgba(116, 96, 255, 0.12);
        box-shadow: 0 10px 30px rgba(2, 6, 23, 0.08);
        border-radius: 12px;
        overflow: hidden;
      }
      .payoo-calendar-popover .cal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        gap: 8px;
      }
      .payoo-calendar-popover .cal-header .cal-title {
        font-weight: 600;
      }
      .payoo-calendar-popover .cal-grid {
        padding: 12px;
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 6px;
      }
      .payoo-calendar-popover .cal-day {
        text-align: center;
        color: rgba(0,0,0,0.6);
        font-size: 12px;
      }
      .payoo-calendar-popover .cal-date {
        padding: 8px;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        user-select: none;
      }
      .payoo-calendar-popover .cal-date:hover { background: rgba(116,96,255,0.06); }
      .payoo-calendar-popover .cal-date.today { border: 1px solid var(--payoo-accent); }
      .payoo-calendar-popover .cal-date.selected { background: var(--payoo-accent); color: white; }
      .payoo-calendar-popover.hidden { display: none; }
      [data-theme="dark"] .payoo-calendar-popover {
        background: rgba(10,10,20,0.95);
        border-color: rgba(167,139,250,0.12);
        color: #fff;
      }

      @media (min-width: 1200px) {
        body {
          max-width: none !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        [data-home-mobile-header] {
          display: none;
        }
        #payoo-page-container > header {
          display: none;
        }
      }

      .payoo-nav-link {
        transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;
        border-radius: 12px;
      }
      .payoo-nav-link:hover {
        transform: translateY(-1px);
        background-color: rgba(116, 96, 255, 0.08);
      }
      .payoo-nav-link.bg-primary\/15 {
        background: linear-gradient(135deg, rgba(116, 96, 255, 0.16), rgba(167, 139, 250, 0.12));
        color: var(--payoo-accent);
        box-shadow: 0 4px 16px rgba(116, 96, 255, 0.12);
      }
      .payoo-notifications-popover {
        position: absolute;
        z-index: 60;
        min-width: 260px;
        max-width: 360px;
        background: var(--payoo-bg, #fff);
        border: 1px solid rgba(116,96,255,0.08);
        box-shadow: 0 10px 30px rgba(2,6,23,0.08);
        border-radius: 10px;
        overflow: hidden;
      }
      .payoo-notifications-popover .note { padding: 10px; border-bottom: 1px solid rgba(0,0,0,0.04); }
      .payoo-notifications-popover .note.unread { background: rgba(116,96,255,0.04); }
      .payoo-notifications-popover .note .meta { font-size: 12px; color: rgba(0,0,0,0.5); }
      .payoo-notifications-popover.hidden { display: none; }
    </style>

    <div class="payoo-shell">
      <aside class="payoo-sidebar payoo-desktop-only flex flex-col" id="payoo-sidebar">
        <div class="p-4 flex items-center">
          <div class="flex items-center gap-2">
            <img src="assets/logo.png" alt="Payoo" class="w-9 h-9" />
            <span class="font-bold text-lg" id="payoo-sidebar-brand">Payoo</span>
          </div>
        </div>

        <nav class="px-2 pb-4" aria-label="Primary">
          <ul class="space-y-1">
            ${items
              .map((it) => {
                const id = it.id;
                const active = id === activeId || currentPath === it.href;
                return `
                  <li>
                    <a
                      href="${it.href}"
                      data-nav-id="${id}"
                      aria-label="${it.label}"
                      class="payoo-nav-link btn btn-ghost btn-sm w-full justify-start ${active ? "bg-primary/15 text-primary" : ""}"
                    >
                      <i class="${it.icon}"></i>
                      <span class="ml-2 ${active ? "font-semibold" : ""} payoo-sidebar-label">${it.label}</span>
                    </a>
                  </li>
                `;
              })
              .join("")}
          </ul>
        </nav>

        <div class="mt-auto px-4 pb-5">
          <div class="divider"></div>
          <div class="flex items-center gap-3">
            <div class="avatar">
              <div class="w-10 rounded-full ring ring-primary/30 bg-primary/10 text-primary grid place-items-center font-bold" aria-label="User account">
                <span id="payoo-user-initials">U</span>
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate" id="payoo-user-name">User</div>
              <div class="text-xs opacity-70" id="payoo-user-phone">—</div>
            </div>
            <details class="dropdown dropdown-end">
              <summary class="btn btn-ghost btn-sm btn-circle" title="User menu">
                <i class="fa-solid fa-ellipsis-vertical"></i>
              </summary>
              <ul class="menu dropdown-content bg-base-100 rounded-box z-[1] w-56 p-2 shadow">
                <li>
                  <a href="#" id="payoo-logout-link">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                    Logout
                  </a>
                </li>
              </ul>
            </details>
          </div>
        </div>
      </aside>

      <main class="payoo-main">
        <header class="payoo-topbar">
          <div class="px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-lg font-bold">${pageHeading}</div>
            </div>

            <div class="hidden xl:flex flex-1 justify-center items-center gap-3">
              <div class="text-sm opacity-80">Balance</div>
              <div class="text-2xl font-bold" id="payoo-shell-balance">$0.00</div>
            </div>

            <div class="flex items-center gap-3">
              <button id="payoo-lang-toggle" class="btn btn-ghost btn-sm" title="Toggle language">
                <i class="fa-solid fa-language"></i>
                <span id="payoo-lang-label" class="ml-2">EN</span>
              </button>
              <button id="payoo-theme-toggle" class="btn btn-ghost btn-sm" title="Toggle theme">
                <i id="payoo-theme-icon" class="fa-regular fa-lightbulb"></i>
              </button>
              <a id="payoo-calendar-btn" href="calendar.html" class="btn btn-ghost btn-sm" title="Calendar">
                <i class="fa-regular fa-calendar-days"></i>
              </a>
              <details class="dropdown dropdown-end">
                <summary class="btn btn-ghost btn-sm btn-circle" title="Account menu">
                  <div class="avatar">
                    <div class="w-7 rounded-full">
                      <span class="w-full h-full bg-primary/10 text-primary grid place-items-center text-xs font-bold" id="payoo-header-initials">U</span>
                    </div>
                  </div>
                </summary>
                <ul class="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                  <li><span class="menu-title" id="payoo-header-user">User</span></li>
                  <li><a href="#" class="payoo-logout-action"><i class="fa-solid fa-arrow-right-from-bracket"></i>Logout</a></li>
                </ul>
              </details>
            </div>
          </div>
        </header>

        <section class="px-4 sm:px-6 py-6">
          <div id="payoo-page-container"></div>
        </section>
      </main>
    </div>
  `;

  root.innerHTML = html;

  const pageContainer = root.querySelector("#payoo-page-container");
  pageContainer?.append(...pageNodes);

  // Header account information comes from the existing authenticated session.
  try {
    const user = JSON.parse(sessionStorage.getItem("payoo_user") || "null");
    if (user) {
      const name = root.querySelector("#payoo-user-name");
      const phone = root.querySelector("#payoo-user-phone");
      const balance = root.querySelector("#payoo-shell-balance");
      if (name) name.textContent = user.name || "User";
      const initials = (user.name || "User")
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const sidebarInitials = root.querySelector("#payoo-user-initials");
      const headerInitials = root.querySelector("#payoo-header-initials");
      if (sidebarInitials) sidebarInitials.textContent = initials;
      if (headerInitials) headerInitials.textContent = initials;
      const headerUser = root.querySelector("#payoo-header-user");
      if (headerUser) headerUser.textContent = user.name || "User";
      if (phone) phone.textContent = user.phone || "—";
      if (balance) updateBalanceDisplay(user.balance || 0);
    }
  } catch {}

  // Listen for transaction events to update shell balance
  window.addEventListener("payoo:transaction", () => {
    try {
      const updatedUser = JSON.parse(
        sessionStorage.getItem("payoo_user") || "null",
      );
      if (updatedUser) {
        updateBalanceDisplay(updatedUser.balance || 0);
      }
    } catch {}
  });

  // Theme
  const themeIcon = root.querySelector("#payoo-theme-icon");
  const themeBtn = root.querySelector("#payoo-theme-toggle");
  if (themeBtn) {
    const cur =
      localStorage.getItem("payoo_theme") ||
      document.documentElement.getAttribute("data-theme") ||
      "light";
    if (themeIcon) {
      themeIcon.className =
        cur === "dark" ? "fa-solid fa-moon" : "fa-regular fa-lightbulb";
    }

    themeBtn.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("payoo_theme", next);
      if (themeIcon) {
        themeIcon.className =
          next === "dark" ? "fa-solid fa-moon" : "fa-regular fa-lightbulb";
      }
    });
  }

  // Language toggle
  const langBtn = root.querySelector("#payoo-lang-toggle");
  const langLabel = root.querySelector("#payoo-lang-label");
  const currentLang = localStorage.getItem("payoo_lang") || "en";
  if (langLabel) langLabel.textContent = currentLang === "bn" ? "BN" : "EN";

  if (langBtn) {
    langBtn.addEventListener("click", () => {
      const lang =
        (localStorage.getItem("payoo_lang") || "en") === "bn" ? "en" : "bn";
      localStorage.setItem("payoo_lang", lang);
      if (langLabel) langLabel.textContent = lang === "bn" ? "BN" : "EN";
      // Let each page controller handle actual translations; here we just store.
      location.reload();
    });
  }

  // Calendar popover (custom, does not change any date formats)
  const calendarBtn = root.querySelector("#payoo-calendar-btn");
  function createCalendarPopover() {
    let pop = document.getElementById("payoo-calendar-popover");
    if (pop) return pop;
    pop = document.createElement("div");
    pop.id = "payoo-calendar-popover";
    pop.className = "payoo-calendar-popover hidden";
    document.body.appendChild(pop);
    return pop;
  }

  function renderCalendar(pop, date = new Date()) {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const month = date.getMonth();
    const year = date.getFullYear();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const daysInMonth = last.getDate();

    let html = `<div class="cal-header"><button id="cal-prev" class="btn btn-ghost btn-xs">‹</button><div class="cal-title">${monthNames[month]} ${year}</div><button id="cal-next" class="btn btn-ghost btn-xs">›</button></div>`;
    html += '<div class="cal-grid">';
    weekDayNames.forEach((d) => {
      html += `<div class="cal-day">${d}</div>`;
    });

    // leading empty cells
    for (let i = 0; i < startDay; i++) html += `<div></div>`;

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
      const classes = ["cal-date"];
      if (key === todayKey) classes.push("today");
      html += `<div class="${classes.join(" ")}" data-date="${dt.toISOString()}">${d}</div>`;
    }

    html += `</div>`;
    pop.innerHTML = html;

    pop.querySelector("#cal-prev").addEventListener("click", () => {
      renderCalendar(pop, new Date(year, month - 1, 1));
    });
    pop.querySelector("#cal-next").addEventListener("click", () => {
      renderCalendar(pop, new Date(year, month + 1, 1));
    });

    pop.querySelectorAll(".cal-date").forEach((el) => {
      el.addEventListener("click", (e) => {
        pop
          .querySelectorAll(".cal-date")
          .forEach((x) => x.classList.remove("selected"));
        el.classList.add("selected");
        // Briefly show selection badge near the button (UI only, no format changes)
        const sel = new Date(el.dataset.date);
        const badge = document.createElement("div");
        badge.className = "badge badge-info absolute z-70";
        badge.style.pointerEvents = "none";
        badge.textContent = `${sel.getFullYear()}-${String(sel.getMonth() + 1).padStart(2, "0")}-${String(sel.getDate()).padStart(2, "0")}`;
        document.body.appendChild(badge);
        const rect = calendarBtn.getBoundingClientRect();
        badge.style.left = `${rect.left}px`;
        badge.style.top = `${rect.bottom + 8 + window.scrollY}px`;
        setTimeout(() => badge.remove(), 1600);
      });
    });
  }

  function toggleCalendarFromButton(btn) {
    // Navigate to the full calendar page so it loads inside the app shell.
    try {
      window.location.href = "calendar.html";
    } catch (err) {
      // Fallback: open in new tab
      window.open("calendar.html", "_blank");
    }
  }

  if (calendarBtn) {
    // If the button is a link, let the browser handle navigation.
    if (!calendarBtn.href) {
      calendarBtn.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          console.debug("payoo: calendar button clicked", calendarBtn);
        } catch (e) {}
        toggleCalendarFromButton(calendarBtn);
      });
    }
  } else {
    // Fallback: delegate clicks in case the button wasn't found when queried
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest
        ? ev.target.closest("#payoo-calendar-btn")
        : null;
      if (btn) {
        ev.preventDefault();
        try {
          console.debug("payoo: delegated calendar click", btn);
        } catch (e) {}
        toggleCalendarFromButton(btn);
      }
    });
  }

  // Close when clicking outside
  document.addEventListener("click", (ev) => {
    const popEl = document.getElementById("payoo-calendar-popover");
    if (!popEl) return;
    // if click was on the button or inside popover, keep open
    const clickedOnBtn =
      ev.target.closest && ev.target.closest("#payoo-calendar-btn");
    if (!popEl.contains(ev.target) && !clickedOnBtn) {
      popEl.classList.remove("shown");
      popEl.classList.add("hidden");
    }
  });

  window.addEventListener("resize", () => {
    const popEl = document.getElementById("payoo-calendar-popover");
    const btn = document.querySelector("#payoo-calendar-btn");
    if (popEl && popEl.classList.contains("shown") && btn) {
      const rect = btn.getBoundingClientRect();
      popEl.style.left = `${Math.max(8, rect.left)}px`;
      popEl.style.top = `${rect.bottom + 8 + window.scrollY}px`;
    }
  });

  // Notifications integration
  function loadNotifications() {
    try {
      const listEl = root.querySelector("#payoo-notifications-list");
      const badge = root.querySelector("#payoo-notifications-badge");
      const raw = localStorage.getItem("payoo_notifications") || "[]";
      const notes = JSON.parse(raw);
      const unread = notes.filter((n) => !n.read).length;
      if (badge) {
        if (unread > 0) {
          badge.textContent = String(unread);
          badge.classList.remove("hidden");
        } else {
          badge.classList.add("hidden");
        }
      }
      if (listEl) {
        if (!notes.length) {
          listEl.innerHTML =
            '<div class="p-3 text-sm text-muted">No notifications</div>';
        } else {
          listEl.innerHTML = notes
            .slice()
            .reverse()
            .map(
              (n) => `
            <div class="note ${n.read ? "" : "unread"}" data-id="${n.id}">
              <div class="title font-medium">${n.title}</div>
              <div class="meta">${n.date} • ${new Date(n.timestamp).toLocaleString()}</div>
            </div>`,
            )
            .join("");
        }
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  }

  // Expose updater for pages to call after pushing notifications
  window.payooUpdateNotifications = loadNotifications;

  // Toggle notifications popover
  const notesBtn = root.querySelector("#payoo-notifications");
  const notesPopover = root.querySelector("#payoo-notifications-popover");
  if (notesBtn && notesPopover) {
    notesBtn.addEventListener("click", (e) => {
      e.preventDefault();
      notesPopover.classList.toggle("hidden");
      loadNotifications();
      const rect = notesBtn.getBoundingClientRect();
      notesPopover.style.left = `${Math.max(8, rect.left - notesPopover.offsetWidth + rect.width)}px`;
      notesPopover.style.top = `${rect.bottom + 8 + window.scrollY}px`;
    });

    // Click on notification item
    root.addEventListener("click", (ev) => {
      const noteEl = ev.target.closest && ev.target.closest(".note");
      if (noteEl && noteEl.dataset && noteEl.dataset.id) {
        const id = noteEl.dataset.id;
        try {
          const raw = localStorage.getItem("payoo_notifications") || "[]";
          const notes = JSON.parse(raw);
          const idx = notes.findIndex((n) => String(n.id) === String(id));
          if (idx !== -1) {
            notes[idx].read = true;
            localStorage.setItem("payoo_notifications", JSON.stringify(notes));
            loadNotifications();
          }
        } catch (e) {}
      }
    });

    const clearBtn = root.querySelector("#payoo-clear-notifications");
    if (clearBtn)
      clearBtn.addEventListener("click", () => {
        localStorage.removeItem("payoo_notifications");
        loadNotifications();
      });
  }

  // Listen storage (cross-tab) to update badge
  window.addEventListener("storage", (e) => {
    if (e.key === "payoo_notifications") loadNotifications();
  });

  // Initial load
  setTimeout(loadNotifications, 40);

  // Logout
  root
    .querySelectorAll("#payoo-logout-link, .payoo-logout-action")
    .forEach((logout) => {
      logout.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          // Avoid import cycles; controller pages already handle logout. Fallback:
          sessionStorage.removeItem("payoo_token");
          sessionStorage.removeItem("payoo_user");
        } catch {}
        window.location.href = "index.html";
      });
    });
}

// Each authenticated page only needs to load this module; its filename is
// used to select the active item automatically.
initDesktopShell();
initGlobalUX();
initPageUpgrades();
