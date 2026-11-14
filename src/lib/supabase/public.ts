import { createClient } from '@supabase/supabase-js'

/**
 * Herkese açık okumalar için çerezsiz istemci (14 Kas 2026).
 *
 * Vitrin sayfaları (ana sayfa, ürün, blog) artık önbellekten veriliyor; sunucu
 * istemcisi (lib/supabase/server) çerez okuduğu için onu kullanan her sayfa
 * her istekte yeniden çiziliyor ve ücretsiz plandaki sunucu süresini
 * tüketiyordu. Katalog verisi kimseye özel değil: ziyaretçi oturumsuz da
 * aynı satırları görür. Bu istemci anon anahtarla, RLS altında okur; oturum
 * tutmaz, çerez yazmaz.
 *
 * Kişiye özel ya da yazma yapan her iş sunucu istemcisinde kalır.
 */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
