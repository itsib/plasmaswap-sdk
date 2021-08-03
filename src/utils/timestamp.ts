/**
 * Returns current unix timestamp (The number of seconds since midnight (00:00:00 UTC) on January 1, 1970)
 */
export function timestamp(): number {
  return Math.round(Date.now() / 1000);
}
