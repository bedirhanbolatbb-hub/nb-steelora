import { cookies } from 'next/headers'
import { timingSafeEqual } from 'node:crypto'
import { panelCereziGecerliMi } from './panelOturumu'

/**
 * Panel ve cron yetkilendirmesinin TEK KAYNAĞI (Faz 27'de birleştirildi).
 *
 * Önceden aynı mantığın DÖRT kopyası vardı: buradaki paylaşılan sürüm ve
 * /api/sync, /api/backup, /api/health/rapor içinde birebir kopyalanmış üç
 * yerel sürüm. Kopya güvenlik kodu, düzeltmenin bir yere uygulanıp diğerine
 * uygulanmaması demektir; hepsi buraya bağlandı.
 */

/**
 * Sabit zamanlı dize karşılaştırması.
 *
 * `a === b` ilk farklı karakterde döner; teoride yanıt süresinden karakter
 * karakter sır tahmini yapılabilir. Ağ gürültüsü bunu pratikte çok zorlaştırır
 * ama sır karşılaştırmasında doğru alışkanlık ucuz: uzunluk farkı da sızmasın
 * diye önce SHA gibi sabit uzunluğa indirmek yerine, uzunluk eşit değilse
 * yine de bir karşılaştırma yapıp false döneriz.
 */
export function sabitZamanEsit(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false
  const x = Buffer.from(a, 'utf8')
  const y = Buffer.from(b, 'utf8')
  if (x.length !== y.length) {
    // Uzunluk farklıysa timingSafeEqual fırlatır; sabit maliyetli bir
    // karşılaştırma yapıp yine de false dönüyoruz.
    timingSafeEqual(x, x)
    return false
  }
  return timingSafeEqual(x, y)
}

/** İstek başlığından `admin_token` çerezini okur. */
function cerezdenToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  // Çerez adının başka bir çerezin sonuna takılmaması için sınır kontrolü:
  // "xadmin_token=..." eşleşmemeli.
  const m = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]*)/)
  return m ? decodeURIComponent(m[1]).trim() : null
}

/**
 * Panel oturumu — sunucu bileşenleri ve route handler'lar için.
 * Kapalı başarısız olur: ADMIN_SECRET_TOKEN ya da çerez yoksa false.
 */
export async function isAdminRequest(): Promise<boolean> {
  const store = await cookies()
  const token = store.get('admin_token')?.value?.trim()
  return panelCereziGecerliMi(token, process.env.ADMIN_SECRET_TOKEN?.trim())
}

/**
 * Panel oturumu — elde `Request` varken (cron ile aynı uçta olan yollar).
 * `cookies()` yerine isteğin kendi başlığını okur; davranış aynıdır.
 */
export async function adminIstegiMi(request: Request): Promise<boolean> {
  const token = cerezdenToken(request.headers.get('cookie'))
  return panelCereziGecerliMi(token, process.env.ADMIN_SECRET_TOKEN?.trim())
}

/**
 * Vercel cron ya da elle tetikleme.
 *
 * `CRON_SECRET` tanımlı değilse HİÇBİR istek cron sayılmaz — sır unutulduğunda
 * uçların herkese açılmaması için kapalı başarısız olur.
 */
export function cronIstegiMi(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const basligi = request.headers.get('authorization') ?? ''
  // Faz 27: `?secret=` desteği KALDIRILDI. Sorgu dizesi erişim günlüklerine,
  // tarayıcı geçmişine ve Referer başlığına düşer; sır orada durmamalı.
  return sabitZamanEsit(basligi, `Bearer ${secret}`)
}
