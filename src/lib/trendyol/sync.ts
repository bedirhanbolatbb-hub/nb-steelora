import { fetchApprovedProducts, fetchStockAndPriceMap } from './client'
import { malzemeCoz, malzemeYazilacak, type MalzemeTipi } from '@/lib/catalog/material'
import { sonYazilanBarkodlar } from './stokKuyrugu'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateSlug(title: string, barcode: string): string {
  const base = title
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
  return `${base}-${barcode.slice(-6)}`
}

type VariantRow = {
  barcode: string
  variantId: string
  title: string
  description: string
  images: string[]
  category: string | null
  variantLabel: string | null
  gender: string | null
  material: MalzemeTipi
}

/**
 * gender kuralı — yalnızca DB'de değeri BOŞ olan satırlar için uygulanır.
 * 1) Görünen başlıkta kelime olarak "erkek" geçiyorsa → men
 * 2) Değilse V2 "Cinsiyet" değeri: Kadın→women, Erkek→men
 * 3) Unisex / bilinmeyen → boş bırakılır
 * Dolu gender değerleri hiçbir koşulda ezilmez.
 */
function resolveGender(title: string, cinsiyet: string | undefined): string | null {
  const normalized = title.trim().replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()
  if (/(^|\s)erkek(\s|$|['’])/.test(normalized)) return 'men'

  if (!cinsiyet) return null
  if (cinsiyet.includes('Kadın')) return 'women'
  if (cinsiyet.trim() === 'Erkek') return 'men'
  return null
}

function findAttribute(attributes: any[] | undefined, name: string): string | undefined {
  return (attributes || []).find((a: any) => a?.attributeName === name)?.attributeValue
}

/**
 * V2 content listesini ürün-başına-satır yapımıza düzleştirir.
 * Bir content altındaki her variant ayrı satırdır; satır anahtarı barkoddur.
 * Arşivli / satışta olmayan varyantlar atlanır (V1'deki onSale filtresinin karşılığı).
 */
function flattenContents(contents: any[]): VariantRow[] {
  const rows: VariantRow[] = []

  for (const content of contents) {
    const images = (content.images || [])
      .map((img: any) => img?.url || img)
      .filter(Boolean)

    const gender = resolveGender(content.title || '', findAttribute(content.attributes, 'Cinsiyet'))

    // Malzeme content seviyesindeki "Materyal" özniteliğinden gelir (attributeId
    // 14, 426 content'in 393'ünde dolu). Öznitelik yoksa başlıktan çıkarılır.
    // Variant.attributes'ta yalnız "Beden" var, malzeme orada ARANMAZ.
    const material = malzemeCoz({
      ozellik: findAttribute(content.attributes, 'Materyal'),
      baslik: content.title || '',
    })
    const siblings = (content.variants || []).filter(
      (v: any) => v?.barcode && !v.archived && v.onSale !== false
    )

    // "Beden" tüm kardeş varyantlarda aynıysa ayırt etmiyor demektir (ör.
    // harf kolyelerinde hepsi "Battal Standart") — etiket olarak yazılmaz.
    const labels = siblings.map((v: any) => findAttribute(v.attributes, 'Beden') ?? null)
    const labelsDistinguish = new Set(labels.filter(Boolean)).size > 1

    siblings.forEach((variant: any, i: number) => {
      rows.push({
        barcode: variant.barcode,
        variantId: String(variant.variantId ?? ''),
        title: content.title || '',
        description: content.description || '',
        images,
        category: content.category?.name ?? null,
        variantLabel: labelsDistinguish ? labels[i] : null,
        gender,
        material,
      })
    })
  }

  return rows
}

/**
 * Sayfadaki satırların DB'ye yazılacak hâli.
 *
 * Yalnızca sync'in sahibi olduğu alanlar yazılır: trendyol_* alanları,
 * variant_label, is_active, last_synced_at ve satır kimliği (slug, trendyol_id).
 * Yönetici alanları (override_title / override_description / override_price,
 * is_featured, badge...) yükün İÇİNDE YOKTUR; upsert onlara dokunamaz.
 *
 * İki alan bu kuralın kenarında duruyor: `gender` ve `material_type`. İkisi de
 * panelden düzenlenebiliyor ama Trendyol verisinden türetilebiliyor da. İkisi
 * için de aynı koruma geçerli: DEĞER YALNIZ BOŞKEN yazılır, dolu değer kendi
 * değeriyle geri yazılır — yani elle girilen hiçbir şey ezilmez.
 */
type UpsertRow = Record<string, unknown>

/**
 * Sync sayfası işler.
 *
 * ÖNEMLİ 1: Ürünler BAŞTA pasife çekilmez. Eskiden sayfa 0 tüm katalogu
 * is_active=false yapıyor, sonraki sayfalar tek tek geri açıyordu; koşu yarıda
 * kalırsa (Vercel'de 60 sn limiti) katalogun büyük kısmı görünmez kalıyordu —
 * 13 Ağustos 2026'da 440 üründen 272'si bu yüzden siteden düştü. Her sayfa
 * dokunduğu satırı is_active=true + last_synced_at ile damgalar; katalogdan
 * düşenleri koşu sahibi (syncRun) yalnız koşu tamamlandığında pasife çeker.
 *
 * ÖNEMLİ 2: Yazma ürün başına değil, sayfa başına TEK toplu upsert'tir
 * (çakışma hedefi: trendyol_barcode tekil indeksi). Eskiden 50 satırlık bir
 * sayfa 50 ayrı update/insert isteği demekti; koşu 60 sn'ye sığmıyordu.
 */
export async function syncTrendyolPage(page: number, size = 100, runStartedAt?: string) {
  const supabase = getServiceClient()
  const runStart = runStartedAt ?? new Date().toISOString()

  const data = await fetchApprovedProducts(page, size)
  const contents = data.content || []
  const totalElements = data.totalElements || 0
  const totalPages = data.totalPages || Math.ceil(totalElements / size) || 1

  const rows = flattenContents(contents)
  console.log(
    `Sync sayfa ${page}/${totalPages}: ${contents.length} content → ${rows.length} varyant (toplam content: ${totalElements})`
  )

  // Stok ve fiyat yalnızca inventory-and-price ucunda dönüyor.
  const stockMap = await fetchStockAndPriceMap(rows.map((r) => r.barcode))

  // Sayfadaki barkodların mevcut satırları TEK sorguda alınır. slug ve
  // trendyol_id de okunur: upsert'in insert kolu bu iki NOT NULL kolonu
  // istiyor, mevcut satırlarda ise DEĞERİN AYNISI geri yazılarak URL'ler ve
  // dış referanslar olduğu gibi korunuyor.
  const { data: existingRows } = await supabase
    .from('products')
    // trendyol_price/stock de okunur: taze yazılmış barkodlarda mevcut değer
    // korunacak (Faz 16B).
    .select(
      'id, trendyol_barcode, gender, material_type, slug, trendyol_id, trendyol_price, trendyol_stock'
    )
    .in('trendyol_barcode', rows.map((r) => r.barcode))

  // Son 15 dakikada Trendyol'a yazdığımız barkodlar — bu koşuda ezilmezler.
  const tazeYazilan = await sonYazilanBarkodlar(15)

  const existingByBarcode = new Map(
    (existingRows || []).map((r: any) => [r.trendyol_barcode, r])
  )

  const now = new Date().toISOString()
  const payload: UpsertRow[] = []
  const seenBarcodes = new Set<string>()
  let added = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const inventory = stockMap.get(row.barcode)

    // Stok/fiyat alınamadıysa satıra dokunma: eksik veri 0 olarak yazılmaz.
    if (!inventory) {
      skipped++
      console.warn(`Stok/fiyat alınamadı, atlandı: ${row.barcode}`)
      continue
    }

    // Aynı barkod tek yükte iki kez bulunursa ON CONFLICT hata verir
    // ("cannot affect row a second time") ve tüm sayfa yazılamaz.
    if (seenBarcodes.has(row.barcode)) continue
    seenBarcodes.add(row.barcode)

    const existing = existingByBarcode.get(row.barcode)

    payload.push({
      trendyol_barcode: row.barcode,
      trendyol_title: row.title,
      trendyol_description: row.description,
      // Son 15 dakikada Trendyol'a stok yazdıysak, o barkodun stok/fiyatı bu
      // koşuda güncellenmez: yazımımız henüz yansımamış olabilir ve senkron
      // eski değeri geri yazardı (Faz 16B).
      trendyol_price: tazeYazilan.has(row.barcode) && existing ? existing.trendyol_price : inventory.salePrice,
      trendyol_stock: tazeYazilan.has(row.barcode) && existing ? existing.trendyol_stock : inventory.quantity,
      trendyol_images: row.images,
      trendyol_category: row.category,
      variant_label: row.variantLabel,
      is_active: true,
      last_synced_at: now,
      updated_at: now,
      // gender yalnızca boşsa doldurulur; dolu (elle etiketlenmiş olabilecek)
      // değer kendi değeriyle geri yazılır, yani ezilmez.
      gender: existing ? (existing.gender ?? row.gender) : row.gender,
      // Malzeme aynı korumayla: 'unknown'/boş satırlar Trendyol'un "Materyal"
      // özniteliğinden doldurulur, dolu değer (panelden girilmiş olabilir)
      // asla ezilmez. Kaynağı ayırt eden bir sütun olmadığı için tek güvenli
      // kural bu.
      material_type: malzemeYazilacak(existing?.material_type, row.material),
      // Mevcut satırda ikisi de değişmeden geri yazılır; yeni satırda üretilir.
      slug: existing ? existing.slug : generateSlug(row.title, row.barcode),
      trendyol_id: existing ? existing.trendyol_id : row.variantId,
    })

    if (existing) updated++
    else added++
  }

  if (payload.length > 0) {
    const { error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'trendyol_barcode' })

    if (error) {
      // Toplu yazma tek bir bozuk satır yüzünden düşerse (ör. trendyol_id
      // çakışması) 50 ürünü birden kaybetmeyelim: satır satır dene, yalnız
      // gerçekten yazılamayanı atla.
      console.error(`Sayfa ${page} toplu upsert hatası, satır satır denenecek: ${error.message}`)
      added = 0
      updated = 0
      let failed = 0

      for (const item of payload) {
        let { error: rowError } = await supabase
          .from('products')
          .upsert([item], { onConflict: 'trendyol_barcode' })

        // GÜVENLİK AĞI: DB'nin CHECK kısıtı henüz tanımadığı bir malzeme tipini
        // reddediyorsa (kodda yeni tip var ama DDL inmemiş) satırı MALZEMESİZ
        // yaz. Aksi hâlde satır last_synced_at damgasını alamaz ve koşu sonunda
        // "bu koşuda görülmedi" diye PASİFE ÇEKİLİR — yani bir migration
        // gecikmesi ürünü sessizce siteden düşürür. Malzemenin bir tur eksik
        // kalması, ürünün kaybolmasından iyidir; DDL inince kendiliğinden dolar.
        if (rowError && item.material_type && item.material_type !== 'unknown') {
          console.warn(
            `Malzeme tipi reddedildi (${item.trendyol_barcode}: ${item.material_type}); ` +
              'satır malzemesiz yazılıyor. CHECK kısıtı güncellenmeli — docs/malzeme/'
          )
          const { error: malzemesiz } = await supabase
            .from('products')
            .upsert([{ ...item, material_type: 'unknown' }], { onConflict: 'trendyol_barcode' })
          rowError = malzemesiz
        }

        if (rowError) {
          failed++
          skipped++
          console.error(`Satır yazılamadı (${item.trendyol_barcode}): ${rowError.message}`)
          continue
        }
        if (existingByBarcode.has(item.trendyol_barcode as string)) updated++
        else added++
      }

      if (failed > 0) console.error(`Sayfa ${page}: ${failed} satır yazılamadı`)
    }
  }

  const done = contents.length < size || page >= totalPages - 1

  console.log(
    `Sayfa ${page} tamamlandı: +${added} eklendi, ${updated} güncellendi, ${skipped} atlandı, done=${done}`
  )

  // Pasife çekme ve sync_log kaydı koşu sahibindedir (lib/trendyol/syncRun.ts):
  // tek sayfa değil, koşunun tamamı bittiğinde karar verilmesi gerekiyor.
  return { page, added, updated, skipped, totalPages, totalElements, done, runStartedAt: runStart }
}
