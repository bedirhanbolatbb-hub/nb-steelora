'use client'

import { useState } from 'react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { izle } from '@/lib/analytics/izle'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return

    // Onay kutusu işaretlenmeden gönderim yapılmaz.
    if (!consent) {
      setStatus('error')
      setMessage('Devam etmek için ticari elektronik ileti onayı gerekiyor.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage', consent: true }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('done')
        // Zaten kayıtlı adres yeni abonelik değildir — sayılmaz.
        if (!data.alreadySubscribed) izle('newsletter_signup')
        // Kupon mesajı sunucudan gelir; kampanya durumuna göre dolu ya da
        // boş olur (Faz 19) — istemci karar vermez, yalnız basar.
        const temel = data.alreadySubscribed
          ? 'Bu adres zaten kayıtlı; teşekkür ederiz.'
          : 'Teşekkür ederiz, aboneliğiniz alındı.'
        setMessage(data.kuponMesaji ? `${temel} ${data.kuponMesaji}` : temel)
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Kayıt oluşturulamadı, lütfen tekrar deneyin.')
      }
    } catch {
      setStatus('error')
      setMessage('Bağlantı kurulamadı, lütfen tekrar deneyin.')
    }
  }

  return (
    <section className="bg-bg">
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-12 lg:py-16 text-center">
        {/* 24 Kas 2026 tasarım denetimi: "ilk siz haberdar olun / ve daha
            fazlası" yerine ne gönderileceğini söyleyen iki cümle. */}
        <h2 className="font-heading text-[24px] lg:text-[32px] font-medium leading-tight text-ink mb-3">
          Yeni ürünleri ve indirimleri e-postayla haber verelim
        </h2>
        <p className="mx-auto mb-6 max-w-md font-body text-[14px] leading-relaxed text-ink-soft">
          Yalnızca yeni ürün ve indirim duyuruları göndeririz. İstediğiniz zaman abonelikten
          çıkabilirsiniz.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="email"
            aria-label="E-posta adresiniz"
            placeholder="E-posta adresiniz"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 min-h-[52px] rounded-[4px]"
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="whitespace-nowrap"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Gönderiliyor…' : 'Abone Ol'}
          </Button>
        </form>

        <label className="flex items-start gap-3 max-w-md mx-auto mt-4 text-left cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked)
              if (e.target.checked && status === 'error') {
                setStatus('idle')
                setMessage('')
              }
            }}
            className="mt-0.5 h-6 w-6 shrink-0 accent-ink"
          />
          <span className="font-body text-[13px] leading-relaxed text-ink-soft">
            Kampanya ve yeni ürün duyuruları için tarafıma ticari elektronik ileti
            gönderilmesine onay veriyorum.{' '}
            <Link prefetch={false} href="/kvkk" className="inline-block py-1.5 -my-1.5 text-ink underline decoration-accent underline-offset-2">
              Aydınlatma Metni
            </Link>
          </span>
        </label>

        {message && (
          <p
            role="status"
            className={`text-[14px] font-body mt-4 ${
              status === 'error' ? 'text-accent-deep' : 'text-ink-soft'
            }`}
          >
            {status === 'done' && <span className="text-accent-deep mr-1">✓</span>}
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
