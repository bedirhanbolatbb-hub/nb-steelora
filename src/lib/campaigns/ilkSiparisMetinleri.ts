/**
 * İlk sipariş kuponu duyurusunun METİN katmanı (Faz 19).
 *
 * Bilerek SAF: hiçbir import'u yok. Böylece hem Next içinden hem de
 * `node --experimental-strip-types` ile koşan simülasyondan aynı anahtarlar
 * ve aynı varsayılan metinler okunabiliyor — simülasyonun metinleri
 * kopyalayıp zamanla üretimden ayrışması engelleniyor.
 */

export const ILK_SIPARIS_ANAHTARLARI = {
  kod: 'ilk_siparis_kupon_kodu',
  serit: 'ilk_siparis_serit_metni',
  sepet: 'ilk_siparis_sepet_metni',
  bulten: 'ilk_siparis_bulten_metni',
} as const

/** site_content boşsa kullanılacak metinler. */
export const ILK_SIPARIS_VARSAYILANLARI: Record<string, string> = {
  [ILK_SIPARIS_ANAHTARLARI.kod]: 'HOSGELDIN10',
  [ILK_SIPARIS_ANAHTARLARI.serit]: 'İlk siparişinize özel %{oran} — kod: {kod}',
  [ILK_SIPARIS_ANAHTARLARI.sepet]: 'İlk siparişinize özel %{oran} indirim — kupon kutusuna {kod} yazın',
  [ILK_SIPARIS_ANAHTARLARI.bulten]: 'Hoş geldiniz! İlk siparişinizde %{oran} indirim: {kod}',
}

export function ilkSiparisMetni(
  anahtar: string,
  icerik: Record<string, string> | undefined,
  kod: string,
  oran: number
): string {
  const sablon = (icerik?.[anahtar] ?? '').trim() || ILK_SIPARIS_VARSAYILANLARI[anahtar] || ''
  return sablon.replaceAll('{kod}', kod).replaceAll('{oran}', String(oran))
}
