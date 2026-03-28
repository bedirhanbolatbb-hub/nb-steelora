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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#B8952A"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <p className="text-[11px] font-body text-text-muted uppercase tracking-wider mb-1">
                  WhatsApp
                </p>
                <a
                  href="https://wa.me/905536552020"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-body text-text-primary hover:text-gold transition-colors"
                >
                  WhatsApp ile Yazın
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
