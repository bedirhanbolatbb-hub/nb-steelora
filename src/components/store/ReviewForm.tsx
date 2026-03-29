'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'

interface ReviewFormProps {
  productId: string
  onSuccess: () => void
}

export default function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [form, setForm] = useState({
    title: '',
    body: '',
    guest_name: '',
    guest_email: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isUser, setIsUser] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsUser(!!user)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rating === 0) {
      setError('Lütfen bir puan seçin')
      return
    }
    if (form.body.trim().length < 10) {
      setError('Yorumunuz en az 10 karakter olmalı')
      return
    }

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const reviewData: any = {
      product_id: productId,
      rating,
      title: form.title || null,
      body: form.body,
      is_approved: true,
    }

    if (user) {
      reviewData.user_id = user.id
    } else {
      if (!form.guest_name.trim() || !form.guest_email.trim()) {
        setError('Lütfen adınızı ve e-postanızı girin')
        setLoading(false)
        return
      }
      reviewData.guest_name = form.guest_name
      reviewData.guest_email = form.guest_email
    }

    const { error: insertError } = await supabase
      .from('reviews')
      .insert(reviewData)

    if (insertError) {
      setError('Yorum gönderilirken hata oluştu')
      setLoading(false)
      return
    }

    onSuccess()
    setLoading(false)
  }

  const displayRating = hoverRating || rating
  const ratingLabels = ['', 'Çok Kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel']

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Star picker */}
      <div>
        <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-2">
          Puanınız *
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <svg
                className={`w-8 h-8 transition-colors ${
                  star <= displayRating
                    ? 'fill-gold text-gold'
                    : 'fill-none text-champagne-mid'
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
            </button>
          ))}
          {displayRating > 0 && (
            <span className="ml-2 text-[12px] font-body text-text-muted">
              {ratingLabels[displayRating]}
            </span>
          )}
        </div>
      </div>

      {/* Guest fields */}
      {!isUser && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-2">
              Adınız *
            </label>
            <Input
              type="text"
              placeholder="Ad Soyad"
              value={form.guest_name}
              onChange={(e) =>
                setForm({ ...form, guest_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-2">
              E-posta *
            </label>
            <Input
              type="email"
              placeholder="ornek@mail.com"
              value={form.guest_email}
              onChange={(e) =>
                setForm({ ...form, guest_email: e.target.value })
              }
            />
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-2">
          Başlık (isteğe bağlı)
        </label>
        <Input
          type="text"
          placeholder="Yorumunuzun başlığı..."
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          maxLength={100}
        />
      </div>

      {/* Body */}
      <div>
        <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-2">
          Yorumunuz *
        </label>
        <textarea
          placeholder="Ürün hakkında düşüncelerinizi paylaşın..."
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          required
          rows={4}
          maxLength={1000}
          className="w-full border border-champagne-mid bg-white px-4 py-3 text-sm font-body text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors resize-none"
        />
        <p className="text-[10px] font-body text-text-muted mt-1 text-right">
          {form.body.length}/1000
        </p>
      </div>

      {error && <p className="text-red-500 text-[12px] font-body">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="py-3 px-8 bg-dark text-champagne text-[11px] tracking-[0.15em] uppercase font-body hover:bg-gold transition-colors disabled:opacity-50"
      >
        {loading ? 'Gönderiliyor...' : 'Yorum Gönder'}
      </button>
    </form>
  )
}
