/**
 * İndirimden önceki fiyat kuralı — "on gün" (Kasım 2026).
 *
 * MEVZUAT: Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği'nde 1 Temmuz
 * 2026 tarihli ve 33297 sayılı Resmî Gazete ile yapılan değişiklik; 1 Ağustos
 * 2026'dan beri yürürlükte. Mal satışında indirimden önceki fiyat, indirimin
 * başladığı tarihten önceki son on gün içinde, AYNI satış kanalında uygulanan
 * en düşük fiyattır. Şartlı kampanyalar (ilk siparişe kod, sepet koşulu) da
 * aynı kurala tabidir. Aykırılığın idari para cezası 108.370 TL'den başlıyor.
 *
 * PRATİK SONUÇ: site genelindeki bir indirim bittikten sonraki on gün içinde
 * başlayan yeni bir indirim, "önceki fiyat" olarak eski İNDİRİMLİ fiyatı kabul
 * etmek zorundadır — liste fiyatının üstünü çizip "%25" yazamaz. Aynı on gün
 * içinde başka bir indirimi (ör. ilk sipariş kodu) duyurmak da aynı sebeple
 * yanıltıcı sayılır.
 *
 * Ölçülen olay: NB25 31 Ekim 23.59'da bitti. Kasım indirimi bu yüzden en erken
 * 11 Kasım 00.00'da başlayabildi.
 *
 * Saf modül (alias import yok): panel formu, vitrin ve testler aynı hesabı
 * kullanır.
 */

export const ON_GUN_MS = 10 * 86_400_000

/** Türkiye'de yaz saati uygulaması yok: İstanbul sabit UTC+3. */
const TR_OFSET_MS = 3 * 3_600_000

/** Kampanya satırının bu kurala yeten en küçük hâli (DB satırı ya da panel formu). */
export type IndirimSatiri = {
  id?: string | null
  name?: string | null
  type?: string | null
  code?: string | null
  requires_code?: boolean | null
  discount_value?: number | string | null
  min_cart_amount?: number | string | null
  min_item_count?: number | string | null
  scope?: string | null
  first_order_only?: boolean | null
  members_only?: boolean | null
  is_active?: boolean | null
  starts_at?: string | null
  ends_at?: string | null
}

/**
 * Herkese, koşulsuz, otomatik uygulanan bir fiyat indirimi mi?
 *
 * Kartlarda üstü çizili fiyat basan kampanyalar tam olarak bunlar (bkz.
 * hesap.ts · kartFiyatiGosterilsinMi): kod istemez, sepet ya da adet koşulu
 * yok, kapsamı tüm sepet, ilk sipariş ya da üyelik şartı yok. Bunlardan biri
 * yürürlükteyken sitedeki "uygulanan fiyat" fiilen indirimli fiyattır.
 */
export function herkeseIndirimMi(s: IndirimSatiri): boolean {
  if (!['cart_discount', 'item_discount'].includes(String(s.type ?? ''))) return false
  if (s.requires_code) return false
  if ((s.scope ?? 'cart') !== 'cart') return false
  if ((Number(s.min_cart_amount) || 0) > 0) return false
  if ((Number(s.min_item_count) || 0) > 0) return false
  if (s.first_order_only || s.members_only) return false
  return (Number(s.discount_value) || 0) > 0
}

/** Verilen anı İstanbul'un SONRAKİ gece yarısına yuvarlar (an tam gece yarısıysa bir sonrakine). */
export function sonrakiGeceYarisi(an: Date): Date {
  const yerel = new Date(an.getTime() + TR_OFSET_MS)
  const gunBasi = Date.UTC(yerel.getUTCFullYear(), yerel.getUTCMonth(), yerel.getUTCDate())
  return new Date(gunBasi + 86_400_000 - TR_OFSET_MS)
}

/**
 * Önceki indirimin bitişine göre yeni bir indirimin en erken temiz başlangıcı:
 * bitiş + on gün, sonraki İstanbul gece yarısına yuvarlanır.
 * NB25: 31 Ekim 23.59 → 11 Kasım 00.00.
 */
export function enErkenTemizBaslangic(oncekiBitis: Date | string): Date {
  return sonrakiGeceYarisi(new Date(new Date(oncekiBitis).getTime() + ON_GUN_MS))
}

export type OnGunCakismasi = {
  /** Penceredeki indirimin panel adı (operatöre gösterilir). */
  ad: string
  bitis: Date | null
  /** Bitişi belliyse yeni indirimin en erken temiz başlangıcı. */
  enErken: Date | null
}

/**
 * `baslangic` anında başlayacak bir indirim için: başlangıçtan önceki on gün
 * içinde herkese açık başka bir indirim yürürlükte miydi? Öyleyse en geç
 * biteni döner (en erken temiz başlangıç ona göre hesaplanır), değilse null.
 *
 * @param haric Düzenlenen kampanyanın kendisi pencerede sayılmaz.
 */
export function onGunCakismasi(
  baslangic: Date | string,
  satirlar: IndirimSatiri[],
  haric?: string | null
): OnGunCakismasi | null {
  const s = new Date(baslangic).getTime()
  if (!Number.isFinite(s)) return null
  const pencereBas = s - ON_GUN_MS

  let bulunan: OnGunCakismasi | null = null
  let bulunanBitis = -Infinity
  for (const r of satirlar) {
    if (haric && r.id === haric) continue
    if (r.is_active === false) continue
    if (!herkeseIndirimMi(r)) continue
    const bas = r.starts_at ? new Date(r.starts_at).getTime() : -Infinity
    const bit = r.ends_at ? new Date(r.ends_at).getTime() : Infinity
    // Dönem [bas, bit] ile pencere [pencereBas, s) kesişiyor mu?
    if (bit < pencereBas || bas >= s) continue
    if (bit > bulunanBitis) {
      bulunanBitis = bit
      bulunan = {
        ad: String(r.name ?? '').trim() || 'Önceki indirim',
        bitis: Number.isFinite(bit) ? new Date(bit) : null,
        enErken: Number.isFinite(bit) ? enErkenTemizBaslangic(new Date(bit)) : null,
      }
    }
  }
  return bulunan
}

/**
 * Şu an başka bir indirim DUYURULABİLİR mi? Son on gün içinde herkese açık
 * bir indirim yürürlükteyse hayır: duyurulacak oranın dayanağı olan "önceki
 * fiyat" o indirimli fiyat olurdu.
 */
export function indirimDuyurusuSerbestMi(satirlar: IndirimSatiri[], simdi: Date = new Date()): boolean {
  return onGunCakismasi(simdi, satirlar) === null
}
