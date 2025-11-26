/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate required field
 */
export function validateRequired(
  value: string | number | null | undefined,
  fieldName: string
): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one number",
    };
  }

  return { isValid: true };
}

/**
 * Validate amount (positive number)
 */
export function validateAmount(amount: string | number): ValidationResult {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return { isValid: false, error: "Please enter a valid amount" };
  }

  if (numAmount <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }

  return { isValid: true };
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(dateString: string): ValidationResult {
  if (!dateString) {
    return { isValid: false, error: "Date is required" };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return { isValid: false, error: "Please enter a valid date (YYYY-MM-DD)" };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: "Please enter a valid date" };
  }

  return { isValid: true };
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, error: "Phone number is required" };
  }

  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { isValid: false, error: "Please enter a valid phone number" };
  }

  return { isValid: true };
}

/**
 * Validate minimum length
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string
): ValidationResult {
  if (!value || value.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }
  return { isValid: true };
}

/**
 * Validate maximum length
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string
): ValidationResult {
  if (value && value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }
  return { isValid: true };
}

/**
 * Transaction form validation
 */
export interface TransactionFormData {
  date: string;
  description: string;
  category: string;
  amount: string;
  type: "income" | "expense" | "";
  account: string;
}

export function validateTransactionForm(
  data: TransactionFormData
): Record<string, string> {
  const errors: Record<string, string> = {};

  const dateResult = validateDate(data.date);
  if (!dateResult.isValid) {
    errors.date = dateResult.error!;
  }

  const descResult = validateRequired(data.description, "Description");
  if (!descResult.isValid) {
    errors.description = descResult.error!;
  }

  const categoryResult = validateRequired(data.category, "Category");
  if (!categoryResult.isValid) {
    errors.category = categoryResult.error!;
  }

  const amountResult = validateAmount(data.amount);
  if (!amountResult.isValid) {
    errors.amount = amountResult.error!;
  }

  const typeResult = validateRequired(data.type, "Transaction type");
  if (!typeResult.isValid) {
    errors.type = typeResult.error!;
  }

  const accountResult = validateRequired(data.account, "Account");
  if (!accountResult.isValid) {
    errors.account = accountResult.error!;
  }

  return errors;
}

/**
 * Balance entry form validation
 */
export interface BalanceFormData {
  date: string;
  amount: string;
  account: string;
  notes?: string;
}

export function validateBalanceForm(
  data: BalanceFormData
): Record<string, string> {
  const errors: Record<string, string> = {};

  const dateResult = validateDate(data.date);
  if (!dateResult.isValid) {
    errors.date = dateResult.error!;
  }

  const amountResult = validateAmount(data.amount);
  if (!amountResult.isValid) {
    errors.amount = amountResult.error!;
  }

  const accountResult = validateRequired(data.account, "Account");
  if (!accountResult.isValid) {
    errors.account = accountResult.error!;
  }

  return errors;
}
