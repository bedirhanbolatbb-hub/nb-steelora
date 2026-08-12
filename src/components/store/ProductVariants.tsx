import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getGroupKey, hasDistinctLabels, normalizeTitle } from '@/lib/catalog/variants'

type Props = {
  product: any
}

/**
 * Aynı gruptaki (başlık + kategori + fiyat + gender) diğer ürünler.
 * Seçim, üyenin kendi sayfasına normal bir bağlantıyla gider: URL değişir,
 * geçmişe eklenir, her ürünün kendi sayfası erişilir kalır.
 * Sepete ekleme her zaman görüntülenen tekil ürünün id'si ile yapılır.
 */
export default async function ProductVariants({ product }: Props) {
  const supabase = await createClient()

  // Önce ucuz eşitliklerle aday kümesi, sonra normalize başlıkla kesin eşleşme.
  let query = supabase
    .from('products_display')
    .select('id, slug, display_title, display_images, display_price, trendyol_stock, trendyol_category, gender, created_at, variant_label')
    .eq('display_price', product.display_price)

  query = product.trendyol_category
    ? query.eq('trendyol_category', product.trendyol_category)
    : query.is('trendyol_category', null)

  query = product.gender ? query.eq('gender', product.gender) : query.is('gender', null)

  const { data: candidates } = await query

  const key = getGroupKey(product)
  const members = (candidates || [])
    .filter((c: any) => getGroupKey(c) === key)
    .sort((a: any, b: any) => {
      const labelA = (a.variant_label ?? '').trim()
      const labelB = (b.variant_label ?? '').trim()
      if (labelA && labelB) return labelA.localeCompare(labelB, 'tr', { numeric: true })
      return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    })

  if (members.length < 2) return null

  const useLabels = hasDistinctLabels(members)

  return (
    <div className="mt-6">
      <p className="text-[10px] uppercase tracking-[0.2em] font-body text-muted mb-3">
        Diğer seçenekler ({members.length})
      </p>

      {useLabels ? (
        <div className="flex flex-wrap gap-2">
          {members.map((member: any) => {
            const isCurrent = member.id === product.id
            const outOfStock = member.trendyol_stock === 0
            return (
              <Link
                key={member.id}
                href={`/urun/${member.slug}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`px-3 py-1.5 text-[12px] font-body border transition-colors ${
                  isCurrent
                    ? 'border-accent text-accent'
                    : 'border-line text-ink-soft hover:border-accent hover:text-accent'
                } ${outOfStock ? 'opacity-40' : ''}`}
              >
                {member.variant_label}
                {outOfStock && <span className="ml-1 text-[10px]">· tükendi</span>}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {members.map((member: any) => {
            const isCurrent = member.id === product.id
            const outOfStock = member.trendyol_stock === 0
            const image = member.display_images?.[0]
            return (
              <Link
                key={member.id}
                href={`/urun/${member.slug}`}
                aria-current={isCurrent ? 'page' : undefined}
                title={normalizeTitle(member.display_title) ? member.display_title : undefined}
                className={`relative w-16 h-20 shrink-0 bg-surface-muted overflow-hidden border-2 transition-colors ${
                  isCurrent ? 'border-accent' : 'border-transparent hover:border-line'
                }`}
              >
                {image && (
                  <Image
                    src={image}
                    alt={member.display_title}
                    fill
                    className={`object-cover ${outOfStock ? 'opacity-40' : ''}`}
                    sizes="64px"
                  />
                )}
                {outOfStock && (
                  <span className="absolute inset-x-0 bottom-0 bg-ink/70 text-bg text-[8px] text-center py-0.5 font-body">
                    Tükendi
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
