/**
 * Pads a 4-digit PIN to meet Supabase's 6-character minimum password requirement.
 * Users enter 4 digits, but we store it with a prefix/suffix.
 * 
 * @param pin - The 4-digit PIN entered by the user
 * @returns The padded PIN for Supabase auth
 */
export function padPin(pin: string): string {
  // Add prefix and suffix to make it 8 characters and more secure
  return `CF${pin}!!`;
}

/**
 * Validates that a PIN is exactly 4 digits
 * @param pin - The PIN to validate
 * @returns true if valid
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
