/**
 * Güvenlik başlıklarının TEK KAYNAĞI (Faz 27).
 *
 * Faz 27 denetiminde canlıda ölçüldü: `strict-transport-security` dışında
 * HİÇBİR güvenlik başlığı gönderilmiyordu. `x-powered-by: Next.js` ise
 * çalışan çatıyı ve dolaylı olarak sürüm ailesini duyuruyordu.
 *
 * CSP burada değil, `proxy.ts` içinde üretilir: her istek için ayrı bir nonce
 * gerekiyor ve nonce yalnız çalışma anında bilinebiliyor.
 */

/**
 * CSP dışındaki sabit başlıklar. `next.config.ts` bunları API dahil TÜM
 * yollara uygular — CSP'nin aksine bunların hiçbiri 3DS ara sayfasını
 * bozmaz.
 */
export const SABIT_GUVENLIK_BASLIKLARI = [
  // Tıklama hırsızlığı: sitemiz hiçbir yerde çerçevelenmemeli. CSP'deki
  // frame-ancestors bunun modern karşılığı ama eski tarayıcılar için de kalsın.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Tarayıcı içerik tipini "tahmin etmesin": yüklenen bir dosya HTML sanılıp
  // çalıştırılamasın.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Dış sitelere yalnız alan adımız gider; yol ve sorgu (arama terimi, sipariş
  // numarası) sızmaz.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Kullanılmayan güçlü tarayıcı yetenekleri kapalı. Ödeme API'si de kapalı:
  // iyzico akışı bunu KULLANMIYOR, kart verisi bankanın kendi sayfasında
  // giriliyor.
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'display-capture=()',
      'encrypted-media=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'usb=()',
      'interest-cohort=()',
    ].join(', '),
  },
  // HSTS Vercel tarafından zaten gönderiliyordu; alt alan adlarını da kapsasın
  // ve tarayıcı ön yükleme listesine aday olsun diye burada netleştiriliyor.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Çapraz kaynak izolasyonu: başka bir site sayfamızı kaynak olarak çekemesin.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

/** Panel ve hesap gibi kişisel veri taşıyan yolların ara belleğe alınmaması. */
export const GIZLI_YOL_BASLIKLARI = [
  { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
]

/**
 * İçerik Güvenliği Politikası.
 *
 * `script-src` NONCE tabanlı: `'unsafe-inline'` yok. Sitede 52 rotanın 52'si
 * zaten dinamik olduğu için nonce'un statik üretime maliyeti yok (yalnız
 * /panel/login ve /auth/sifremi-sifirla dinamikleşir).
 *
 * Kaynak listesi Faz 27 taramasıyla çıkarıldı:
 *  - connect-src: tarayıcıdaki Supabase istemcisi doğrudan projeye bağlanır
 *    (auth ve PostgREST). Realtime/WebSocket kullanılmıyor, `wss:` yok.
 *  - img-src `https:` GENİŞ bırakıldı: blog ve ürün açıklamaları panelden
 *    gelen HTML içeriyor ve içine herhangi bir barındırıcıdan görsel
 *    konabiliyor. Dar bir liste yayındaki yazıları bozardı; görsel kod
 *    çalıştırmaz, kazanç/kayıp dengesi bu yönde.
 *  - style-src 'unsafe-inline': React sunucuda `style="..."` niteliği basıyor
 *    (34 yerde). Nitelik stilleri için ayrı bir nonce mekanizması yok.
 *  - frame-src/frame-ancestors 'none': sitede gömülü içerik yok.
 *  - form-action 'self': formlarımızın hepsi kendi uçlarımıza gider.
 *
 * `/api/3ds-redirect` bu politikanın DIŞINDADIR: proxy `/api` yollarını
 * eşleştirmez. Orası iyzico'nun ürettiği banka formunu basar; inline script
 * ve bankaya form gönderimi gerektirir, katı politika ödemeyi kırardı.
 * O uç kendi imza doğrulamasıyla korunur (lib/iyzico/redirectImza.ts).
 */
export function cspUret(nonce: string, gelistirme: boolean): string {
  const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const kurallar: string[] = [
    "default-src 'self'",
    // Geliştirmede Next hot-reload için eval kullanır; üretimde yok.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${gelistirme ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self'${supabase ? ` ${supabase}` : ''}${gelistirme ? ' ws: wss:' : ''}`,
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
  ]
  return kurallar.join('; ')
}
