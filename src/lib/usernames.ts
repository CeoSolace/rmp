// src/lib/usernames.ts

/**
 * Normalize username for storage, comparison, and queries
 * - trims whitespace
 * - removes leading @ symbols
 * - converts to lowercase
 */
export function normalizeUsername(username: string): string {
  return username
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

/**
 * Validates username format (after normalization)
 */
export function isValidUsername(username: string): boolean {
  const normalized = normalizeUsername(username);
  return /^[a-z0-9_]{3,20}$/.test(normalized);
}

/**
 * Returns human-readable validation error
 */
export function getUsernameError(username: string): string | null {
  const normalized = normalizeUsername(username);

  if (!normalized) return "Username is required.";
  if (normalized.length < 3) return "Username must be at least 3 characters.";
  if (normalized.length > 20) return "Username must be 20 characters or fewer.";
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return "Username can only contain letters, numbers, and underscores.";
  }

  return null;
}
