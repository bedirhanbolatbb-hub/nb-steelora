'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('done')
        setMessage(
          data.alreadySubscribed
            ? 'Bu adres zaten kayıtlı — teşekkürler.'
            : 'Teşekkürler, aboneliğiniz alındı.'
        )
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
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-20 text-center">
        <h2 className="font-heading text-[32px] text-ink mb-3">
          Yeni koleksiyonlardan ilk siz haberdar olun
        </h2>
        <p className="text-[12px] font-body text-muted mb-8">
          Özel kampanyalar, yeni ürünler ve daha fazlası için abone olun.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="E-posta adresiniz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            className="whitespace-nowrap"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Gönderiliyor…' : 'Abone Ol'}
          </Button>
        </form>

        {message && (
          <p
            role="status"
            className={`text-[12px] font-body mt-4 ${
              status === 'error' ? 'text-accent-deep' : 'text-ink-soft'
            }`}
          >
            {status === 'done' && <span className="text-accent mr-1">✓</span>}
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
