// General-purpose utilities used throughout the project.

/**
 * Generate a deterministic participant key for a direct message conversation.
 * Sorting the participant IDs and joining them with a colon prevents
 * duplicate DM threads between the same two users.
 */
export function generateParticipantKey(ids: string[]): string {
  return [...ids].sort().join(':');
}