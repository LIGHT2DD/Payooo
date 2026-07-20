/** Global keyboard shortcuts, accessible tooltips, and interaction polish. */

const shortcuts = {
  d: "home.html",
  t: "transaction.html",
  s: "saving.html",
};

function isEditableTarget(target) {
  return (
    target instanceof HTMLElement &&
    (target.matches("input, textarea, select, [contenteditable='true']") ||
      target.isContentEditable)
  );
}

function closeOverlays() {
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  document.querySelectorAll("details[open]").forEach((details) => {
    details.open = false;
  });
  document.activeElement?.blur?.();
}

function addTooltips() {
  document.querySelectorAll("button, a.btn").forEach((control) => {
    if (control.matches(".payoo-sidebar .payoo-nav-link")) return;

    const hasText = [...control.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
    );
    const label =
      control.getAttribute("aria-label") || control.getAttribute("title");
    if (!hasText && label) {
      control.classList.add("payoo-tooltip");
      control.dataset.tooltip = label;
      if (!control.getAttribute("aria-label"))
        control.setAttribute("aria-label", label);
      if (control.hasAttribute("title")) {
        control.removeAttribute("title");
      }
    }
  });
}

function addStyles() {
  if (document.getElementById("payoo-ux-styles")) return;
  const style = document.createElement("style");
  style.id = "payoo-ux-styles";
  style.textContent = `
    .payoo-tooltip { position: relative; }
    .payoo-tooltip::after { content: attr(data-tooltip); position: absolute; z-index: 80; left: 50%; top: calc(100% + 8px); transform: translateX(-50%) translateY(-2px); width: max-content; max-width: 15rem; padding: .35rem .55rem; border-radius: .4rem; background: oklch(var(--bc)); color: oklch(var(--b1)); font-size: .75rem; line-height: 1.1; opacity: 0; pointer-events: none; transition: opacity .15s, transform .15s; }
    .payoo-tooltip:hover::after, .payoo-tooltip:focus-visible::after { opacity: 1; transform: translateX(-50%) translateY(0); }
    a, button, .card, .quick-action, .transaction-item { transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease; }
    a.btn:hover, button.btn:hover, .quick-action:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgb(15 23 42 / .10); }
    a:focus-visible, button:focus-visible, summary:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid oklch(var(--p) / .4); outline-offset: 2px; }
  `;
  document.head.append(style);
}

export function initGlobalUX() {
  if (document.documentElement.dataset.payooUxReady === "true") return;
  document.documentElement.dataset.payooUxReady = "true";
  addStyles();
  addTooltips();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOverlays();
      return;
    }

    if (event.ctrlKey && !event.altKey && !event.metaKey) {
      const destination = shortcuts[event.key.toLowerCase()];
      if (destination) {
        event.preventDefault();
        window.location.href = destination;
        return;
      }
    }

    if (event.key === "Enter" && !isEditableTarget(event.target)) {
      const action = document.querySelector("[data-enter-action]");
      if (action instanceof HTMLElement) action.click();
    }
  });
}
