'use client'

import { useState } from 'react'
import { Mail, MapPin, Clock } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function IletisimPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setStatus('success')
        setForm({ name: '', email: '', subject: '', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-16">
      <h1 className="font-heading text-[36px] font-light text-text-primary mb-2">
        İletişim
      </h1>
      <div className="w-16 h-px bg-gold mb-10" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Sol: Bilgiler */}
        <div>
          <p className="text-[13px] font-body text-text-secondary leading-relaxed mb-8">
            Sorularınız, önerileriniz veya sipariş ile ilgili talepleriniz için bize
            ulaşabilirsiniz. En kısa sürede size dönüş yapacağız.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-champagne-dark flex items-center justify-center shrink-0">
                <Mail size={16} className="text-gold" />
              </div>
              <div>
                <p className="text-[11px] font-body text-text-muted uppercase tracking-wider mb-1">
                  E-posta
                </p>
                <a
                  href="mailto:info@nbsteelora.com"
                  className="text-[13px] font-body text-text-primary hover:text-gold transition-colors"
                >
                  info@nbsteelora.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-champagne-dark flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-gold" />
              </div>
              <div>
                <p className="text-[11px] font-body text-text-muted uppercase tracking-wider mb-1">
                  Konum
                </p>
                <p className="text-[13px] font-body text-text-primary">
                  Mezitli / Mersin / Türkiye
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-champagne-dark flex items-center justify-center shrink-0">
                <Clock size={16} className="text-gold" />
              </div>
              <div>
                <p className="text-[11px] font-body text-text-muted uppercase tracking-wider mb-1">
                  Çalışma Saatleri
                </p>
                <p className="text-[13px] font-body text-text-primary">
                  Pazartesi — Cuma: 09:00 — 18:00
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ: Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Ad Soyad *"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
          <Input
            placeholder="E-posta *"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />
          <Input
            placeholder="Konu"
            value={form.subject}
            onChange={(e) => updateField('subject', e.target.value)}
          />
          <textarea
            placeholder="Mesajınız *"
            value={form.message}
            onChange={(e) => updateField('message', e.target.value)}
            required
            rows={5}
            className="w-full border border-champagne-mid bg-white px-4 py-3 text-sm font-body text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors resize-none"
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Gönderiliyor...' : 'Mesaj Gönder'}
          </Button>

          {status === 'success' && (
            <p className="text-[12px] font-body text-green-700 text-center">
              Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.
            </p>
          )}
          {status === 'error' && (
            <p className="text-[12px] font-body text-red-600 text-center">
              Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin veya doğrudan
              info@nbsteelora.com adresine yazın.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
