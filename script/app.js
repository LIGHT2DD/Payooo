/**
 * Main Application Entry Point
 * Senior Dev Note: This file can be used for app-wide initialization.
 * Currently, we're using page-specific controllers.
 */

console.log('🚀 Payoo Application Starting...');

// Add a global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Could send to a monitoring service
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});