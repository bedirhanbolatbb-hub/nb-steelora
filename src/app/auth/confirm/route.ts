import { epostaBaglantisiniIsle } from '@/lib/auth/epostaBaglantisi'

/**
 * E-posta bağlantılarının hedefi (Supabase şablonlarında bu uç kullanılır).
 * token_hash biçimini bekler; cihaz/tarayıcı bağımsız çalışır.
 */
export async function GET(request: Request) {
  return epostaBaglantisiniIsle(request)
}
