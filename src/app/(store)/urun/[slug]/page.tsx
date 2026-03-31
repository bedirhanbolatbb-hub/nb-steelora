import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import ProductImageGallery from '@/components/store/ProductImageGallery'
import AddToCartButton from '@/components/store/AddToCartButton'
import RelatedProducts from '@/components/store/RelatedProducts'
import ReviewList from '@/components/store/ReviewList'
import RecentlyViewedTracker from '@/components/store/RecentlyViewedTracker'
import RecentlyViewed from '@/components/store/RecentlyViewed'

export default async function UrunDetayPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products_display')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!product) notFound()

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Görsel galerisi */}
        <ProductImageGallery
          images={product.display_images || []}
          title={product.display_title}
        />

        {/* Ürün bilgisi */}
        <div>
          {product.trendyol_category && (
            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-body mb-2">
              {product.trendyol_category}
            </p>
          )}
          <h1 className="font-heading text-[32px] lg:text-[40px] font-light text-text-primary mb-4">
            {product.display_title}
          </h1>
          <div className="flex items-center gap-3 mb-8">
            <p className="text-[24px] font-body text-gold font-medium">
              {formatPrice(product.custom_price ?? product.display_price)}
            </p>
            {product.custom_price && product.custom_price < product.display_price && (
              <p className="text-[16px] font-body text-text-muted line-through">
                {formatPrice(product.display_price)}
              </p>
            )}
          </div>

          {/* Stok durumu */}
          {product.trendyol_stock > 0 ? (
            <p className="text-[12px] text-green-700 font-body mb-6">
              ✓ Stokta var
            </p>
          ) : (
            <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] font-body px-4 py-3 mb-6 text-center">
              Stok Tükendi — Bu ürün şu anda mevcut değil
            </div>
          )}

          {/* Sepete ekle */}
          <AddToCartButton
            product={product}
            disabled={product.trendyol_stock === 0}
          />

          {/* Açıklama */}
          {(product.override_description || product.trendyol_description) && (
            <div className="mt-8 text-[13px] font-body text-text-secondary leading-relaxed">
              <p>{product.override_description || product.trendyol_description}</p>
            </div>
          )}

          {/* Güven rozetleri */}
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-champagne-mid pt-6">
            <div className="text-center">
              <p className="text-[16px] mb-1">🚚</p>
              <p className="text-[10px] font-body text-text-secondary font-medium">
                Ücretsiz Kargo
              </p>
              <p className="text-[9px] font-body text-text-muted">500₺ üzeri</p>
            </div>
            <div className="text-center">
              <p className="text-[16px] mb-1">🔒</p>
              <p className="text-[10px] font-body text-text-secondary font-medium">
                Güvenli Ödeme
              </p>
              <p className="text-[9px] font-body text-text-muted">
                SSL + 3D Secure
              </p>
            </div>
            <div className="text-center">
              <p className="text-[16px] mb-1">↩️</p>
              <p className="text-[10px] font-body text-text-secondary font-medium">
                Kolay İade
              </p>
              <p className="text-[9px] font-body text-text-muted">14 gün içinde</p>
            </div>
          </div>
        </div>
      </div>

      {/* Yorumlar */}
      <ReviewList productId={product.id} />

      {/* İlgili Ürünler */}
      <RelatedProducts
        productId={product.id}
        category={product.trendyol_category || ''}
      />

      {/* Son Görüntülenenler */}
      <RecentlyViewedTracker slug={slug} />
      <RecentlyViewed currentSlug={slug} />
    </div>
  )
}
