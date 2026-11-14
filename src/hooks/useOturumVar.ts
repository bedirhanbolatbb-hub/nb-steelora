'use client'

import { useSyncExternalStore } from 'react'

/**
 * Üye oturumu açık mı — yalnız GÖRSEL karar için (hesap simgesinin hedefi,
 * altbilgideki hesap bağlantıları).
 *
 * 14 Kas 2026: vitrin önbellekten verildiği için oturum artık sunucuda
 * okunmuyor; Supabase oturum çerezinin tarayıcıdaki varlığına bakılıyor
 * (@supabase/ssr bu çerezi tarayıcıya açık yazar). Yazma yapan her uç kendi
 * doğrulamasını zaten yapıyor; burada güvenlik kararı yok.
 *
 * Sunucu ve hidrasyon çizimi false döner (önbellekteki sayfayla aynı); çerez
 * varsa hidrasyondan hemen sonra "Hesabım"a döner.
 */
const OTURUM_CEREZI = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.0)?=/

// Oturum değişimi (giriş/çıkış) sayfa geçişiyle gelir; anlık abonelik gerekmez.
const abone = () => () => {}

function cerezdenOku(): boolean {
  try {
    return OTURUM_CEREZI.test(document.cookie)
  } catch {
    return false
  }
}

export function useOturumVar(): boolean {
  return useSyncExternalStore(abone, cerezdenOku, () => false)
}
