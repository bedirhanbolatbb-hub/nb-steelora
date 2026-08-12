/**
 * Malzeme beyanının tek kanonik kaynağı.
 * material_type dışında bir değer geldiğinde (ör. 'unknown') hiçbir şey
 * basılmaz — malzeme uydurulmaz.
 */
const MATERIAL_LABELS: Record<string, string> = {
  stainless_steel: '316L Paslanmaz Çelik',
  plated_brass: 'Premium Kaplama Pirinç',
}

export function materialLabel(materialType: string | null | undefined): string | null {
  if (!materialType) return null
  return MATERIAL_LABELS[materialType] ?? null
}

/** Malzemeye göre bakım cümlesi; malzeme bilinmiyorsa genel ifade. */
export function materialCare(materialType: string | null | undefined): string {
  if (materialType === 'stainless_steel') {
    return 'Suya, terlemeye ve parfüme dayanıklıdır. Nemli bir bezle silerek temizleyebilirsiniz.'
  }
  if (materialType === 'plated_brass') {
    return 'Kaplama yüzeyi korumak için parfüm, deniz ve havuz suyuyla temastan kaçının; kuru bir bezle silin.'
  }
  return 'Nemli bir bezle silerek temizleyin; parfüm ve kimyasallarla doğrudan temastan kaçının.'
}
