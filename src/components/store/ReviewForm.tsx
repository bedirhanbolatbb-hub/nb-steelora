'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import { dugmeSinifi } from '@/components/ui/Button'

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
    website: '', // honeypot
  })
  const [loading, setLoading] = useState(false)
  // Faz 11D: isteğe bağlı müşteri fotoğrafı — sunucuda yeniden kodlanır,
  // onaylanana kadar hiçbir sayfada görünmez.
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoHata, setFotoHata] = useState('')
  const [error, setError] = useState('')
  // 8 Kas 2026: oturum kontrolü (auth.getUser) kaldırıldı — sonucu hiçbir
  // yerde kullanılmıyordu, ama form her açıldığında Supabase kütüphanesini
  // indirip kimlik sunucusuna istek atıyordu.

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

    if (!form.guest_name.trim() || !form.guest_email.trim()) {
      setError('Lütfen adınızı ve e-postanızı girin')
      return
    }

    setLoading(true)

    // Fotoğraf önce kendi ucumuza yüklenir (sunucu yeniden kodlar); dönen URL
    // yorumla birlikte gider. Yükleme başarısızsa yorum FOTOĞRAFSIZ da gitsin —
    // metin fotoğrafa kurban edilmez.
    let photoUrl: string | null = null
    if (foto) {
      try {
        const fd = new FormData()
        fd.append('foto', foto)
        const fr = await fetch('/api/reviews/foto', { method: 'POST', body: fd })
        const fj = await fr.json()
        if (fr.ok && fj.url) photoUrl = fj.url
        else setFotoHata(fj.error || 'Fotoğraf yüklenemedi — yorum fotoğrafsız gönderildi')
      } catch {
        setFotoHata('Fotoğraf yüklenemedi — yorum fotoğrafsız gönderildi')
      }
    }

    // Kayıt /api/reviews üzerinden geçer: reviews tablosuna doğrudan yazım
    // RLS ile kapalı ve her yorum onay bekler.
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          title: form.title || null,
          body: form.body,
          name: form.guest_name,
          email: form.guest_email,
          website: form.website, // honeypot — dolu gelirse sunucu sessizce yok sayar
          photoUrl,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Yorum gönderilirken hata oluştu')
        setLoading(false)
        return
      }
    } catch {
      setError('Bağlantı kurulamadı, lütfen tekrar deneyin')
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
        <p id="puan-etiketi" className="mb-1 font-body text-[13px] text-ink-soft">
          Puanınız <span aria-hidden className="text-accent-deep">*</span>
        </p>
        <div role="group" aria-labelledby="puan-etiketi" className="-ml-1.5 flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${star} yıldız`}
              aria-pressed={rating === star}
              className="flex h-11 w-11 items-center justify-center"
            >
              <svg
                className={`w-8 h-8 transition-colors ${
                  star <= displayRating
                    ? 'fill-accent-line text-accent-line'
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
            </button>
          ))}
          {displayRating > 0 && (
            <span className="ml-2 text-[13px] font-body text-ink-soft">
              {ratingLabels[displayRating]}
            </span>
          )}
        </div>
      </div>

      {/* İsim ve e-posta: e-posta yayınlanmaz, yalnız doğrulanmış alışveriş
          eşleşmesi ve moderasyon için tutulur. */}
      {
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="text"
            etiket="Adınız"
            ipucu="Yorumda adınız ve soyadınızın baş harfi görünür (ör. Ayşe K.)."
            autoComplete="name"
            required
            value={form.guest_name}
            onChange={(e) =>
              setForm({ ...form, guest_name: e.target.value })
            }
          />
          <Input
            type="email"
            etiket="E-posta"
            ipucu="Yayınlanmaz."
            inputMode="email"
            autoComplete="email"
            placeholder="ornek@eposta.com"
            required
            value={form.guest_email}
            onChange={(e) =>
              setForm({ ...form, guest_email: e.target.value })
            }
          />
        </div>
      }

      {/* Honeypot — ekranda görünmez, yalnız botlar doldurur */}
      <div className="absolute left-[-9999px] w-px h-px overflow-hidden" aria-hidden="true">
        <label>
          Web sitesi
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </label>
      </div>

      {/* Title */}
      <Input
        type="text"
        etiket="Başlık (isteğe bağlı)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        maxLength={100}
      />

      {/* Body */}
      <div>
        <label htmlFor="yorum-metni" className="mb-1.5 block font-body text-[13px] text-ink-soft">
          Yorumunuz <span aria-hidden className="text-accent-deep">*</span>
        </label>
        <textarea
          id="yorum-metni"
          placeholder="Ürünü nasıl buldunuz? En az 10 karakter."
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          required
          rows={4}
          maxLength={1000}
          className="w-full border border-line-strong bg-white px-4 py-3 text-base sm:text-sm font-body text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-colors resize-none"
        />
        <p className="text-[12px] font-body text-muted mt-1 text-right">
          {form.body.length}/1000
        </p>
      </div>

      {error && <p role="alert" className="text-[13px] font-body text-red-700">{error}</p>}

            {/* Fotoğraf (isteğe bağlı) — Faz 11D */}
      <div className="mb-4">
        <label htmlFor="yorum-foto" className="mb-1.5 block font-body text-[13px] text-ink-soft">
          Fotoğraf (isteğe bağlı)
        </label>
        <input
          id="yorum-foto"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            setFotoHata('')
            if (f && f.size > 6 * 1024 * 1024) {
              setFotoHata('Fotoğraf en fazla 6 MB olabilir')
              setFoto(null)
              e.target.value = ''
              return
            }
            setFoto(f)
          }}
          className="block w-full text-[13px] font-body text-ink-soft file:mr-3 file:rounded-[4px] file:border file:border-line file:bg-bg file:px-4 file:py-2.5 file:font-body file:text-[13px] file:text-ink"
        />
        <p className="mt-1 text-[12px] font-body text-muted">
          Ürünün sizdeki hâli — onaylandıktan sonra yorumunuzla birlikte görünür.
        </p>
        {fotoHata && <p className="mt-1 text-[13px] font-body text-red-700">{fotoHata}</p>}
      </div>

<button
        type="submit"
        disabled={loading}
        className={dugmeSinifi('primary', 'md', 'w-full sm:w-auto')}
      >
        {loading ? 'Gönderiliyor…' : 'Değerlendirmeyi gönder'}
      </button>

      <p className="text-[12px] font-body text-muted">
        Değerlendirmeler yayınlanmadan önce incelenir.
      </p>
    </form>
  )
}
