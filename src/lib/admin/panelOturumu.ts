/**
 * Panel oturum çerezinin değeri (Faz 27).
 *
 * KUSUR: çerezin değeri ADMIN_SECRET_TOKEN'ın KENDİSİYDİ. Çerez bir kez
 * sızarsa (sunucu günlüğü, yedek, tarayıcı eklentisi, ekran paylaşımı) sır da
 * sızmış olurdu — ve o sır aynı zamanda giriş formuna yazılan paroladır.
 *
 * Artık çerez, sırdan HMAC ile türetilmiş bir özet taşır. Özetten sır geri
 * hesaplanamaz. Çerezi ele geçiren yine panele girer (çerez zaten kimlik
 * belgesidir) ama PAROLAYI öğrenemez.
 *
 * Web Crypto kullanılıyor: proxy Edge çalışma zamanında, route handler'lar
 * Node'da çalışıyor; `crypto.subtle` ikisinde de var, `node:crypto` yalnız
 * birinde. Tek uygulama, tek sonuç.
 */

const AMAC = 'nb-panel-oturum-v1'

async function hmacHex(gizli: string, mesaj: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(gizli),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const imza = await crypto.subtle.sign('HMAC', key, enc.encode(mesaj))
  return Array.from(new Uint8Array(imza))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Girişte çereze yazılacak değer. */
export async function panelCerezDegeri(gizli: string): Promise<string> {
  return hmacHex(gizli, AMAC)
}

/**
 * Çerez değeri geçerli mi?
 *
 * GEÇİŞ DÖNEMİ: Faz 27 öncesinde yazılmış çerezler sırrın kendisini taşıyor.
 * Onlar da kabul edilir, yoksa dağıtım anında açık olan panel oturumları
 * düşerdi. Bu tolerans çerez ömrü (7 gün) dolduğunda kaldırılabilir.
 */
export async function panelCereziGecerliMi(
  cerez: string | null | undefined,
  gizli: string | null | undefined
): Promise<boolean> {
  if (!cerez || !gizli) return false
  const beklenen = await panelCerezDegeri(gizli)
  return sabitZamanEsitDize(cerez, beklenen) || sabitZamanEsitDize(cerez, gizli)
}

/** Edge'de de çalışan sabit zamanlı dize karşılaştırması. */
export function sabitZamanEsitDize(a: string, b: string): boolean {
  // Uzunluk farkı zaten dize uzunluğundan görünür; sızdıracak yeni bilgi yok.
  if (a.length !== b.length) return false
  let fark = 0
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return fark === 0
}
