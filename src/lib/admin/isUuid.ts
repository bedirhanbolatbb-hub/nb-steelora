/** Minimal UUID shape check for route params (avoids junk IDs hitting DB). */
export function isLikelyUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const s = value.trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}
