/**
 * DOM Utility Functions
 * Senior Dev Note: These are pure functions with no side effects.
 * They only interact with the DOM - no business logic here.
 */

export function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with id "${id}" not found`);
    return null;
  }
  return element;
}

export function getValue(id) {
  const element = getElement(id);
  return element ? element.value.trim() : '';
}

export function getNumberValue(id) {
  const value = getValue(id);
  const number = parseFloat(value);
  return isNaN(number) ? 0 : number;
}

export function setText(id, text) {
  const element = getElement(id);
  if (element) element.textContent = text;
}

export function setValue(id, value) {
  const element = getElement(id);
  if (element) element.value = value;
}

export function getInnerText(id) {
  const element = getElement(id);
  return element ? element.textContent.trim() : '';
}

export function getNumberFromText(id) {
  const text = getInnerText(id);
  const number = parseFloat(text.replace(/[^0-9.]/g, ''));
  return isNaN(number) ? 0 : number;
}

export function showElement(id) {
  const element = getElement(id);
  if (element) element.classList.remove('hidden');
}

export function hideElement(id) {
  const element = getElement(id);
  if (element) element.classList.add('hidden');
}

export function toggleVisibility(id) {
  const element = getElement(id);
  if (element) element.classList.toggle('hidden');
}

export function showOnly(idsToShow) {
  // Hide all sections first
  const sections = ['add-money', 'cashout', 'send-money', 'get-bonus', 'pay-bill', 'transactions'];
  sections.forEach(id => hideElement(id));
  
  // Show only the specified sections
  idsToShow.forEach(id => showElement(id));
}

export function updateBalanceDisplay(balance) {
  setText('balance', balance.toFixed(2));
}

export function displayError(message) {
  // Create a toast notification
  const toastContainer = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = 'alert alert-error shadow-lg animate-fade-in';
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="btn btn-sm btn-ghost">✕</button>
  `;
  toastContainer.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 5000);
}

export function displaySuccess(message) {
  const toastContainer = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = 'alert alert-success shadow-lg animate-fade-in';
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="btn btn-sm btn-ghost">✕</button>
  `;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 5000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed top-4 right-4 z-50 max-w-sm w-full space-y-2';
  document.body.appendChild(container);
  return container;
}