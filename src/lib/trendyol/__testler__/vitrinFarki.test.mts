import { readFileSync } from 'node:fs'
import { DEFTER_ALANLARI, karsilastirilanAlanlar, vitrinFarki } from '../vitrinFarki.ts'

/**
 * Vitrin farkı testleri (25 Kas 2026).
 *
 * Senkron, vitrin önbelleğini artık yalnız görünen bir şey değiştiyse
 * tazeliyor. Burada iki yön de sınanır:
 *  - değişmeyen satır "değişmedi" çıkmalı (yoksa hiçbir şey kazanılmaz),
 *  - değişen HER şey "değişti" çıkmalı; şüpheli her durum da öyle (yoksa
 *    vitrinde eski fiyat kalır).
 */
let gecen = 0
let kalan = 0
const esit = (ad: string, gorulen: unknown, beklenen: unknown) => {
  const tamam = JSON.stringify(gorulen) === JSON.stringify(beklenen)
  if (tamam) gecen++
  else {
    kalan++
    console.error(`✗ ${ad}\n   görülen:  ${JSON.stringify(gorulen)}\n   beklenen: ${JSON.stringify(beklenen)}`)
  }
}

// lib/trendyol/sync.ts'in yazdığı yükün biçimi.
const yuk = (ek: Record<string, unknown> = {}): Record<string, unknown> => ({
  trendyol_barcode: 'NBK024',
  trendyol_title: 'Çelik Kolye',
  trendyol_description: '<p>Açıklama</p>',
  trendyol_price: 464.03,
  trendyol_stock: 11,
  trendyol_images: ['https://ornek.invalid/1.jpg', 'https://ornek.invalid/2.jpg'],
  trendyol_category: 'Kolye',
  variant_label: null,
  is_active: true,
  last_synced_at: '2026-11-25T09:00:00.000Z',
  updated_at: '2026-11-25T09:00:00.000Z',
  gender: 'women',
  material_type: 'steel',
  slug: 'celik-kolye-NBK024',
  trendyol_id: '123456',
  trendyol_model_code: 'NBK024',
  trendyol_color: 'Altın',
  ...ek,
})
// Veritabanındaki satır: dünkü damgalar, gerisi aynı.
const satir = (ek: Record<string, unknown> = {}): Record<string, unknown> => {
  const s = yuk({ last_synced_at: '2026-11-24T09:00:00.000Z', updated_at: '2026-11-24T09:00:00.000Z', ...ek })
  return s
}

// ── 1. Değişmeyen satır
esit('her şey aynı, yalnız damgalar farklı → fark yok', vitrinFarki(satir(), yuk()), [])
esit('fiyat veritabanından metin olarak dönse de aynı', vitrinFarki(satir({ trendyol_price: '464.03' }), yuk()), [])
esit('fiyat 464.030 ile 464.03 aynı', vitrinFarki(satir({ trendyol_price: '464.030' }), yuk()), [])
esit('boş etiket: null ile undefined aynı', vitrinFarki(satir({ variant_label: undefined }), yuk()), [])
esit('görseller aynı sırada aynı', vitrinFarki(satir({ trendyol_images: [...(yuk().trendyol_images as string[])] }), yuk()), [])

// ── 2. Değişen satır
esit('fiyat değişti', vitrinFarki(satir({ trendyol_price: 449.9 }), yuk()), ['trendyol_price'])
esit('stok değişti (11 → 10 da fark: "son 3 ürün" yazısı stoktan gelir)', vitrinFarki(satir({ trendyol_stock: 10 }), yuk()), ['trendyol_stock'])
esit('başlık değişti', vitrinFarki(satir({ trendyol_title: 'Çelik Kolye 45 cm' }), yuk()), ['trendyol_title'])
esit('açıklama değişti', vitrinFarki(satir({ trendyol_description: '<p>Eski</p>' }), yuk()), ['trendyol_description'])
esit('görsel eklendi', vitrinFarki(satir({ trendyol_images: ['https://ornek.invalid/1.jpg'] }), yuk()), ['trendyol_images'])
esit(
  'görsel sırası değişti (kapak görseli değişir)',
  vitrinFarki(satir({ trendyol_images: ['https://ornek.invalid/2.jpg', 'https://ornek.invalid/1.jpg'] }), yuk()),
  ['trendyol_images']
)
esit('kategori değişti', vitrinFarki(satir({ trendyol_category: 'Zincir Kolye' }), yuk()), ['trendyol_category'])
esit('pasif ürün yeniden satışta', vitrinFarki(satir({ is_active: false }), yuk()), ['is_active'])
esit('cinsiyet ilk kez doldu', vitrinFarki(satir({ gender: null }), yuk()), ['gender'])
esit('malzeme ilk kez doldu', vitrinFarki(satir({ material_type: 'unknown' }), yuk()), ['material_type'])
esit('renk değişti', vitrinFarki(satir({ trendyol_color: 'Gümüş' }), yuk()), ['trendyol_color'])
esit('etiket doldu', vitrinFarki(satir(), yuk({ variant_label: '45 cm' })), ['variant_label'])
esit(
  'birden çok alan birlikte',
  vitrinFarki(satir({ trendyol_price: 500, trendyol_stock: 0 }), yuk()),
  ['trendyol_price', 'trendyol_stock']
)

// ── 3. Şüphede "değişti"
esit('mevcut satır yok (yeni ürün)', vitrinFarki(undefined, yuk()), ['(yeni ürün)'])
esit('mevcut satır null', vitrinFarki(null, yuk()), ['(yeni ürün)'])
const okunmayan = satir()
delete okunmayan.trendyol_color
esit('alan veritabanından hiç okunmadıysa ve yükte değer varsa → değişti', vitrinFarki(okunmayan, yuk()), ['trendyol_color'])
esit('sayıya çevrilemeyen fiyat → değişti', vitrinFarki(satir({ trendyol_price: 'yok' }), yuk()), ['trendyol_price'])
esit('boş metin fiyat → değişti', vitrinFarki(satir({ trendyol_price: '' }), yuk()), ['trendyol_price'])
esit('stok 1 ile mantıksal true aynı SAYILMAZ', vitrinFarki(satir({ trendyol_stock: true }), yuk({ trendyol_stock: 1 })), ['trendyol_stock'])
esit('boş metin ile null aynı SAYILMAZ', vitrinFarki(satir({ trendyol_color: '' }), yuk({ trendyol_color: null })), ['trendyol_color'])
esit('stok 0 ile null aynı SAYILMAZ', vitrinFarki(satir({ trendyol_stock: null }), yuk({ trendyol_stock: 0 })), ['trendyol_stock'])

// ── 4. Yüke yeni alan eklenirse kendiliğinden karşılaştırılır
esit('yükteki yeni alan, satırda yoksa → değişti', vitrinFarki(satir(), yuk({ yeni_alan: 'x' })), ['yeni_alan'])
esit('defter alanları karşılaştırılmaz', [...DEFTER_ALANLARI], ['last_synced_at', 'updated_at'])
esit(
  'karşılaştırılan alanlar: yükün tamamı, defter alanları hariç',
  karsilastirilanAlanlar(yuk()).sort(),
  Object.keys(yuk())
    .filter((a) => a !== 'last_synced_at' && a !== 'updated_at')
    .sort()
)
esit('barkod karşılaştırma okumasında var (satırlar onunla eşlenir)', karsilastirilanAlanlar(yuk()).includes('trendyol_barcode'), true)

// ── 5. Kaynak denetimi: bu testteki yük, sync.ts'in gerçekten yazdığı alanlarla aynı mı?
// sync.ts yüke alan ekler ya da çıkarırsa bu test kırılır ve yukarıdaki örnek güncellenir.
const kaynak = readFileSync(new URL('../sync.ts', import.meta.url), 'utf8')
const blok = kaynak.slice(kaynak.indexOf('payload.push({'), kaynak.indexOf('const yazilan = payload[payload.length - 1]'))
const kaynakAlanlari = [...blok.matchAll(/^\s{6}(?:\.\.\.\(\w+ \? \{ )?([a-z_]+):/gm)].map((m) => m[1])
esit('örnek yük, sync.ts yüküyle aynı alanları taşır', [...new Set(kaynakAlanlari)].sort(), Object.keys(yuk()).sort())
// Karşılaştırma yazımdan ÖNCE yapılmalı; sonra yapılırsa veritabanı yüke eşit olur ve fark hiç çıkmaz.
const farkYeri = kaynak.indexOf('await sayfaVitrinFarki(supabase, payload)')
const yazimYeri = kaynak.indexOf(".upsert(payload, { onConflict: 'trendyol_barcode' })")
esit('karşılaştırma toplu yazımdan önce yapılır', farkYeri > 0 && yazimYeri > 0 && farkYeri < yazimYeri, true)
// Slug'ı koruyan okuma karşılaştırma için genişletilmemeli (bkz. sync.ts → sayfaVitrinFarki).
esit(
  'slug okumasına kolon eklenmedi',
  kaynak.includes("'id, trendyol_barcode, gender, material_type, slug, trendyol_id, trendyol_price, trendyol_stock'"),
  true
)

console.log(`\n  ${gecen} geçti, ${kalan} kaldı`)
process.exit(kalan ? 1 : 0)
