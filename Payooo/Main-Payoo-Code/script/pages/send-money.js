/**
 * Send Money Page Controller
 * Senior Dev Note: Complete send money functionality with contacts, quick amounts, and transfer summary.
 */

import { getValue, getNumberValue, displayError, displaySuccess, updateBalanceDisplay } from "../dom.js";
import { validatePhone, validatePin, validateAmount, validateBalance } from "../validation.js";
import { BankService, SessionManager, TRANSACTION_TYPES } from "../bankservice.js";

class SendMoneyController {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    this.session = SessionManager.getSession();
    this.user = this.session.user;
    this.userId = this.user.id;
    this.userPin = "1234";
    this.isProcessing = false;

    // Recent contacts (simulated)
    this.recentContacts = JSON.parse(localStorage.getItem("recent_contacts") || "[]");
    
    // Default contacts
    if (this.recentContacts.length === 0) {
      this.recentContacts = [
        { name: "Jane Smith", phone: "09876543210", lastUsed: null },
        { name: "John Doe", phone: "01712345678", lastUsed: null },
      ];
      localStorage.setItem("recent_contacts", JSON.stringify(this.recentContacts));
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

    // Enter key support
    const pinInput = document.getElementById("send-pin");
    if (pinInput) {
      pinInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleSendMoney();
        }
      });
    }
  }

  renderContacts() {
    const container = document.getElementById("contacts-list");
    if (!container) return;

    // Sort by last used
    const sorted = [...this.recentContacts].sort((a, b) => {
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return new Date(b.lastUsed) - new Date(a.lastUsed);
    });

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-neutral/50">
          <i class="fa-solid fa-users text-2xl mb-2 block"></i>
          <p class="text-sm">No recent contacts</p>
          <p class="text-xs mt-1">Your frequent recipients will appear here</p>
        </div>
      `;
      return;
    }

    container.innerHTML = sorted.map(contact => `
      <div class="contact-item flex items-center justify-between p-3 bg-base-200 rounded-xl" data-phone="${contact.phone}">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span class="text-primary font-bold">${contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
          </div>
          <div>
            <p class="font-medium text-sm">${contact.name}</p>
            <p class="text-xs text-neutral/50">${contact.phone}</p>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right text-neutral/30"></i>
      </div>
    `).join("");

    // Add click events
    container.querySelectorAll(".contact-item").forEach(item => {
      item.addEventListener("click", () => {
        const phone = item.dataset.phone;
        document.getElementById("recipient-number").value = phone;
        this.lookupRecipient(phone);
        
        // Highlight selected
        container.querySelectorAll(".contact-item").forEach(i => i.classList.remove("selected"));
        item.classList.add("selected");
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
        document.getElementById("recipient-name-preview").classList.add("hidden");
      }
    });

    // Auto-lookup if phone is pre-filled
    if (recipientInput.value.length === 11) {
      this.lookupRecipient(recipientInput.value);
    }
  }

  async lookupRecipient(phone) {
    const preview = document.getElementById("recipient-name-preview");
    if (!preview) return;

    // Check in recent contacts first
    const contact = this.recentContacts.find(c => c.phone === phone);
    
    if (contact) {
      preview.textContent = `✅ Recipient: ${contact.name}`;
      preview.classList.remove("hidden", "text-error");
      preview.classList.add("text-success");
    } else if (phone === "09876543210") {
      // Mock recipient lookup
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

    buttons.forEach(button => {
      button.addEventListener("click", () => {
        const amount = button.dataset.amount;
        amountInput.value = amount;
        
        // Highlight selected
        buttons.forEach(b => b.classList.remove("selected"));
        button.classList.add("selected");
        
        this.updateSummary();
      });
    });

    // Update summary on manual input
    amountInput.addEventListener("input", () => {
      buttons.forEach(b => b.classList.remove("selected"));
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
      document.getElementById("summary-amount").textContent = `$${amount.toFixed(2)}`;
      document.getElementById("summary-total").textContent = `$${amount.toFixed(2)}`;
    } else {
      summary.classList.add("hidden");
    }
  }

  setupSendButton() {
    const sendBtn = document.getElementById("send-money-btn");
    if (sendBtn) {
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleSendMoney();
      });
    }
  }

  async handleSendMoney() {
    if (this.isProcessing) return;

    const recipientNumber = getValue("recipient-number");
    const amount = getNumberValue("send-amount");
    const message = getValue("send-message");
    const pin = getValue("send-pin");

    // Validate recipient number
    const recipientValidation = validatePhone(recipientNumber);
    if (!recipientValidation.isValid) {
      displayError("Invalid recipient number: " + recipientValidation.error);
      document.getElementById("recipient-number").focus();
      document.getElementById("recipient-number").classList.add("input-error");
      setTimeout(() => document.getElementById("recipient-number").classList.remove("input-error"), 1000);
      return;
    }

    // Check if sending to self
    if (recipientNumber === this.user.phone) {
      displayError("Cannot send money to yourself");
      return;
    }

    // Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      displayError(amountValidation.error);
      document.getElementById("send-amount").focus();
      return;
    }

    // Validate balance
    const balanceValidation = validateBalance(amount, this.user.balance);
    if (!balanceValidation.isValid) {
      displayError(balanceValidation.error);
      return;
    }

    // Validate PIN
    const pinValidation = validatePin(pin);
    if (!pinValidation.isValid) {
      displayError(pinValidation.error);
      document.getElementById("send-pin").focus();
      document.getElementById("send-pin").classList.add("input-error");
      setTimeout(() => document.getElementById("send-pin").classList.remove("input-error"), 1000);
      return;
    }

    // Verify PIN
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
        amount
      );

      if (!result.success) {
        displayError(result.error);
        this.setProcessing(false);
        return;
      }

      // Update session data
      this.user.balance = result.data.newBalance;
      if (result.data.transaction) {
        if (!this.user.transactions) {
          this.user.transactions = [];
        }
        // Add description with message if provided
        if (message) {
          result.data.transaction.description += ` - "${message}"`;
        }
        this.user.transactions.unshift(result.data.transaction);
      }
      
      // Add bonus transaction if exists
      if (result.data.bonus) {
        this.user.transactions.unshift(result.data.bonus.bonusTransaction);
      }

      // Update recent contacts
      this.updateRecentContacts(recipientNumber, result.data.recipientName);
      
      SessionManager.setSession(sessionStorage.getItem("payoo_token"), this.user);

      // Update display
      updateBalanceDisplay(this.user.balance);

      // Show success message
      let successMsg = `✅ Successfully sent $${amount.toFixed(2)} to ${result.data.recipientName || recipientNumber}`;
      
      // Show bonus message if applicable
      if (result.data.bonus) {
        successMsg += `\n🎁 Bonus Earned: +$${result.data.bonus.bonusAmount}!`;
        
        setTimeout(() => {
          const bonusMsg = `🎁 Congratulations! You earned a $${result.data.bonus.bonusAmount} bonus for this transfer!`;
          displaySuccess(bonusMsg);
        }, 500);
      }
      
      displaySuccess(successMsg);

      // Clear form
      document.getElementById("recipient-number").value = "";
      document.getElementById("send-amount").value = "";
      document.getElementById("send-message").value = "";
      document.getElementById("send-pin").value = "";
      document.getElementById("send-pin").classList.remove("input-error");
      document.getElementById("transfer-summary").classList.add("hidden");
      document.getElementById("recipient-name-preview").classList.add("hidden");
      
      // Clear quick amount selection
      document.querySelectorAll(".quick-amount-btn").forEach(b => b.classList.remove("selected"));
      
      // Clear contact selection
      document.querySelectorAll(".contact-item").forEach(i => i.classList.remove("selected"));

      // Refresh displays
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
    // Find existing contact
    const existingIndex = this.recentContacts.findIndex(c => c.phone === phone);
    
    if (existingIndex >= 0) {
      // Update last used
      this.recentContacts[existingIndex].lastUsed = new Date().toISOString();
      if (name) this.recentContacts[existingIndex].name = name;
    } else {
      // Add new contact
      this.recentContacts.push({
        name: name || `User ${phone.slice(-4)}`,
        phone: phone,
        lastUsed: new Date().toISOString(),
      });
    }

    // Keep only last 10 contacts
    if (this.recentContacts.length > 10) {
      this.recentContacts = this.recentContacts.slice(-10);
    }

    localStorage.setItem("recent_contacts", JSON.stringify(this.recentContacts));
  }

  renderRecentTransfers() {
    const container = document.getElementById("recent-transfers");
    if (!container) return;

    // Filter transfer transactions
    const transfers = (this.user.transactions || []).filter(
      tx => tx.type === TRANSACTION_TYPES.TRANSFER
    );

    if (transfers.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-neutral/50">
          <p class="text-sm">No recent transfers</p>
        </div>
      `;
      return;
    }

    container.innerHTML = transfers.slice(0, 5).map(transfer => {
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
    }).join("");
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