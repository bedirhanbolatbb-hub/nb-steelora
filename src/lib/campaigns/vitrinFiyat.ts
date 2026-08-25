import type { VitrinIndirimi } from './vitrinIndirimi'

/**
 * ÜRÜN BAŞINA gösterilecek fiyatın TEK KAYNAĞI (Faz 11A).
 *
 * KUSUR: aynı hesap iki yerde ayrı ayrı yazılıydı (ürün kartı ve ürün
 * sayfası), kalan yüzeylerde hiç yoktu. Canlı ölçümde ürün sayfası ₺349,93
 * gösterirken sepet paneli satırı, arama sonuçları ve mobil yapışkan çubuk
 * ₺499,90 (liste fiyatı) gösteriyordu. Müşteri aynı ürün için iki farklı
 * rakam görüyor — güveni en hızlı kıran şey bu.
 *
 * BU DOSYA YALNIZ GÖSTERİMDİR. Tahsil edilen tutar sepetOzeti.ts'ten gelir ve
 * ona dokunulmaz; burası o hesabın müşteriye önden gösterilen izdüşümü.
 *
 * KURAL (22 Ağustos kararı korunuyor):
 *  - KOŞULSUZ kampanya (alt sınır yok, kapsam yok) → her yüzeyde indirimli
 *    fiyat + üstü çizili liste fiyatı.
 *  - KOŞULLU kampanya (min sepet, kategori kapsamı, X al Y öde) → indirimli
 *    fiyat GÖSTERİLMEZ; müşteri tek ürün alırken o fiyata ulaşamaz. Yerine
 *    koşulu anlatan rozet basılır.
 */

export type VitrinFiyat = {
  /** Ekranda büyük basılacak fiyat. */
  gosterilen: number
  /** Doluysa üstü çizili basılır (indirim varken liste fiyatı). */
  ustuCizili: number | null
  /** Doluysa "%30" rozeti basılır. */
  oran: number | null
  /** Koşullu kampanyada basılacak açıklama ("500₺ üzeri %30"). */
  rozet: string | null
  /** İndirim gerçekten uygulanıyor mu (rozet değil, fiyat). */
  indirimliMi: boolean
}

/** Kuruşa yuvarlar — motorla aynı kural. */
function kurus(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * @param listeFiyati Ürünün indirimsiz fiyatı (override_price ?? display_price).
 * @param kampanya    Vitrin genelinde aktif otomatik indirim (context'ten).
 */
export function vitrinFiyati(
  listeFiyati: number | null | undefined,
  kampanya: VitrinIndirimi | null | undefined
): VitrinFiyat {
  const liste = Number(listeFiyati) || 0

  if (kampanya?.fiyatGoster && kampanya.oran) {
    const indirimli = kurus(liste * (1 - kampanya.oran / 100))
    // İndirim fiyatı düşürmüyorsa üstü çizili göstermenin anlamı yok.
    if (indirimli > 0 && indirimli < liste) {
      return {
        gosterilen: indirimli,
        ustuCizili: liste,
        oran: kampanya.oran,
        rozet: null,
        indirimliMi: true,
      }
    }
  }

  return {
    gosterilen: liste,
    ustuCizili: null,
    oran: null,
    // Koşullu kampanyada yalnız rozet: "500₺ üzeri %30" gibi.
    rozet: kampanya?.rozet ?? null,
    indirimliMi: false,
  }
}

/**
 * Sepet satırı gibi ADETLİ yüzeyler için: birim fiyat × adet.
 * Satır toplamı da aynı kuraldan geçsin diye ayrı fonksiyon yok — çağıran
 * taraf `gosterilen * adet` yapar; burada tek ürünün fiyatı belirlenir.
 */
export function vitrinSatirToplami(f: VitrinFiyat, adet: number): {
  gosterilen: number
  ustuCizili: number | null
} {
  const n = Math.max(1, Number(adet) || 1)
  return {
    gosterilen: kurus(f.gosterilen * n),
    ustuCizili: f.ustuCizili != null ? kurus(f.ustuCizili * n) : null,
  }
}
