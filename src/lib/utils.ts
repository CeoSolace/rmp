export function generateParticipantKey(ids: string[]): string {
  return [...ids].sort().join(":");
}
