import { createHash, randomBytes } from 'crypto'

/**
 * Çerezsiz oturum kimliği (Katman A — Faz 12).
 *
 * Kimlik, günlük değişen bir tuz ile IP + user-agent'ın karmasından türetilir:
 *   session_id = sha256(gunlukTuz + ip + ua)
 * IP hiçbir yerde SAKLANMAZ, yalnız karma girdisi olarak kullanılıp atılır.
 * Tuz her gün değiştiği için kimlik ertesi gün geçersizleşir — kalıcı kimlik
 * ya da kişi profili oluşmaz, çerez yazılmaz. (Plausible/Fathom deseni.)
 */

const g = globalThis as unknown as { __nbSaltGun?: string; __nbSalt?: string }

/** Sunucu süreci içinde günlük tuz; gün değişince yenilenir. */
function gunlukTuz(): string {
  const bugun = new Date().toISOString().slice(0, 10)
  if (g.__nbSaltGun !== bugun || !g.__nbSalt) {
    g.__nbSaltGun = bugun
    // ANALYTICS_SALT verilmişse çok sunuculu ortamda kimlikler tutarlı olur;
    // yoksa süreç başına rastgele (yine anonim, yalnız daha parçalı sayım).
    g.__nbSalt = (process.env.ANALYTICS_SALT || randomBytes(16).toString('hex')) + bugun
  }
  return g.__nbSalt
}

export function oturumKimligi(ip: string | null | undefined, userAgent: string | null | undefined): string {
  return createHash('sha256')
    .update(`${gunlukTuz()}|${ip || 'yok'}|${userAgent || 'yok'}`)
    .digest('hex')
    .slice(0, 32)
}

/** Vercel/proxy başlıklarından istemci IP'si — yalnız karma için, saklanmaz. */
export function istekIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') || null
}
