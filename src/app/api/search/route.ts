import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groupProducts, type GroupableProduct } from '@/lib/catalog/variants'
import { kelimeEslesir, kelimelereAyir } from '@/lib/catalog/aramaMetni'

const RESULT_LIMIT = 8
const DIZIN_OMRU_MS = 5 * 60 * 1000
const KOLONLAR =
  'id, slug, display_title, trendyol_title, display_price, display_images, trendyol_category, trendyol_stock, gender, created_at, variant_label'

type AramaSatiri = GroupableProduct & {
  trendyol_title?: string | null
  display_images?: string[] | null
}
type Dizinli = { satir: AramaSatiri; ad: string[]; uzun: string[]; kategori: string[] }

// Salt okunur katalog önbelleği (kişiye özel bir şey yok). Fonksiyon örneği
// başına tutulur; en kötü durumda 5 dakika eski ad/stok gösterir.
const kuresel = globalThis as unknown as { __nbAramaDizini?: { zaman: number; dizin: Dizinli[] } }

async function aramaDizini(): Promise<Dizinli[]> {
  const onbellek = kuresel.__nbAramaDizini
  if (onbellek && Date.now() - onbellek.zaman < DIZIN_OMRU_MS) return onbellek.dizin
  const supabase = await createClient()
  // Pasif ürün listelenmez: sayfası 404 döner (eski arama süzmüyordu).
  const { data, error } = await supabase.from('products_display').select(KOLONLAR).eq('is_active', true).limit(2000)
  if (error || !data) return onbellek?.dizin ?? []
  const dizin = (data as AramaSatiri[]).map((satir) => ({
    satir,
    ad: kelimelereAyir(String(satir.display_title ?? '')),
    uzun: kelimelereAyir(String(satir.trendyol_title ?? '')),
    kategori: kelimelereAyir(String(satir.trendyol_category ?? '')),
  }))
  kuresel.__nbAramaDizini = { zaman: Date.now(), dizin }
  return dizin
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  // Arama hem görünen (kısa) ad hem de uzun Trendyol başlığı üzerinde çalışır:
  // kısa adlar devreye girince "zirkon taşlı", "figürlü" gibi kelimelerle
  // yapılan aramalar sonuçsuz kalmasın. Sonuç satırında görünen ad basılır.
  // Gruplama sonucu kart sayısını düşürdüğü için ham eşleşmeden fazlası çekilir.
  /**
   * KELİME KELİME ARAMA (5 Eyl 2026 ölçümü).
   *
   * Eskiden yazılan metnin TAMAMI tek parça olarak aranıyordu (`ilike %metin%`),
   * yani kelimelerin yan yana ve aynı sırada olması gerekiyordu. Ölçülen sonuç:
   *   "yıldız bileklik" → 3 sonuç      "bileklik yıldız" → 0
   *   "zirkon taşlı küpe" → 3 sonuç    "taşlı zirkon küpe" → 0
   *   "erkek zincir" → 0  (oysa katalogda "Erkek Siyah İnce Zincir Bileklik" var)
   * Kısa adlar 2-3 kelime olduğu için onlar tutuyor, uzun pazaryeri başlığıyla
   * yapılan arama tutmuyordu — dışarıdan "yalnız kısa adda arıyor" gibi görünen
   * şey buydu.
   *
   * Artık metin kelimelere ayrılır ve HER kelime aranır: bir kelime üç alandan
   * (görünen ad, pazaryeri başlığı, kategori) herhangi birinde geçebilir, ama
   * kelimelerin HEPSİ geçmek zorundadır. Sıra ve bitişiklik önemsiz.
   *
   * Faz 27 güvenliği aynen duruyor: `filtreIcinTemizle` virgül, parantez ve
   * joker karakterleri ayıklar — arama kutusu filtrenin yapısını değiştiremez.
   */
  const sorgu = kelimelereAyir(q)
    .filter((k) => k.length >= 2)
    .slice(0, 6)
  if (sorgu.length === 0) return NextResponse.json([])

  // Faz 36: eşleştirme artık veritabanında değil burada (lib/catalog/aramaMetni):
  // Türkçe ekler ve İ/i/ı denkliği SQL'de güvenle kurulamıyordu. Katalog küçük
  // (≈500 satır) ve 5 dakika önbellekte; her tuş vuruşunda sorgu atılmaz.
  const dizin = await aramaDizini()

  const puanli: { satir: AramaSatiri; puan: number }[] = []
  for (const d of dizin) {
    let puan = 0
    let hepsi = true
    for (const k of sorgu) {
      const adda = d.ad.some((w) => kelimeEslesir(k, w))
      if (!adda && !d.uzun.some((w) => kelimeEslesir(k, w)) && !d.kategori.some((w) => kelimeEslesir(k, w))) {
        hepsi = false
        break
      }
      // Görünen adda geçen kelime pazaryeri başlığında geçenden önce gelir;
      // kelimenin tam kendisi ek almış hâlinden önce.
      puan += adda ? 3 : 1
      if (d.ad.includes(k)) puan += 1
    }
    if (hepsi) puanli.push({ satir: d.satir, puan: puan + (Number(d.satir.trendyol_stock) > 0 ? 0.5 : 0) })
  }
  puanli.sort((a, b) => b.puan - a.puan)

  /**
   * YAKIN SONUÇ (Kasım 2026 ölçümü: "harf bileklik", "bileklik harfli",
   * "harf charm" sonuçsuzdu — katalogda harf kolye ve harf küpe varken).
   *
   * Hiçbir ürün kelimelerin HEPSİNİ taşımıyorsa boş liste yerine kelimelerin
   * bir kısmını taşıyanlar döner. Nadir kelime ağır basar: "harf bileklik"te
   * "harf" az üründe geçtiği için harfli parçalar bilekliklerin önüne çıkar.
   * Her satır `yakin: true` taşır; arama penceresi bunu söyler ve ölçümde
   * arama yine SONUÇSUZ sayılır — eksik ürün sinyali kaybolmaz.
   */
  let yakin = false
  if (puanli.length === 0 && sorgu.length >= 2) {
    const toplam = dizin.length || 1
    const agirlik = sorgu.map((k) => {
      const gecen = dizin.filter(
        (d) => d.ad.some((w) => kelimeEslesir(k, w)) || d.uzun.some((w) => kelimeEslesir(k, w))
      ).length
      return gecen > 0 ? Math.log(1 + toplam / gecen) : 0
    })
    for (const d of dizin) {
      let puan = 0
      sorgu.forEach((k, i) => {
        if (d.ad.some((w) => kelimeEslesir(k, w))) puan += 3 * agirlik[i]
        else if (d.uzun.some((w) => kelimeEslesir(k, w))) puan += agirlik[i]
      })
      if (puan > 0) puanli.push({ satir: d.satir, puan: puan + (Number(d.satir.trendyol_stock) > 0 ? 0.01 : 0) })
    }
    puanli.sort((a, b) => b.puan - a.puan)
    yakin = puanli.length > 0
  }

  // Gruplama ilk görülme sırasını korur — sıralama puanla kalır.
  const results = groupProducts(puanli.slice(0, RESULT_LIMIT * 8).map((p) => p.satir))
    .slice(0, RESULT_LIMIT)
    .map((group) => ({ ...group.cover, option_count: group.optionCount, ...(yakin ? { yakin: true } : {}) }))

  // Aynı sorgu kısa süre içinde tekrar yazıldığında (yaygın: silip yeniden
  // yazma) yanıt kenardan döner. İçerik kişiye özel değil; stok/fiyat
  // değişimi en geç bir dakika sonra yansır.
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
  })
}
