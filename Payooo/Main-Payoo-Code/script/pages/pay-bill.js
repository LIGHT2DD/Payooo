/**
 * Pay Bill Page Controller
 * Senior Dev Note: Complete bill payment system with categories, saved bills, reminders, and history.
 */

import { getValue, getNumberValue, displayError, displaySuccess, updateBalanceDisplay } from "../dom.js";
import { validatePin, validateAmount, validateBalance } from "../validation.js";
import { BankService, SessionManager, TRANSACTION_TYPES } from "../bankservice.js";

class PayBillController {
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
    
    // State
    this.selectedCategory = null;
    this.savedBills = JSON.parse(localStorage.getItem("saved_bills") || "[]");
    this.reminders = JSON.parse(localStorage.getItem("bill_reminders") || "[]");

    // Category data
    this.categories = {
      electricity: { name: "Electricity", icon: "⚡", label: "⚡ Electricity", providerLabel: "Consumer Number" },
      gas: { name: "Gas", icon: "🔥", label: "🔥 Gas", providerLabel: "Consumer Number" },
      water: { name: "Water", icon: "💧", label: "💧 Water", providerLabel: "Account Number" },
      internet: { name: "Internet", icon: "🌐", label: "🌐 Internet", providerLabel: "Account Number" },
      mobile: { name: "Mobile", icon: "📱", label: "📱 Mobile Recharge", providerLabel: "Phone Number" },
      tv: { name: "Cable TV", icon: "📺", label: "📺 Cable TV", providerLabel: "Subscriber ID" },
    };

    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);

    this.setupCategorySelection();
    this.setupQuickAmounts();
    this.setupPayButton();
    this.renderSavedBills();
    this.renderReminders();
    this.renderRecentBills();

    // Enter key support
    const pinInput = document.getElementById("bill-pin");
    if (pinInput) {
      pinInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handlePayBill();
        }
      });
    }
  }

  setupCategorySelection() {
    const categories = document.querySelectorAll(".bill-category");
    const paymentForm = document.getElementById("payment-form");
    const formTitle = document.getElementById("form-title");
    const accountLabel = document.getElementById("account-label");

    categories.forEach(category => {
      category.addEventListener("click", () => {
        // Remove selected from all
        categories.forEach(c => c.classList.remove("selected"));
        
        // Add selected to clicked
        category.classList.add("selected");
        
        // Get category
        this.selectedCategory = category.dataset.category;
        const catData = this.categories[this.selectedCategory];
        
        // Update form
        paymentForm.classList.remove("hidden");
        paymentForm.classList.add("animate-fade-in");
        formTitle.textContent = `Pay ${catData.name} Bill`;
        accountLabel.textContent = catData.providerLabel;
        
        // Update placeholder
        const accountInput = document.getElementById("bill-account");
        accountInput.placeholder = `Enter ${catData.providerLabel.toLowerCase()}`;
        
        // Check for saved bill
        const savedBill = this.savedBills.find(b => b.category === this.selectedCategory);
        if (savedBill) {
          accountInput.value = savedBill.accountNumber;
        }

        // Reset animations
        setTimeout(() => {
          paymentForm.classList.remove("animate-fade-in");
        }, 300);

        // Scroll to form
        paymentForm.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  setupQuickAmounts() {
    const buttons = document.querySelectorAll(".quick-amount-btn");
    const amountInput = document.getElementById("bill-amount");

    buttons.forEach(button => {
      button.addEventListener("click", () => {
        const amount = button.dataset.amount;
        amountInput.value = amount;
        
        buttons.forEach(b => b.classList.remove("selected"));
        button.classList.add("selected");
        
        amountInput.focus();
      });
    });

    amountInput.addEventListener("input", () => {
      buttons.forEach(b => b.classList.remove("selected"));
    });
  }

  setupPayButton() {
    const payBtn = document.getElementById("pay-bill-btn");
    if (payBtn) {
      payBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handlePayBill();
      });
    }
  }

  async handlePayBill() {
    if (this.isProcessing) return;

    // Check if category selected
    if (!this.selectedCategory) {
      displayError("Please select a bill category first");
      return;
    }

    const accountNumber = getValue("bill-account");
    const amount = getNumberValue("bill-amount");
    const pin = getValue("bill-pin");
    const dueDate = getValue("bill-due-date");
    const saveBill = document.getElementById("save-bill")?.checked || false;
    const setReminder = document.getElementById("set-reminder")?.checked || false;

    // Validate account number
    if (!accountNumber || accountNumber.length < 3) {
      displayError("Please enter a valid account number");
      const accountInput = document.getElementById("bill-account");
      accountInput.focus();
      accountInput.classList.add("input-error");
      setTimeout(() => accountInput.classList.remove("input-error"), 1000);
      return;
    }

    // Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      displayError(amountValidation.error);
      document.getElementById("bill-amount").focus();
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
      document.getElementById("bill-pin").focus();
      document.getElementById("bill-pin").classList.add("input-error");
      setTimeout(() => document.getElementById("bill-pin").classList.remove("input-error"), 1000);
      return;
    }

    // Verify PIN
    if (pin !== this.userPin) {
      displayError("Invalid PIN. Please check your 4-digit PIN.");
      const pinInput = document.getElementById("bill-pin");
      pinInput.value = "";
      pinInput.focus();
      pinInput.classList.add("input-error");
      setTimeout(() => pinInput.classList.remove("input-error"), 1000);
      return;
    }

    // Save bill if checked
    if (saveBill) {
      this.saveBillForLater(this.selectedCategory, accountNumber);
    }

    // Set reminder if checked
    if (setReminder && dueDate) {
      this.setBillReminder(this.selectedCategory, accountNumber, amount, dueDate);
    }

    this.setProcessing(true);

    try {
      const result = await BankService.payBill(
        this.userId,
        this.selectedCategory,
        accountNumber,
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
        this.user.transactions.unshift(result.data.transaction);
      }
      SessionManager.setSession(sessionStorage.getItem("payoo_token"), this.user);

      // Update display
      updateBalanceDisplay(this.user.balance);

      // Show success message
      const categoryLabel = this.categories[this.selectedCategory].label;
      displaySuccess(`✅ ${categoryLabel} bill paid: $${amount.toFixed(2)}`);

      // Clear form
      document.getElementById("bill-account").value = "";
      document.getElementById("bill-amount").value = "";
      document.getElementById("bill-pin").value = "";
      document.getElementById("bill-due-date").value = "";
      document.getElementById("bill-pin").classList.remove("input-error");
      document.getElementById("save-bill").checked = false;
      document.getElementById("set-reminder").checked = false;

      // Clear quick amount selection
      document.querySelectorAll(".quick-amount-btn").forEach(b => b.classList.remove("selected"));

      // Hide form
      document.getElementById("payment-form").classList.add("hidden");
      
      // Deselect category
      document.querySelectorAll(".bill-category").forEach(c => c.classList.remove("selected"));
      this.selectedCategory = null;

      // Refresh displays
      this.renderSavedBills();
      this.renderReminders();
      this.renderRecentBills();

    } catch (error) {
      console.error("Pay bill error:", error);
      displayError("Payment failed. Please try again.");
    } finally {
      this.setProcessing(false);
    }
  }

  saveBillForLater(category, accountNumber) {
    const existingIndex = this.savedBills.findIndex(
      b => b.category === category && b.accountNumber === accountNumber
    );

    if (existingIndex >= 0) {
      this.savedBills[existingIndex].lastUsed = new Date().toISOString();
    } else {
      this.savedBills.unshift({
        id: Date.now(),
        category: category,
        categoryName: this.categories[category].name,
        categoryIcon: this.categories[category].icon,
        accountNumber: accountNumber,
        savedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      });
    }

    // Keep only last 10 saved bills
    if (this.savedBills.length > 10) {
      this.savedBills = this.savedBills.slice(0, 10);
    }

    localStorage.setItem("saved_bills", JSON.stringify(this.savedBills));
  }

  setBillReminder(category, accountNumber, amount, dueDate) {
    this.reminders.unshift({
      id: Date.now(),
      category: category,
      categoryName: this.categories[category].name,
      categoryIcon: this.categories[category].icon,
      accountNumber: accountNumber,
      amount: amount,
      dueDate: dueDate,
      createdAt: new Date().toISOString(),
      paid: false,
    });

    localStorage.setItem("bill_reminders", JSON.stringify(this.reminders));
  }

  deleteSavedBill(billId) {
    this.savedBills = this.savedBills.filter(b => b.id !== billId);
    localStorage.setItem("saved_bills", JSON.stringify(this.savedBills));
    this.renderSavedBills();
    displaySuccess("Saved bill removed");
  }

  deleteReminder(reminderId) {
    this.reminders = this.reminders.filter(r => r.id !== reminderId);
    localStorage.setItem("bill_reminders", JSON.stringify(this.reminders));
    this.renderReminders();
    displaySuccess("Reminder removed");
  }

  useSavedBill(bill) {
    this.selectedCategory = bill.category;
    
    // Update category selection
    document.querySelectorAll(".bill-category").forEach(c => {
      c.classList.remove("selected");
      if (c.dataset.category === bill.category) {
        c.classList.add("selected");
      }
    });

    // Show and fill form
    const paymentForm = document.getElementById("payment-form");
    const formTitle = document.getElementById("form-title");
    const accountLabel = document.getElementById("account-label");
    
    paymentForm.classList.remove("hidden");
    paymentForm.classList.add("animate-fade-in");
    formTitle.textContent = `Pay ${bill.categoryName} Bill`;
    accountLabel.textContent = this.categories[bill.category].providerLabel;
    document.getElementById("bill-account").value = bill.accountNumber;
    
    setTimeout(() => {
      paymentForm.classList.remove("animate-fade-in");
    }, 300);
    
    paymentForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  useReminder(reminder) {
    this.selectedCategory = reminder.category;
    
    document.querySelectorAll(".bill-category").forEach(c => {
      c.classList.remove("selected");
      if (c.dataset.category === reminder.category) {
        c.classList.add("selected");
      }
    });

    const paymentForm = document.getElementById("payment-form");
    const formTitle = document.getElementById("form-title");
    const accountLabel = document.getElementById("account-label");
    
    paymentForm.classList.remove("hidden");
    paymentForm.classList.add("animate-fade-in");
    formTitle.textContent = `Pay ${reminder.categoryName} Bill`;
    accountLabel.textContent = this.categories[reminder.category].providerLabel;
    document.getElementById("bill-account").value = reminder.accountNumber;
    document.getElementById("bill-amount").value = reminder.amount;
    document.getElementById("bill-due-date").value = reminder.dueDate;
    
    setTimeout(() => {
      paymentForm.classList.remove("animate-fade-in");
    }, 300);
    
    paymentForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  renderSavedBills() {
    const container = document.getElementById("saved-bills-list");
    const countBadge = document.getElementById("saved-count");
    if (!container) return;

    if (countBadge) {
      countBadge.textContent = this.savedBills.length;
    }

    if (this.savedBills.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-neutral/50">
          <i class="fa-solid fa-inbox text-2xl mb-2 block"></i>
          <p class="text-sm">No saved bills</p>
          <p class="text-xs mt-1">Check "Save this bill" when paying</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.savedBills.map(bill => `
      <div class="saved-bill flex items-center justify-between p-3 bg-base-200 rounded-xl group">
        <div class="flex items-center gap-3 flex-1 cursor-pointer" data-bill-id="${bill.id}">
          <div class="w-10 h-10 rounded-full bg-base-100 flex items-center justify-center text-xl shadow-sm">
            ${bill.categoryIcon}
          </div>
          <div>
            <p class="font-medium text-sm">${bill.categoryName}</p>
            <p class="text-xs text-neutral/40">${bill.accountNumber}</p>
            <p class="text-[10px] text-neutral/30">
              Last used: ${new Date(bill.lastUsed).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="use-bill-btn btn btn-ghost btn-xs" data-bill-id="${bill.id}" title="Pay this bill">
            <i class="fa-solid fa-play"></i>
          </button>
          <button class="delete-bill-btn btn btn-ghost btn-xs text-error" data-bill-id="${bill.id}" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join("");

    // Add event listeners
    container.querySelectorAll(".saved-bill > div:first-child").forEach(div => {
      div.addEventListener("click", () => {
        const billId = parseInt(div.dataset.billId);
        const bill = this.savedBills.find(b => b.id === billId);
        if (bill) this.useSavedBill(bill);
      });
    });

    container.querySelectorAll(".use-bill-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const billId = parseInt(btn.dataset.billId);
        const bill = this.savedBills.find(b => b.id === billId);
        if (bill) this.useSavedBill(bill);
      });
    });

    container.querySelectorAll(".delete-bill-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const billId = parseInt(btn.dataset.billId);
        if (confirm("Delete this saved bill?")) {
          this.deleteSavedBill(billId);
        }
      });
    });
  }

  renderReminders() {
    const section = document.getElementById("reminders-section");
    const container = document.getElementById("reminders-list");
    if (!section || !container) return;

    // Filter unpaid reminders
    const unpaidReminders = this.reminders.filter(r => !r.paid);

    if (unpaidReminders.length === 0) {
      section.classList.add("hidden");
      return;
    }

    section.classList.remove("hidden");

    container.innerHTML = unpaidReminders.map(reminder => {
      const dueDate = new Date(reminder.dueDate);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      let urgencyClass = "text-success";
      let urgencyBg = "bg-success/5";
      if (daysUntilDue <= 3) {
        urgencyClass = "text-error";
        urgencyBg = "bg-error/5";
      } else if (daysUntilDue <= 7) {
        urgencyClass = "text-warning";
        urgencyBg = "bg-warning/5";
      }

      return `
        <div class="flex items-center justify-between p-3 ${urgencyBg} rounded-xl">
          <div class="flex items-center gap-3 flex-1">
            <div class="w-10 h-10 rounded-full bg-base-100 flex items-center justify-center text-xl">
              ${reminder.categoryIcon}
            </div>
            <div>
              <p class="font-medium text-sm">${reminder.categoryName} Bill</p>
              <p class="text-xs text-neutral/50">$${reminder.amount} • Due: ${dueDate.toLocaleDateString()}</p>
              <p class="text-xs ${urgencyClass} font-medium">
                ${daysUntilDue <= 0 ? '⚠️ Overdue!' : `${daysUntilDue} days remaining`}
              </p>
            </div>
          </div>
          <div class="flex gap-1">
            <button class="pay-reminder-btn btn btn-xs btn-primary" data-reminder-id="${reminder.id}">
              Pay Now
            </button>
            <button class="delete-reminder-btn btn btn-ghost btn-xs text-error" data-reminder-id="${reminder.id}">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    // Add event listeners
    container.querySelectorAll(".pay-reminder-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const reminderId = parseInt(btn.dataset.reminderId);
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (reminder) this.useReminder(reminder);
      });
    });

    container.querySelectorAll(".delete-reminder-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const reminderId = parseInt(btn.dataset.reminderId);
        this.deleteReminder(reminderId);
      });
    });
  }

  renderRecentBills() {
    const container = document.getElementById("recent-bills");
    if (!container) return;

    const billPayments = (this.user.transactions || []).filter(
      tx => tx.type === TRANSACTION_TYPES.PAYMENT
    );

    if (billPayments.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-neutral/50">
          <p class="text-sm">No recent bill payments</p>
        </div>
      `;
      return;
    }

    container.innerHTML = billPayments.slice(0, 5).map(payment => {
      const date = new Date(payment.date);
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
              <i class="fa-solid fa-receipt text-error"></i>
            </div>
            <div>
              <p class="text-sm font-medium">${this.escapeHtml(payment.description)}</p>
              <p class="text-xs text-neutral/40">${formattedDate} • ${formattedTime}</p>
            </div>
          </div>
          <span class="text-error font-bold">-$${payment.amount.toFixed(2)}</span>
        </div>
      `;
    }).join("");
  }

  setProcessing(processing) {
    this.isProcessing = processing;
    const button = document.getElementById("pay-bill-btn");
    if (button) {
      button.disabled = processing;
      button.innerHTML = processing
        ? '<span class="loading loading-spinner loading-sm"></span> Processing...'
        : '<i class="fa-solid fa-check"></i> Pay Bill';
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PayBillController();
});