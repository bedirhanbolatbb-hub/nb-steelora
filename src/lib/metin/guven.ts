/**
 * Güven satırının metinleri — TEK KAYNAK (Faz 36).
 *
 * Ürün sayfasının güven şeridi ve sepet çekmecesi aynı vaatleri söyler;
 * ikisi ayrı ayrı elle yazılınca biri "14 gün iade", öteki "Koşulsuz iade"
 * demeye başlıyordu (aynı kusur kargo süresinde yaşandı, bkz. lib/shipping).
 * Kargo vaadi burada değil, lib/shipping.ts'te kalır.
 */
export const GUVEN_METNI = {
  iade: '14 gün iade',
  hediye: 'Hediye kutusu',
  odeme: 'iyzico güvencesi',
} as const
