/**
 * Bank Service - Complete Implementation
 * Senior Dev Note: This simulates an API service layer with full CRUD operations.
 * All methods are async to simulate real API calls.
 * In production, replace these with actual fetch calls.
 */

// Mock data - would come from a real database
const MOCK_USERS = {
  "01234567890": {
    id: "user_1",
    name: "Demo User",
    phone: "01234567890",
    pin: "1234",
    balance: 45000,
    lastBonusDate: "",
    transactions: [],
  },
  "09876543210": {
    id: "user_2",
    name: "Jane Smith",
    phone: "09876543210",
    pin: "5678",
    balance: 23000,
    lastBonusDate: "",
    transactions: [],
  },
};

// Transaction types
export const TRANSACTION_TYPES = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  TRANSFER: "transfer",
  BONUS: "bonus",
  PAYMENT: "payment",
};

// Mock API - simulates async database calls
export class BankService {
  // ==================== AUTHENTICATION ====================

  static async authenticate(phone, pin) {
    // Simulate network delay
    await this.delay(500);

    const user = MOCK_USERS[phone];
    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.pin !== pin) {
      return { success: false, error: "Invalid PIN" };
    }

    // Return user data without exposing the PIN for security
    // But keep it for demo convenience
    const userData = {
      ...user,
      // Keep PIN for demo (in production, remove this)
    };

    return {
      success: true,
      data: userData,
      token: this.generateToken(user.id),
    };
  }

  // ==================== USER MANAGEMENT ====================

  static async getUser(userId) {
    await this.delay(200);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Don't expose PIN
    const { pin, ...userData } = user;
    return { success: true, data: userData };
  }

  static async getBalance(userId) {
    await this.delay(300);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, data: user.balance };
  }

  // ==================== TRANSACTION OPERATIONS ====================

  static async addMoney(userId, amount, bank, accountNumber) {
    await this.delay(800);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    // Update balance
    user.balance += amount;

    // Add transaction record
    const transaction = {
      id: `t${Date.now()}`,
      type: TRANSACTION_TYPES.DEPOSIT,
      amount: amount,
      date: new Date().toISOString(),
      description: `Deposit from ${bank} (${accountNumber})`,
    };

    user.transactions.push(transaction);

    return {
      success: true,
      data: {
        newBalance: user.balance,
        transaction: transaction,
        allTransactions: user.transactions,
      },
    };
  }

  static async cashout(userId, agentNumber, amount) {
    await this.delay(800);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    if (amount > user.balance) {
      return { success: false, error: "Insufficient balance" };
    }

    // Update balance
    user.balance -= amount;

    // Add transaction record
    const transaction = {
      id: `t${Date.now()}`,
      type: TRANSACTION_TYPES.WITHDRAWAL,
      amount: amount,
      date: new Date().toISOString(),
      description: `Cashout to agent ${agentNumber}`,
    };

    user.transactions.push(transaction);

    return {
      success: true,
      data: {
        newBalance: user.balance,
        transaction: transaction,
        allTransactions: user.transactions,
      },
    };
  }

  static async sendMoney(userId, recipientPhone, amount) {
    await this.delay(700);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Find recipient
    const recipient = MOCK_USERS[recipientPhone];
    if (!recipient) {
      return { success: false, error: "Recipient not found" };
    }

    if (recipient.id === userId) {
      return { success: false, error: "Cannot send money to yourself" };
    }

    if (amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    if (amount > user.balance) {
      return { success: false, error: "Insufficient balance" };
    }

    // Deduct from sender
    user.balance -= amount;

    // Add to recipient
    recipient.balance += amount;

    // Add transaction to sender
    const senderTransaction = {
      id: `t${Date.now()}`,
      type: TRANSACTION_TYPES.TRANSFER,
      amount: amount,
      date: new Date().toISOString(),
      description: `Sent $${amount.toFixed(2)} to ${recipient.name} (${recipientPhone})`,
    };
    user.transactions.push(senderTransaction);

    // Add transaction to recipient
    const recipientTransaction = {
      id: `t${Date.now() + 1}`,
      type: TRANSACTION_TYPES.DEPOSIT,
      amount: amount,
      date: new Date().toISOString(),
      description: `Received $${amount.toFixed(2)} from ${user.name} (${user.phone})`,
    };
    recipient.transactions.push(recipientTransaction);

    return {
      success: true,
      data: {
        newBalance: user.balance,
        recipientName: recipient.name,
        transaction: senderTransaction,
        allTransactions: user.transactions,
      },
    };
  }

  static async claimBonus(userId) {
    await this.delay(600);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check if bonus already claimed today
    const today = new Date().toDateString();
    const lastBonus = user.lastBonusDate || "";

    if (lastBonus === today) {
      return { success: false, error: "Daily bonus already claimed today" };
    }

    const bonusAmount = 5.0;

    // Add bonus
    user.balance += bonusAmount;
    user.lastBonusDate = today;

    // Add transaction
    const transaction = {
      id: `t${Date.now()}`,
      type: TRANSACTION_TYPES.BONUS,
      amount: bonusAmount,
      date: new Date().toISOString(),
      description: "Daily bonus claimed 🎁",
    };
    user.transactions.push(transaction);

    return {
      success: true,
      data: {
        newBalance: user.balance,
        bonusAmount: bonusAmount,
        transaction: transaction,
        allTransactions: user.transactions,
      },
    };
  }

  static async payBill(userId, category, accountNumber, amount) {
    await this.delay(800);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    if (amount > user.balance) {
      return { success: false, error: "Insufficient balance" };
    }

    // Deduct from user
    user.balance -= amount;

    const categoryLabels = {
      electricity: "⚡ Electricity",
      gas: "🔥 Gas",
      water: "💧 Water",
      internet: "🌐 Internet",
      mobile: "📱 Mobile Recharge",
    };

    // Add transaction
    const transaction = {
      id: `t${Date.now()}`,
      type: TRANSACTION_TYPES.PAYMENT,
      amount: amount,
      date: new Date().toISOString(),
      description: `Paid ${categoryLabels[category] || category} bill (${accountNumber})`,
    };
    user.transactions.push(transaction);

    return {
      success: true,
      data: {
        newBalance: user.balance,
        category: categoryLabels[category] || category,
        transaction: transaction,
        allTransactions: user.transactions,
      },
    };
  }

  // ==================== TRANSACTION MANAGEMENT ====================

  // Delete a single transaction by ID
  static async deleteTransaction(userId, transactionId) {
    await this.delay(300);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Find the transaction
    const transactionIndex = user.transactions.findIndex(
      (tx) => tx.id === transactionId,
    );
    if (transactionIndex === -1) {
      return { success: false, error: "Transaction not found" };
    }

    // Remove the transaction
    const removedTransaction = user.transactions.splice(transactionIndex, 1)[0];

    return {
      success: true,
      data: {
        removedTransaction: removedTransaction,
        allTransactions: user.transactions,
        remainingCount: user.transactions.length,
      },
    };
  }

  // Clear all transaction history
  static async clearAllTransactions(userId) {
    await this.delay(400);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const deletedCount = user.transactions.length;
    user.transactions = [];

    return {
      success: true,
      data: {
        deletedCount: deletedCount,
        allTransactions: user.transactions,
      },
    };
  }

  // Get transactions with filters (bonus feature)
  static async getFilteredTransactions(userId, filterType = "all") {
    await this.delay(200);

    const user = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    let transactions = [...user.transactions];

    // Apply filters
    if (filterType === "deposits") {
      transactions = transactions.filter(
        (tx) =>
          tx.type === TRANSACTION_TYPES.DEPOSIT ||
          tx.type === TRANSACTION_TYPES.BONUS,
      );
    } else if (filterType === "withdrawals") {
      transactions = transactions.filter(
        (tx) =>
          tx.type === TRANSACTION_TYPES.WITHDRAWAL ||
          tx.type === TRANSACTION_TYPES.TRANSFER ||
          tx.type === TRANSACTION_TYPES.PAYMENT,
      );
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      success: true,
      data: {
        transactions: transactions,
        totalCount: user.transactions.length,
        filteredCount: transactions.length,
      },
    };
  }

  // ==================== HELPER METHODS ====================

  static async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static generateToken(userId) {
    // In production, this would be a JWT
    return btoa(`${userId}:${Date.now()}`);
  }

  static verifyToken(token) {
    try {
      const decoded = atob(token);
      const [userId] = decoded.split(":");
      return userId;
    } catch {
      return null;
    }
  }

  // Get all users (for debugging)
  static getAllUsers() {
    return { ...MOCK_USERS };
  }

  // Reset user data (for testing)
  static resetUserData(phone) {
    if (MOCK_USERS[phone]) {
      const user = MOCK_USERS[phone];
      user.balance = 45000;
      user.transactions = [];
      user.lastBonusDate = "";
      return { success: true };
    }
    return { success: false, error: "User not found" };
  }
}

// ==================== SESSION MANAGEMENT ====================

export class SessionManager {
  static TOKEN_KEY = "payoo_token";
  static USER_KEY = "payoo_user";

  static setSession(token, user) {
    sessionStorage.setItem(this.TOKEN_KEY, token);
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static getSession() {
    const token = sessionStorage.getItem(this.TOKEN_KEY);
    const userData = sessionStorage.getItem(this.USER_KEY);
    if (!token || !userData) return null;

    try {
      const user = JSON.parse(userData);
      const userId = BankService.verifyToken(token);
      if (userId !== user.id) return null;

      return { token, user };
    } catch {
      return null;
    }
  }

  static clearSession() {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  }

  static isAuthenticated() {
    return this.getSession() !== null;
  }

  // Update user data in session
  static updateUser(userData) {
    const session = this.getSession();
    if (session) {
      this.setSession(session.token, userData);
      return true;
    }
    return false;
  }

  // Get current user
  static getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  }
}

// ==================== TEST HELPERS ====================

// For testing purposes - add this to window for console debugging
if (typeof window !== "undefined") {
  window.__bankService = {
    BankService,
    SessionManager,
    MOCK_USERS,
    TRANSACTION_TYPES,
  };
}

export default BankService;
