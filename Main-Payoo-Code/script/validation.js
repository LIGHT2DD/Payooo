/**
 * Validation Utilities
 * Senior Dev Note: Centralized validation logic with clear error messages.
 * All validation returns { isValid: boolean, error?: string }
 */

export const VALIDATION = {
  PHONE_LENGTH: 11,
  PIN_LENGTH: 4,
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 1000000,
};

export function validatePhone(number) {
  const cleanNumber = number.replace(/\D/g, '');
  
  if (!cleanNumber) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  if (cleanNumber.length !== VALIDATION.PHONE_LENGTH) {
    return { 
      isValid: false, 
      error: `Phone number must be exactly ${VALIDATION.PHONE_LENGTH} digits` 
    };
  }
  
  // Check if it starts with a valid prefix (Bangladesh)
  if (!/^(01|8801|1)/.test(cleanNumber)) {
    return { isValid: false, error: 'Invalid phone number format' };
  }
  
  return { isValid: true };
}

export function validatePin(pin) {
  const cleanPin = pin.replace(/\D/g, '');
  
  if (!cleanPin) {
    return { isValid: false, error: 'PIN is required' };
  }
  
  if (cleanPin.length !== VALIDATION.PIN_LENGTH) {
    return { 
      isValid: false, 
      error: `PIN must be exactly ${VALIDATION.PIN_LENGTH} digits` 
    };
  }
  
  if (!/^\d{4}$/.test(cleanPin)) {
    return { isValid: false, error: 'PIN must contain only numbers' };
  }
  
  return { isValid: true };
}

export function validateAmount(amount, maxAmount = VALIDATION.MAX_AMOUNT) {
  if (amount === undefined || amount === null) {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { isValid: false, error: 'Amount must be a positive number' };
  }
  
  if (numAmount < VALIDATION.MIN_AMOUNT) {
    return { 
      isValid: false, 
      error: `Minimum amount is $${VALIDATION.MIN_AMOUNT}` 
    };
  }
  
  if (numAmount > maxAmount) {
    return { 
      isValid: false, 
      error: `Maximum amount is $${maxAmount.toLocaleString()}` 
    };
  }
  
  // Check for decimal places - max 2
  if (amount.toString().includes('.') && amount.toString().split('.')[1].length > 2) {
    return { isValid: false, error: 'Amount can have at most 2 decimal places' };
  }
  
  return { isValid: true };
}

export function validateBankSelection(bank) {
  if (!bank || bank === 'Select a Bank' || bank === 'select-a-bank') {
    return { isValid: false, error: 'Please select a bank' };
  }
  return { isValid: true };
}

export function validateBalance(amount, currentBalance) {
  if (amount > currentBalance) {
    return { 
      isValid: false, 
      error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}` 
    };
  }
  return { isValid: true };
}