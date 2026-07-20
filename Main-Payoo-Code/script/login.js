/**
 * Login Page Controller
 * Senior Dev Note: Handles login flow with proper validation and error handling.
 * Uses the service layer for authentication.
 */

import { getValue, displayError, displaySuccess } from "./dom.js";
import { validatePhone, validatePin } from "./validation.js";
import { BankService, SessionManager } from "./bankservice.js";

export class LoginController {
  constructor() {
    this.form = document.getElementById("login-form");
    this.phoneInput = document.getElementById("input-number");
    this.pinInput = document.getElementById("input-pin");
    this.loginButton = document.getElementById("login-btn");
    this.isLoading = false;

    // Check if already logged in
    this.checkExistingSession();

    this.init();
  }

  init() {
    // Add event listeners
    this.loginButton.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Enter key support
    this.pinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleLogin();
      }
    });

    // Auto focus on phone input
    this.phoneInput.focus();

    const themeButton = document.getElementById("login-theme-toggle");
    if (themeButton) {
      const updateIcon = () => {
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        themeButton.querySelector("i").className = dark ? "fa-solid fa-moon" : "fa-regular fa-lightbulb";
      };
      updateIcon();
      themeButton.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("payoo_theme", next);
        updateIcon();
      });
    }
  }

  checkExistingSession() {
    if (SessionManager.isAuthenticated()) {
      // Redirect to home
      window.location.href = "home.html";
    }
  }

  async handleLogin() {
    // Prevent multiple submissions
    if (this.isLoading) return;

    // Get values
    const phone = getValue("input-number");
    const pin = getValue("input-pin");

    // Validate phone
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      displayError(phoneValidation.error);
      this.phoneInput.focus();
      this.phoneInput.classList.add("input-error");
      return;
    }
    this.phoneInput.classList.remove("input-error");

    // Validate PIN
    const pinValidation = validatePin(pin);
    if (!pinValidation.isValid) {
      displayError(pinValidation.error);
      this.pinInput.focus();
      this.pinInput.classList.add("input-error");
      return;
    }
    this.pinInput.classList.remove("input-error");

    // Show loading state
    this.setLoading(true);

    try {
      // Authenticate
      const result = await BankService.authenticate(phone, pin);

      if (!result.success) {
        displayError(result.error);
        this.setLoading(false);
        return;
      }

      // Save session
      SessionManager.setSession(result.token, result.data);

      // Show success message
      displaySuccess(`Welcome back!`);

      // Redirect to home
      setTimeout(() => {
        window.location.href = "home.html";
      }, 500);
    } catch (error) {
      console.error("Login error:", error);
      displayError("An unexpected error occurred. Please try again.");
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.loginButton.disabled = loading;
    this.loginButton.innerHTML = loading
      ? '<span class="loading loading-spinner loading-sm"></span> Logging in...'
      : "Login";
  }
}

// Initialize login controller when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new LoginController();
});
