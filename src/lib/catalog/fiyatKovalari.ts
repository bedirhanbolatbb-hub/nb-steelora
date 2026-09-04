/**
 * Fiyat filtresi kovaları — GERÇEK fiyatlardan türetilir (Faz 11A).
 *
 * KUSUR: kovalar kodda sabitti (0–200, 200–500, 500–1000, 1000+) ama katalog
 * 279–649 ₺ bandında. Dördün ÜÇÜ hiçbir zaman sonuç vermiyordu; müşteri
 * tıklıyor, boş liste görüyordu. Kampanya girip fiyatlar düşünce sabit
 * kovalar bir kez daha yanlışa düşecekti.
 *
 * Artık kovalar listedeki fiyatların min/max'ından türer ve BOŞ KOVA BASILMAZ.
 */

export type FiyatKovasi = { label: string; min: string; max: string }

const tl = (n: number) => Math.round(n).toLocaleString('tr-TR')

/** Yuvarlak bir basamağa yuvarlar: 279 → 250, 649 → 700. */
function yuvarla(n: number, yukari: boolean): number {
  const adim = n >= 1000 ? 250 : 50
  return yukari ? Math.ceil(n / adim) * adim : Math.floor(n / adim) * adim
}

/**
 * @param fiyatlar Listede GÖSTERİLEN fiyatlar (indirim varsa indirimli).
 * @param kovaSayisi En fazla kaç aralık üretilsin.
 */
export function fiyatKovalari(fiyatlar: number[], kovaSayisi = 3): FiyatKovasi[] {
  const temiz = fiyatlar.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
  const hepsi: FiyatKovasi = { label: 'Tümü', min: '', max: '' }
  // İki fiyattan az varsa aralık üretmenin anlamı yok.
  if (temiz.length < 2) return [hepsi]

  const enAz = yuvarla(temiz[0], false)
  const enCok = yuvarla(temiz[temiz.length - 1], true)
  if (enCok - enAz < 50) return [hepsi]

  const n = Math.max(2, Math.min(kovaSayisi, 4))
  const genislik = Math.ceil((enCok - enAz) / n / 50) * 50
  const kovalar: FiyatKovasi[] = [hepsi]

  for (let i = 0; i < n; i++) {
    const alt = enAz + i * genislik
    const ust = i === n - 1 ? enCok : alt + genislik
    if (alt >= enCok) break
    // Kova gerçekten ürün içeriyor mu? İçermiyorsa basılmaz.
    const doluMu = temiz.some((f) => f >= alt && (i === n - 1 ? true : f < ust))
    if (!doluMu) continue
    kovalar.push({
      label: i === n - 1 ? `${tl(alt)} ₺ üzeri` : `${tl(alt)} — ${tl(ust)} ₺`,
      min: String(alt),
      max: i === n - 1 ? '' : String(ust),
    })
  }

  return kovalar.length > 1 ? kovalar : [hepsi]
}

/**
 * Gösterilen fiyattan LİSTE fiyatına döner (Faz 11A-FIX · F5).
 *
 * KUSUR: kovalar liste fiyatından türüyordu ("200 — 350 ₺") ama kartta yazan
 * fiyat kampanyalı hâliydi (%30 indirimle 195 ₺). Müşteri 195 ₺'lik ürünü
 * "200 — 350" kovasında arıyordu. Artık kovalar GÖSTERİLEN fiyattan türer;
 * sorgu hâlâ liste fiyatı kolonunda çalıştığı için sınırlar burada geri
 * çevrilir.
 */
export function listeFiyatina(gosterilen: number, oran: number | null | undefined): number {
  const o = Number(oran) || 0
  if (!Number.isFinite(gosterilen)) return gosterilen
  if (o <= 0 || o >= 100) return gosterilen
  return gosterilen / (1 - o / 100)
}

/** Kampanya oranı uygulanmış gösterim fiyatı — vitrinFiyat.ts ile aynı kural. */
export function gosterilenFiyat(liste: number, oran: number | null | undefined): number {
  const o = Number(oran) || 0
  const l = Number(liste) || 0
  if (o <= 0 || o >= 100) return l
  return Math.round(l * (1 - o / 100) * 100) / 100
}
