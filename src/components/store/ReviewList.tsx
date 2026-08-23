'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReviewForm from './ReviewForm'

function StarRating({
  rating,
  size = 'sm',
}: {
  rating: number
  size?: 'sm' | 'lg'
}) {
  const cls = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${cls} ${
            star <= rating
              ? 'fill-accent-line text-accent-deep'
              : 'fill-none text-line'
          }`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
    </div>
  )
}

/** "Ayşe Kaya" → "Ayşe K." — soyadı yayınlanmaz. */
function maskName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Müşteri'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toLocaleUpperCase('tr')}.`
}

export default function ReviewList({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClient()

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    setReviews(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchReviews()
  }, [productId])

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percent:
      reviews.length > 0
        ? Math.round(
            (reviews.filter((r) => r.rating === star).length /
              reviews.length) *
              100
          )
        : 0,
  }))

  const handleSuccess = () => {
    setSubmitted(true)
    setShowForm(false)
    fetchReviews()
  }

  return (
    <div id="yorum" className="mt-16 pt-16 border-t border-line scroll-mt-24">
      <h2 className="font-heading text-[28px] font-light text-ink mb-8">
        Müşteri <span className="italic text-accent-deep">Yorumları</span>
      </h2>

      {/* Summary */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 mb-10 pb-10 border-b border-line">
          <div className="text-center sm:text-left">
            <div className="font-heading text-[56px] font-light text-ink leading-none">
              {avgRating.toFixed(1)}
            </div>
            <StarRating rating={Math.round(avgRating)} size="lg" />
            <p className="text-muted text-[12px] font-body mt-1">
              {reviews.length} değerlendirme
            </p>
          </div>
          <div className="flex-1 max-w-xs space-y-2">
            {ratingCounts.map(({ star, count, percent }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-[11px] font-body text-muted w-3">
                  {star}
                </span>
                <svg
                  className="w-3 h-3 fill-accent-line shrink-0"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                <div className="flex-1 bg-line rounded-full h-1.5">
                  <div
                    className="bg-accent rounded-full h-1.5 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-[11px] font-body text-muted w-4 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Henüz onaylı yorum yoksa yıldız/özet hiç basılmaz, davet satırı çıkar */}
      {!loading && reviews.length === 0 && !submitted && (
        <p className="mb-6 text-[13px] font-body text-ink-soft">
          Bu ürün için henüz değerlendirme yok.{' '}
          <button
            onClick={() => setShowForm(true)}
            className="text-accent-deep underline underline-offset-2"
          >
            İlk değerlendirmeyi sen yaz
          </button>
        </p>
      )}

      {/* Write review button / form */}
      {!showForm && !submitted && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-8 py-3 px-8 border border-ink text-ink text-[11px] tracking-[0.15em] uppercase font-body hover:bg-ink hover:text-bg transition-colors"
        >
          Değerlendirme Yaz
        </button>
      )}

      {submitted && (
        <div className="mb-8 p-4 bg-surface border border-accent-line/50 text-ink text-[12px] font-body">
          <span className="text-accent-deep mr-1">✓</span>
          Teşekkürler! Değerlendirmen onaydan sonra yayınlanır.
        </div>
      )}

      {showForm && (
        <div className="mb-10 p-6 bg-surface-muted/30 border border-line">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-heading text-[20px] font-light text-ink">
              Yorum Yaz
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-muted hover:text-ink text-[12px] font-body transition-colors"
            >
              İptal
            </button>
          </div>
          <ReviewForm productId={productId} onSuccess={handleSuccess} />
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse p-4 border border-line"
            >
              <div className="h-4 bg-line rounded w-24 mb-2" />
              <div className="h-3 bg-line rounded w-full mb-1" />
              <div className="h-3 bg-line rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? null : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="pb-6 border-b border-line/50 last:border-0"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={review.rating} />
                    {review.is_verified_purchase && (
                      <span className="text-[9px] font-body text-accent-deep border border-accent-line/50 px-1.5 py-0.5 rounded-[2px]">
                        Doğrulanmış alışveriş
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <p className="font-body text-[13px] font-medium text-ink">
                      {review.title}
                    </p>
                  )}
                </div>
                <span className="text-[11px] font-body text-muted">
                  {new Date(review.created_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
              <p className="text-ink-soft text-[13px] font-body leading-relaxed mb-2">
                {review.body}
              </p>
              <p className="text-[11px] font-body text-muted">
                {maskName(review.guest_name)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
