import { cookies } from 'next/headers'

/**
 * Cookie-based admin session (same as /admin middleware).
 * Fails closed: missing/empty ADMIN_SECRET_TOKEN or admin_token → false (no bypass).
 */
export async function isAdminRequest(): Promise<boolean> {
  const store = await cookies()
  const token = store.get('admin_token')?.value?.trim()
  const secret = process.env.ADMIN_SECRET_TOKEN?.trim()
  if (!secret || !token) return false
  return token === secret
}
