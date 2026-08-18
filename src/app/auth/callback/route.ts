import { epostaBaglantisiniIsle } from '@/lib/auth/epostaBaglantisi'

/**
 * Eski bağlantıların girdiği kapı — davranışı /auth/confirm ile aynıdır.
 * Daha önce gönderilmiş maillerdeki bağlantılar bu yola işaret ettiği için
 * korunuyor.
 */
export async function GET(request: Request) {
  return epostaBaglantisiniIsle(request)
}
