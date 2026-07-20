/**
 * Send Money Page Controller
 * Senior Dev Note: Complete send money functionality with contacts, quick amounts, and transfer summary.
 */

import {
  getValue,
  getNumberValue,
  displayError,
  displaySuccess,
  updateBalanceDisplay,
} from "../dom.js";
import {
  validatePhone,
  validatePin,
  validateAmount,
  validateBalance,
} from "../validation.js";
import {
  BankService,
  SessionManager,
  TRANSACTION_TYPES,
} from "../bankservice.js";

class SendMoneyController {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    this.session = SessionManager.getSession();
    this.user = this.session.user;
    this.userId = this.user.id;
    this.userPin = this.user?.pin;
    this.isProcessing = false;

    this.savedContacts = JSON.parse(
      localStorage.getItem("payoo_contacts") || "[]",
    );

    this.recentContacts = JSON.parse(
      localStorage.getItem("recent_contacts") || "[]",
    );

    const defaultContacts = [
      { name: "Hasan", phone: "09876543210" },
      { name: "Rahim", phone: "01712345678" },
      { name: "নাজিমুল হাসান", phone: "01911223344" },
      { name: "Shadow", phone: "01899887766" },
    ];

    if (this.recentContacts.length === 0) {
      this.recentContacts = defaultContacts.map((contact) => ({
        ...contact,
        lastUsed: null,
      }));
      localStorage.setItem(
        "recent_contacts",
        JSON.stringify(this.recentContacts),
      );
    } else {
      const merged = defaultContacts.map((defaultContact) => {
        const existing = this.recentContacts.find(
          (contact) => contact.phone === defaultContact.phone,
        );
        return existing
          ? { ...existing, name: defaultContact.name }
          : { ...defaultContact, lastUsed: null };
      });

      this.recentContacts = merged.concat(
        this.recentContacts.filter(
          (contact) =>
            !defaultContacts.some(
              (defaultContact) => defaultContact.phone === contact.phone,
            ) && contact.name !== "সাবিনা রহমান",
        ),
      );

      localStorage.setItem(
        "recent_contacts",
        JSON.stringify(this.recentContacts),
      );
    }

    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);

    this.renderContacts();
    this.setupRecipientLookup();
    this.setupQuickAmounts();
    this.setupSendButton();
    this.setupRealTimeSummary();
    this.renderRecentTransfers();

    const urlParams = new URLSearchParams(window.location.search);
    const phoneParam = urlParams.get("phone");
    if (phoneParam) {
      const recipientInput = document.getElementById("recipient-number");
      if (recipientInput) {
        recipientInput.value = phoneParam;
        this.lookupRecipient(phoneParam);
      }
    }

    const pinInput = document.getElementById("send-pin");
    if (pinInput) {
      pinInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.showReviewForCurrentForm();
        }
      });
    }
  }

  _removeReviewModal() {
    const existing = document.getElementById("payoo-send-review-modal");
    if (existing) existing.remove();
  }

  showReviewModal({ recipient, amount, message } = {}) {
    this._removeReviewModal();
    const wrapper = document.createElement("div");
    wrapper.id = "payoo-send-review-modal";
    wrapper.className = "fixed inset-0 z-[60] flex items-center justify-center";
    wrapper.innerHTML = `
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="bg-base-100 p-6 rounded-2xl shadow-lg z-10 w-full max-w-md">
        <h3 class="font-bold mb-3">Review Transfer</h3>
        <div class="space-y-2 text-sm text-slate-700">
          <div><strong>To:</strong> ${this.escapeHtml(recipient)}</div>
          <div><strong>Amount:</strong> $${Number(amount).toFixed(2)}</div>
          ${message ? `<div><strong>Message:</strong> ${this.escapeHtml(message)}</div>` : ""}
        </div>
        <div class="mt-4 flex gap-2 justify-end">
          <button id="payoo-send-review-cancel" class="btn btn-ghost">Cancel</button>
          <button id="payoo-send-review-confirm" class="btn btn-primary">Confirm & Send</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    const cancel = document.getElementById("payoo-send-review-cancel");
    const confirm = document.getElementById("payoo-send-review-confirm");

    const cleanup = () => this._removeReviewModal();

    cancel?.addEventListener("click", (e) => {
      e.preventDefault();
      cleanup();
    });

    confirm?.addEventListener("click", async (e) => {
      e.preventDefault();
      cleanup();
      await this.handleSendMoney();
    });
  }

  showReviewForCurrentForm() {
    const recipientNumber = getValue("recipient-number");
    const amount = getNumberValue("send-amount");
    const message = getValue("send-message");
    const pin = getValue("send-pin");

    const recipientValidation = validatePhone(recipientNumber);
    if (!recipientValidation.isValid) {
      displayError("Invalid recipient number: " + recipientValidation.error);
      document.getElementById("recipient-number").focus();
      return;
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      displayError(amountValidation.error);
      document.getElementById("send-amount").focus();
      return;
    }

    const balanceValidation = validateBalance(amount, this.user.balance);
    if (!balanceValidation.isValid) {
      displayError(balanceValidation.error);
      return;
    }

    const pinValidation = validatePin(pin);
    if (!pinValidation.isValid) {
      displayError(pinValidation.error);
      document.getElementById("send-pin").focus();
      return;
    }

    const contact = this.recentContacts.find(
      (c) => c.phone === recipientNumber,
    );
    const recipientLabel = contact ? contact.name : recipientNumber;
    this.showReviewModal({ recipient: recipientLabel, amount, message });
  }

  renderContacts() {
    const container = document.getElementById("contacts-list");
    if (!container) return;

    const allContacts = [...this.savedContacts, ...this.recentContacts.filter(
      rc => !this.savedContacts.some(sc => sc.phone === rc.phone)
    )];

    const sorted = [...allContacts].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      if (!a.lastUsed && !a.dateAdded) return 1;
      if (!b.lastUsed && !b.dateAdded) return -1;
      const aDate = a.lastUsed || a.dateAdded;
      const bDate = b.lastUsed || b.dateAdded;
      return new Date(bDate) - new Date(aDate);
    });

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-neutral/50">
          <i class="fa-solid fa-users text-2xl mb-2 block"></i>
          <p class="text-sm">No contacts yet</p>
          <p class="text-xs mt-1">Add contacts in the Contact page</p>
        </div>
      `;
      return;
    }

    container.innerHTML = sorted
      .map(
        (contact) => `
      <div class="contact-item flex items-center justify-between p-3 bg-base-200 rounded-xl" data-phone="${contact.phone}">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span class="text-primary font-bold">${contact.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}</span>
          </div>
          <div>
            <p class="font-medium text-sm">${contact.name}</p>
            <p class="text-xs text-neutral/50">${contact.phone}</p>
          </div>
        </div>
        <div class="flex items-center gap-1"><button class="pin-contact btn btn-ghost btn-xs" type="button" data-phone="${contact.phone}" aria-label="${contact.pinned ? "Unpin" : "Pin"} ${contact.name}"><i class="${contact.pinned ? "fa-solid text-warning" : "fa-regular"} fa-star"></i></button><i class="fa-solid fa-chevron-right text-neutral/30"></i></div>
      </div>
    `,
      )
      .join("");

    container.querySelectorAll(".contact-item").forEach((item) => {
      item.addEventListener("click", () => {
        const phone = item.dataset.phone;
        document.getElementById("recipient-number").value = phone;
        this.lookupRecipient(phone);

        container
          .querySelectorAll(".contact-item")
          .forEach((i) => i.classList.remove("selected"));
        item.classList.add("selected");
      });
    });
    container.querySelectorAll(".pin-contact").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const toggle = (contacts) => contacts.map((contact) => contact.phone === button.dataset.phone ? { ...contact, pinned: !contact.pinned } : contact);
        this.savedContacts = toggle(this.savedContacts);
        this.recentContacts = toggle(this.recentContacts);
        localStorage.setItem("payoo_contacts", JSON.stringify(this.savedContacts));
        localStorage.setItem("recent_contacts", JSON.stringify(this.recentContacts));
        this.renderContacts();
      });
    });
  }

  setupRecipientLookup() {
    const recipientInput = document.getElementById("recipient-number");
    if (!recipientInput) return;

    recipientInput.addEventListener("input", () => {
      const phone = recipientInput.value.trim();
      if (phone.length === 11) {
        this.lookupRecipient(phone);
      } else {
        document
          .getElementById("recipient-name-preview")
          .classList.add("hidden");
      }
    });

    if (recipientInput.value.length === 11) {
      this.lookupRecipient(recipientInput.value);
    }
  }

  async lookupRecipient(phone) {
    const preview = document.getElementById("recipient-name-preview");
    if (!preview) return;

    const savedContact = this.savedContacts.find((c) => c.phone === phone);
    if (savedContact) {
      preview.textContent = `✅ Recipient: ${savedContact.name}`;
      preview.classList.remove("hidden", "text-error");
      preview.classList.add("text-success");
      return;
    }

    const contact = this.recentContacts.find((c) => c.phone === phone);

    if (contact) {
      preview.textContent = `✅ Recipient: ${contact.name}`;
      preview.classList.remove("hidden", "text-error");
      preview.classList.add("text-success");
    } else if (phone === "09876543210") {
      preview.textContent = "✅ Recipient: Jane Smith";
      preview.classList.remove("hidden", "text-error");
      preview.classList.add("text-success");
    } else if (phone === this.user.phone) {
      preview.textContent = "❌ Cannot send money to yourself";
      preview.classList.remove("hidden", "text-success");
      preview.classList.add("text-error");
    } else {
      preview.textContent = "⚠️ New recipient - please verify the number";
      preview.classList.remove("hidden", "text-success", "text-error");
      preview.classList.add("text-warning");
      preview.style.color = "#f59e0b";
    }
  }

  setupQuickAmounts() {
    const buttons = document.querySelectorAll(".quick-amount-btn");
    const amountInput = document.getElementById("send-amount");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const amount = button.dataset.amount;
        amountInput.value = amount;

        buttons.forEach((b) => b.classList.remove("selected"));
        button.classList.add("selected");

        this.updateSummary();
      });
    });

    amountInput.addEventListener("input", () => {
      buttons.forEach((b) => b.classList.remove("selected"));
      this.updateSummary();
    });
  }

  setupRealTimeSummary() {
    const amountInput = document.getElementById("send-amount");
    if (amountInput) {
      amountInput.addEventListener("input", () => {
        this.updateSummary();
      });
    }
  }

  updateSummary() {
    const amount = getNumberValue("send-amount");
    const summary = document.getElementById("transfer-summary");

    if (!summary) return;

    if (amount > 0) {
      summary.classList.remove("hidden");
      document.getElementById("summary-amount").textContent =
        `$${amount.toFixed(2)}`;
      document.getElementById("summary-total").textContent =
        `$${amount.toFixed(2)}`;
    } else {
      summary.classList.add("hidden");
    }
  }

  setupSendButton() {
    const sendBtn = document.getElementById("send-money-btn");
    if (sendBtn) {
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showReviewForCurrentForm();
      });
    }
  }

  async handleSendMoney() {
    if (this.isProcessing) return;

    const recipientNumber = getValue("recipient-number");
    const amount = getNumberValue("send-amount");
    const message = getValue("send-message");
    const pin = getValue("send-pin");

    const recipientValidation = validatePhone(recipientNumber);
    if (!recipientValidation.isValid) {
      displayError("Invalid recipient number: " + recipientValidation.error);
      document.getElementById("recipient-number").focus();
      document.getElementById("recipient-number").classList.add("input-error");
      setTimeout(
        () =>
          document
            .getElementById("recipient-number")
            .classList.remove("input-error"),
        1000,
      );
      return;
    }

    if (recipientNumber === this.user.phone) {
      displayError("Cannot send money to yourself");
      return;
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      displayError(amountValidation.error);
      document.getElementById("send-amount").focus();
      return;
    }

    const balanceValidation = validateBalance(amount, this.user.balance);
    if (!balanceValidation.isValid) {
      displayError(balanceValidation.error);
      return;
    }

    const pinValidation = validatePin(pin);
    if (!pinValidation.isValid) {
      displayError(pinValidation.error);
      document.getElementById("send-pin").focus();
      document.getElementById("send-pin").classList.add("input-error");
      setTimeout(
        () =>
          document.getElementById("send-pin").classList.remove("input-error"),
        1000,
      );
      return;
    }

    if (pin !== this.userPin) {
      displayError("Invalid PIN. Please check your 4-digit PIN.");
      const pinInput = document.getElementById("send-pin");
      pinInput.value = "";
      pinInput.focus();
      pinInput.classList.add("input-error");
      setTimeout(() => pinInput.classList.remove("input-error"), 1000);
      return;
    }

    this.setProcessing(true);

    try {
      const result = await BankService.sendMoney(
        this.userId,
        recipientNumber,
        amount,
      );

      if (!result.success) {
        displayError(result.error);
        this.setProcessing(false);
        return;
      }

      this.user.balance = result.data.newBalance;
      this.user.transactions = result.data.allTransactions || [];

      this.updateRecentContacts(recipientNumber, result.data.recipientName);

      SessionManager.setSession(
        sessionStorage.getItem("payoo_token"),
        this.user,
      );

      updateBalanceDisplay(this.user.balance);

      let successMsg = `✅ Successfully sent $${amount.toFixed(2)} to ${result.data.recipientName || recipientNumber}`;

      if (result.data.bonus) {
        successMsg += `\n🎁 Bonus Earned: +$${result.data.bonus.bonusAmount}!`;

        setTimeout(() => {
          const bonusMsg = `🎁 Congratulations! You earned a $${result.data.bonus.bonusAmount} bonus for this transfer!`;
          displaySuccess(bonusMsg);
        }, 500);
      }

      displaySuccess(successMsg);

      // Dispatch event to notify other pages (like dashboard) of transaction
      window.dispatchEvent(new CustomEvent("payoo:transaction"));

      document.getElementById("recipient-number").value = "";
      document.getElementById("send-amount").value = "";
      document.getElementById("send-message").value = "";
      document.getElementById("send-pin").value = "";
      document.dispatchEvent(new Event("payoo:clear-draft"));
      document.getElementById("send-pin").classList.remove("input-error");
      document.getElementById("transfer-summary").classList.add("hidden");
      document.getElementById("recipient-name-preview").classList.add("hidden");

      document
        .querySelectorAll(".quick-amount-btn")
        .forEach((b) => b.classList.remove("selected"));

      document
        .querySelectorAll(".contact-item")
        .forEach((i) => i.classList.remove("selected"));

      this.renderRecentTransfers();
      this.renderContacts();
    } catch (error) {
      console.error("Send money error:", error);
      displayError("Transfer failed. Please try again.");
    } finally {
      this.setProcessing(false);
    }
  }

  updateRecentContacts(phone, name) {
    const existingIndex = this.recentContacts.findIndex(
      (c) => c.phone === phone,
    );

    if (existingIndex >= 0) {
      this.recentContacts[existingIndex].lastUsed = new Date().toISOString();
      if (name) this.recentContacts[existingIndex].name = name;
    } else {
      this.recentContacts.push({
        name: name || `User ${phone.slice(-4)}`,
        phone: phone,
        lastUsed: new Date().toISOString(),
      });
    }

    if (this.recentContacts.length > 10) {
      this.recentContacts = this.recentContacts.slice(-10);
    }

    localStorage.setItem(
      "recent_contacts",
      JSON.stringify(this.recentContacts),
    );
  }

  renderRecentTransfers() {
    const container = document.getElementById("recent-transfers");
    if (!container) return;

    const transfers = (this.user.transactions || []).filter(
      (tx) => tx.type === TRANSACTION_TYPES.TRANSFER,
    );

    if (transfers.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-neutral/50">
          <p class="text-sm">No recent transfers</p>
        </div>
      `;
      return;
    }

    container.innerHTML = transfers
      .slice(0, 5)
      .map((transfer) => {
        const date = new Date(transfer.date);
        const formattedDate = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const formattedTime = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return `
        <div class="flex justify-between items-center p-3 bg-base-200 rounded-xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
              <i class="fa-solid fa-arrow-up text-error"></i>
            </div>
            <div>
              <p class="text-sm font-medium">${this.escapeHtml(transfer.description)}</p>
              <p class="text-xs text-neutral/40">${formattedDate} • ${formattedTime}</p>
            </div>
          </div>
          <span class="text-error font-bold">-$${transfer.amount.toFixed(2)}</span>
        </div>
      `;
      })
      .join("");
  }

  setProcessing(processing) {
    this.isProcessing = processing;
    const button = document.getElementById("send-money-btn");
    if (button) {
      button.disabled = processing;
      button.innerHTML = processing
        ? '<span class="loading loading-spinner loading-sm"></span> Sending...'
        : '<i class="fa-solid fa-paper-plane"></i> Send Money';
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new SendMoneyController();
});
