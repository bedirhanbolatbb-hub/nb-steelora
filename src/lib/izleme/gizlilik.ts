/**
 * Sentry olaylarından kişisel veriyi TEMİZLER — tek kaynak.
 *
 * Hata gözcüsü kurmanın bedeli, müşteri verisini üçüncü bir tarafa taşımak
 * OLMAMALI. Faz 27'de paneldeki e-posta adresleri maskelenmişti (omuz üstünden
 * bakış); hata kaydı daha ağır bir yüzey: kayıtlar aylarca duruyor, Sentry
 * hesabına erişen herkes okuyabiliyor ve KVKK açısından yurt dışına aktarım
 * sayılıyor. Bu yüzden burada MASKELEME değil, tam SİLME uygulanır — hata
 * ayıklamak için e-postanın ilk üç harfine de ihtiyaç yok.
 *
 * İki katmanlı çalışır:
 *   1) ANAHTAR ADI — `email`, `adres`, `telefon` gibi bir alan adı görülürse
 *      değeri ne olursa olsun silinir.
 *   2) DEĞER DESENİ — anahtar masum olsa bile (`mesaj`, `body`, `detay`)
 *      içindeki e-posta / telefon / kart / IBAN dizgileri silinir.
 *
 * İkinci katman şart: hata mesajları çoğu zaman serbest metindir
 * ("celiknalan72@gmail.com için sipariş bulunamadı") ve anahtar adına bakan
 * bir süzgeç bunu kaçırır.
 */

/** Silinen her değerin yerine bu yazılır — alan tamamen kaybolmaz, gizlendiği görünür. */
export const GIZLENDI = '[gizlendi]'

/**
 * Adı bu kalıplardan birini İÇEREN alanın değeri koşulsuz silinir.
 * Küçük harfe indirilmiş anahtar üzerinde aranır; Türkçe ve İngilizce bir arada.
 */
const YASAKLI_ANAHTARLAR = [
  'email', 'eposta', 'e-posta', 'mail',
  'phone', 'telefon', 'gsm', 'cep',
  'address', 'adres', 'sehir', 'ilce', 'posta_kod', 'postakod', 'zip',
  'ad_soyad', 'adsoyad', 'fullname', 'full_name', 'firstname', 'lastname',
  'name', 'ad', 'soyad', 'isim',
  'tckn', 'tc_kimlik', 'kimlik', 'vergi',
  'card', 'kart', 'cvc', 'cvv', 'pan', 'iban',
  'password', 'sifre', 'parola',
  'token', 'secret', 'apikey', 'api_key', 'authorization', 'cookie', 'session',
]

/**
 * Serbest metinde aranan desenler. Sıra önemli: kart/IBAN önce yakalanır,
 * yoksa uzun rakam dizisi kuralı onları parçalayabilir.
 */
const DESENLER: [RegExp, string][] = [
  // E-posta
  [/[\w.+-]+@[\w-]+\.[\w.-]{2,}/g, GIZLENDI],
  // IBAN (TR26 0001 ...) — boşluklu ya da bitişik
  [/\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]{4}){3,7}\b/g, GIZLENDI],
  // Kart numarası — 13-19 hane, aralarda boşluk/tire olabilir
  [/\b(?:\d[ -]?){12,18}\d\b/g, GIZLENDI],
  // Türkiye telefon numarası: +90 / 0 ile başlayan 10-11 hane
  [/(?:\+?90[ -]?)?0?\s?5\d{2}[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}/g, GIZLENDI],
]

/**
 * KORUNAN belirteçler: kişisel veri değil ama desenlere benziyorlar.
 *
 * Sipariş numarası `NBS-1787569943108` 13 haneli olduğu için kart numarası
 * kuralına takılıyordu — oysa hata ayıklarken en çok işe yarayan alan odur ve
 * tek başına kimseyi tanımlamaz (kime ait olduğu yalnız BİZİM veritabanımızdan
 * çözülür). Bu yüzden önce yerine geçici bir işaret konur, temizlik yapılır,
 * sonra geri yazılır.
 */
const KORUNANLAR: RegExp[] = [
  /\bNBS-\d+\b/g,          // sipariş numarası
  /\bNB[A-Z]{1,3}\d+\b/g,  // ürün barkodu (NBK013, NBGP001)
]

/**
 * /g bayraklı RegExp'ler `lastIndex` durumunu taşır; aynı nesneyi ard arda
 * kullanmak eşleşme atlatır. Her çağrıda taze kopya üretilir.
 */
function tazeDesenler(desenler: RegExp[]): RegExp[] {
  return desenler.map((d) => new RegExp(d.source, d.flags))
}

/** Serbest metinden kişisel veri desenlerini siler. */
export function metniTemizle(metin: string): string {
  // 1) Korunanları sakla — işaret hiçbir desene benzemeyen bir dizgi.
  const kasa: string[] = []
  let t = metin
  for (const desen of tazeDesenler(KORUNANLAR)) {
    t = t.replace(desen, (m) => {
      kasa.push(m)
      return `\u0001${kasa.length - 1}\u0001`
    })
  }

  // 2) Temizle.
  for (const [desen, yerine] of DESENLER) t = t.replace(desen, yerine)

  // 3) Geri yaz.
  return t.replace(/\u0001(\d+)\u0001/g, (_, i) => kasa[Number(i)] ?? GIZLENDI)
}

function anahtarYasakMi(anahtar: string): boolean {
  const k = anahtar.toLowerCase()
  // Tam eşleşen kısa anahtarlar ('ad', 'name') ile içeren uzunlar ayrı ele
  // alınır: 'ad' kuralı 'admin_id' ya da 'created_at' içinde eşleşmemeli.
  return YASAKLI_ANAHTARLAR.some((y) => (y.length <= 4 ? k === y : k.includes(y)))
}

/**
 * Nesneyi derinlemesine gezip temizler.
 *
 * Döngüsel referans korumalı ve derinlik sınırlı: Sentry olayları bazen
 * DOM düğümü ya da istek nesnesi taşır; sınırsız gezinmek işlemciyi kilitler.
 */
export function derinTemizle<T>(deger: T, derinlik = 0, gorulen = new WeakSet<object>()): T {
  if (derinlik > 8) return GIZLENDI as unknown as T
  if (typeof deger === 'string') return metniTemizle(deger) as unknown as T
  if (deger === null || typeof deger !== 'object') return deger

  const nesne = deger as unknown as object
  if (gorulen.has(nesne)) return GIZLENDI as unknown as T
  gorulen.add(nesne)

  if (Array.isArray(deger)) {
    return deger.map((x) => derinTemizle(x, derinlik + 1, gorulen)) as unknown as T
  }

  const sonuc: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(deger as Record<string, unknown>)) {
    sonuc[k] = anahtarYasakMi(k) ? GIZLENDI : derinTemizle(v, derinlik + 1, gorulen)
  }
  return sonuc as unknown as T
}

/**
 * Sentry `beforeSend` kancası — olayı göndermeden önce temizler.
 *
 * `user` alanı TAMAMEN düşürülür: Sentry'nin kullanıcı kimliği e-posta ve IP
 * taşır. Hangi müşterinin etkilendiğini bilmek gerekirse sipariş numarası
 * zaten hata mesajında olur ve o bizim kendi kayıtlarımızdan çözülür.
 */
export function olayiTemizle<T extends Record<string, any>>(olay: T): T {
  const temiz = derinTemizle(olay)

  if (temiz.user) delete temiz.user
  if (temiz.request) {
    // Çerez ve yetki başlığı oturum çalmaya yeter; sorgu dizgisi e-posta taşır.
    delete temiz.request.cookies
    delete temiz.request.headers
    if (typeof temiz.request.query_string === 'string') {
      temiz.request.query_string = metniTemizle(temiz.request.query_string)
    }
    if (typeof temiz.request.url === 'string') {
      temiz.request.url = metniTemizle(temiz.request.url)
    }
  }
  return temiz
}
