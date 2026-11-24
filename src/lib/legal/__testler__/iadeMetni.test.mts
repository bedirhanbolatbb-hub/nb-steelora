import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'
import { kategoriTanitimi } from '@/lib/metin/kategoriMetni'
import { SOZLESME_SURUMU } from '../sozlesme.ts'
import { sssTamami } from '../sss.ts'

/**
 * İade metinlerinin birbirini tutması (25 Kas 2026).
 *
 * KUSUR: hukuk sayfaları, sipariş e-postası, llms.txt ve piercing kategori
 * cümlesi "küpe ve piercing hijyen mührüyle gönderilir; mühür açılınca iade
 * edilemez" diyordu. Mühür hiç kullanılmadı — ürünler kapalı hediye kutusunda
 * gidiyor — ve ürün sayfaları her üründe "14 gün içinde sebep göstermeden
 * iade" vaat ediyordu. Aynı mağaza iki ayrı şey söylüyordu.
 *
 * KARAR (BB, 24 Kas 2026): küpe ve piercing diğer ürünler gibi iade edilir.
 * Tek istisna kişiye özel hazırlanan ürünlerdir (MSY m.15/1-b).
 *
 * Bu test o cümlelerin müşterinin okuduğu hiçbir metne geri dönmemesini
 * sağlar. Yorum satırları sayılmaz: kararın gerekçesi kodda yazılı kalmalı.
 */
const sonuc: string[] = []
const kontrol = (ad: string, kosul: boolean, deger: unknown) => {
  if (!kosul) {
    console.error(`✗ ${ad}\n   görülen: ${JSON.stringify(deger)}`)
    process.exit(1)
  }
  sonuc.push(ad)
}

const SRC = fileURLToPath(new URL('../../../', import.meta.url))

function dosyalar(dizin: string): string[] {
  const cikti: string[] = []
  for (const ad of readdirSync(dizin)) {
    if (ad === 'node_modules' || ad === '__testler__') continue
    const yol = join(dizin, ad)
    if (statSync(yol).isDirectory()) cikti.push(...dosyalar(yol))
    else if (/\.(ts|tsx)$/.test(ad)) cikti.push(yol)
  }
  return cikti
}

/** Yorumları atar, boşlukları tekler — geriye müşterinin göreceği metin kalır. */
function metin(kaynak: string): string {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((satir) => satir.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/\s.*$/, ''))
    .join('\n')
    .replace(/\s+/g, ' ')
}

const oku = (goreli: string) => metin(readFileSync(join(SRC, goreli), 'utf8'))

// ── 1) Yasaklı cümleler hiçbir kaynak dosyada (yorum dışında) geçmez
const YASAK = [
  'hijyen mühr',
  'mühürle',
  'mühür açıl',
  'mührü açıl',
  'koruyucu bant',
  'vücut deldirme',
  '15/1(ç)',
  'hijyen gereği',
  'iadesi uygun olmayan',
]
{
  const tum = dosyalar(SRC)
  kontrol('kaynak dosyalar bulundu', tum.length > 200, tum.length)
  const bulgu: string[] = []
  for (const yol of tum) {
    const t = metin(readFileSync(yol, 'utf8')).toLocaleLowerCase('tr-TR')
    for (const y of YASAK) if (t.includes(y)) bulgu.push(`${relative(SRC, yol)} → "${y}"`)
  }
  kontrol('mühür / hijyen istisnası hiçbir müşteri metninde yok', bulgu.length === 0, bulgu)
}

// ── 2) Beş metin de aynı şeyi söyler
const ORTAK = 'Küpe ve piercing dâhil diğer tüm ürünlerde'
{
  const kargo = oku('app/(store)/kargo-ve-iade/page.tsx')
  kontrol('kargo-ve-iade: küpe ve piercing iade edilir', kargo.includes(ORTAK), null)
  kontrol('kargo-ve-iade: tek istisna yazılı', kargo.includes('Cayma hakkı yalnızca bir durumda kullanılamaz') && kargo.includes('Kişiye özel hazırlanan ürünler'), null)

  const onBilgi = oku('app/(store)/on-bilgilendirme-formu/page.tsx')
  kontrol('ön bilgilendirme: küpe ve piercing iade edilir', onBilgi.includes(ORTAK), null)
  kontrol('ön bilgilendirme: m.15/1(b) duruyor', onBilgi.includes('m.15/1(b)'), null)

  const sozlesme = oku('app/(store)/mesafeli-satis-sozlesmesi/page.tsx')
  kontrol('mesafeli sözleşme: küpe ve piercing iade edilir', sozlesme.includes(ORTAK), null)
  kontrol('mesafeli sözleşme: m.15/1(b) duruyor', sozlesme.includes('m.15/1(b)'), null)

  const eposta = oku('lib/emails/templates.ts')
  kontrol('sipariş e-postası: küpe ve piercing iade edilir', eposta.includes(ORTAK), null)
  kontrol('sipariş e-postası: tek istisna kişiye özel ürünler', eposta.includes('yalnızca kişiye özel hazırlanan ürünlerde'), null)

  const llms = oku('app/llms.txt/route.ts')
  kontrol('llms.txt: küpe ve piercing iade edilir', llms.includes('küpe ve piercing dâhil diğer tüm ürünler iade edilebilir'), null)
}

// ── 2a) SSS sayfası soruyu doğrudan cevaplar (kart açık/kapalı fark etmez)
for (const kartAcik of [true, false]) {
  const s = sssTamami(kartAcik).find((x) => x.soru === 'Küpe ve piercing iade edilebilir mi?')
  kontrol(`SSS: küpe ve piercing sorusu var (kart ${kartAcik ? 'açık' : 'kapalı'})`, !!s && s.cevap.startsWith('Evet.') && s.cevap.includes('yalnızca kişiye özel hazırlanan ürünlerde kullanılamaz'), s)
}

// ── 2b) Geri ödeme süresi her metinde aynı günden işler (MSY m.12/1)
// Sözleşme "taşıyıcıya teslim edildiği tarihten itibaren" diyordu; sipariş
// e-postası "cayma bildiriminiz ulaştıktan sonra", SSS "ürün tarafımıza
// ulaştıktan sonra" yazıyordu. Üç metin üç ayrı başlangıç veriyordu.
{
  const eposta = oku('lib/emails/templates.ts')
  const sss = oku('lib/legal/sss.ts')
  const kargo = oku('app/(store)/kargo-ve-iade/page.tsx')
  const TESLIM = 'iade kargosuna teslim ettiğiniz tarihten itibaren'
  kontrol('geri ödeme başlangıcı: sipariş e-postası', eposta.includes(`Ürünü ${TESLIM}`) && !eposta.includes('bildiriminiz ulaştıktan sonra'), null)
  kontrol('geri ödeme başlangıcı: SSS', sss.includes(`Ürünü ${TESLIM}`) && !sss.includes('tarafımıza ulaştıktan sonra ödemeniz'), null)
  kontrol('geri ödeme başlangıcı: kargo-ve-iade', kargo.includes(`Ürünü ${TESLIM}`), null)
  kontrol('sipariş e-postasında süre elle yazılmaz', eposta.includes('${GERI_ODEME_GUN} gün içinde') && eposta.includes('${AZAMI_TESLIM_GUN} gündür'), null)
}

// ── 3) Kategori cümleleri (panelin "Başka öner" havuzu) mühür vaat etmez
{
  for (const slug of ['kolye', 'kupe', 'bileklik', 'yuzuk', 'piercing', 'erkek', 'setler', 'halhal']) {
    const adaylar = kategoriTanitimi(slug, slug)
    const kotu = adaylar.filter((c) => /mühür|hijyen/i.test(c))
    kontrol(`kategori cümleleri temiz: ${slug}`, kotu.length === 0, kotu)
    kontrol(`kategori cümleleri tekil: ${slug}`, new Set(adaylar).size === adaylar.length, adaylar)
  }
}

// ── 4) Esasa ilişkin değişiklik sürüme yansıdı
kontrol('sözleşme sürümü 25 Kas 2026 ya da sonrası', SOZLESME_SURUMU >= '2026-11-25', SOZLESME_SURUMU)

console.log(`✓ ${sonuc.length}/${sonuc.length} iade metni testi geçti`)
