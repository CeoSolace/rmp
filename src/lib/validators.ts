import { normalizeUsername } from "./usernames";

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

export function validateUsername(username: string): boolean {
  const normalized = normalizeUsername(username);
  return /^[a-zA-Z0-9._]{3,20}$/.test(normalized);
}

export { normalizeUsername };
