import { NextResponse } from 'next/server'
import { filtreIcinTemizle } from '@/lib/guvenlik/girdi'
import { createClient } from '@/lib/supabase/server'
import { groupProducts } from '@/lib/catalog/variants'

const RESULT_LIMIT = 8

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const supabase = await createClient()

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
  const kelimeler = q
    .split(/\s+/)
    .map((k) => filtreIcinTemizle(k))
    .filter((k) => k.length >= 2)
    .slice(0, 6)

  // Tek harflik ya da tamamen ayıklanmış girdide eski davranışa düşülür.
  const aranacak = kelimeler.length > 0 ? kelimeler : [filtreIcinTemizle(q)]

  let query = supabase
    .from('products_display')
    .select(
      'id, slug, display_title, display_price, display_images, trendyol_category, trendyol_stock, gender, created_at, variant_label'
    )

  // Zincirlenen `.or()` çağrıları PostgREST'te VE ile birleşir: her kelime
  // kendi içinde üç alana bakar, kelimeler arası koşul VE olur.
  for (const kelime of aranacak) {
    query = query.or(
      `display_title.ilike.%${kelime}%,trendyol_title.ilike.%${kelime}%,trendyol_category.ilike.%${kelime}%`
    )
  }

  const { data } = await query.limit(RESULT_LIMIT * 8)

  const results = groupProducts(data || [])
    .slice(0, RESULT_LIMIT)
    .map((group) => ({ ...group.cover, option_count: group.optionCount }))

  // Aynı sorgu kısa süre içinde tekrar yazıldığında (yaygın: silip yeniden
  // yazma) yanıt kenardan döner. İçerik kişiye özel değil; stok/fiyat
  // değişimi en geç bir dakika sonra yansır.
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
  })
}
