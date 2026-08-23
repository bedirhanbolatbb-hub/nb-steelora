/**
 * Kargonomi'nin desteklediği taşıyıcılar — iade kodu akışının tek kaynağı
 * (Faz 20).
 *
 * NEDEN LİSTE: BB tek firmayla çalışmıyor. Her gönderide Kargonomi o an en
 * uygun firmayı seçiyor, dolayısıyla iade kodunun formatı ve müşteriye
 * söylenecek "nereye bırakacaksınız" cümlesi de siparişten siparişe
 * değişiyor. site_content'te tek bir varsayılan firma tutmak bu yüzden
 * yanlıştı; firma artık SİPARİŞİN GİDİŞ GÖNDERİSİNDEN türetiliyor.
 *
 * `sube` alanı bilerek muhafazakâr: şube ağı olan firmalarda "şubesine",
 * teslim noktası/kurye modeliyle çalışanlarda "teslim noktasına" deniyor —
 * müşteriye olmayan bir şubeyi tarif etmemek için.
 */

export type KargoFirmasi = {
  slug: string
  ad: string
  /** "…paketi <sube> bırakın" cümlesinde kullanılır. */
  sube: string
}

export const KARGO_FIRMALARI: KargoFirmasi[] = [
  { slug: 'aras', ad: 'Aras Kargo', sube: 'Aras Kargo şubesine' },
  { slug: 'surat', ad: 'Sürat Kargo', sube: 'Sürat Kargo şubesine' },
  { slug: 'yurtici', ad: 'Yurtiçi Kargo', sube: 'Yurtiçi Kargo şubesine' },
  { slug: 'ptt', ad: 'PTT Kargo', sube: 'PTT şubesine' },
  { slug: 'hepsijet', ad: 'HepsiJET', sube: 'HepsiJET teslim noktasına' },
  { slug: 'kolaygelsin', ad: 'Kolay Gelsin', sube: 'Kolay Gelsin teslim noktasına' },
  { slug: 'ups', ad: 'UPS', sube: 'UPS servis noktasına' },
  { slug: 'dhl', ad: 'DHL', sube: 'DHL servis noktasına' },
  { slug: 'tnt', ad: 'TNT', sube: 'TNT servis noktasına' },
]

function normalize(deger: string | null | undefined): string {
  return (deger ?? '')
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

/**
 * Slug ya da görünen ad ile firma bulur.
 * Kargonomi'nin slug'ları ("kolaygelsin" / "kolay-gelsin") ve gönderide
 * kayıtlı adlar ("Kolay Gelsin") aynı kayda düşsün diye normalize ediliyor.
 */
export function firmaBul(deger: string | null | undefined): KargoFirmasi | null {
  const n = normalize(deger)
  if (!n) return null
  return (
    KARGO_FIRMALARI.find((f) => normalize(f.slug) === n || normalize(f.ad) === n) ??
    // Kısmi eşleşme: "Aras Kargo A.Ş." gibi uzun adlar için.
    KARGO_FIRMALARI.find((f) => n.includes(normalize(f.slug)) || n.includes(normalize(f.ad))) ??
    null
  )
}

/**
 * Müşteriye söylenecek teslim noktası ifadesi.
 * Listede olmayan bir firma elle girildiyse uydurma yapmadan genel ifade.
 */
export function subeIfadesi(firmaAdi: string | null | undefined): string {
  const firma = firmaBul(firmaAdi)
  if (firma) return firma.sube
  const ad = (firmaAdi ?? '').trim()
  return ad ? `${ad} şubesine` : 'kargo şubesine'
}
