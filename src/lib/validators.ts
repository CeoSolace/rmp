// A small collection of validation helpers used throughout the app. No
// external dependencies are used here so that these functions work
// seamlessly in both the browser and server environments. Each helper
// returns a boolean or throws an Error with a descriptive message.

export function validateEmail(email: string): boolean {
  const re = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return re.test(email.toLowerCase());
}

export function validatePassword(password: string): boolean {
  // Basic password strength: at least 6 characters. Adjust as needed.
  return password.length >= 6;
}

export function validateUsername(username: string): boolean {
  // Allow letters, numbers, underscores and periods. 3–20 characters.
  const re = /^[a-zA-Z0-9._]{3,20}$/;
  return re.test(username);
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}