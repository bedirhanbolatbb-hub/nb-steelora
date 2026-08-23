'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Input from '@/components/ui/Input'

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Bağlantı önce /auth/callback'e gider: oturum orada kurulur, sonra yeni
    // şifre ekranına aktarılır. Doğrudan /auth/sifremi-sifirla'ya gitmek
    // oturumsuz bir sayfa açıyordu ve şifre güncelleme hata veriyordu (Faz 11).
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/sifremi-sifirla`,
    })

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 text-4xl">✉️</div>
          <h1 className="mb-4 font-heading text-[28px] font-light text-ink">
            E-postanı kontrol et
          </h1>
          {/*
            Adresin kayıtlı olup olmadığı SÖYLENMEZ: "böyle bir üyelik yok"
            demek, sitedeki e-postaları tek tek sınayan hesap sayımı saldırısına
            ve üçüncü kişiye müşteri bilgisi ifşasına (KVKK) kapı açar.
          */}
          <p className="mb-8 font-body text-[13px] leading-relaxed text-ink-soft">
            Bu e-posta ile kayıtlı bir hesap varsa şifre sıfırlama bağlantısını gönderdik. Birkaç
            dakika içinde ulaşmazsa spam klasörünü kontrol edin ya da bu adresle kayıtlı
            olmayabilirsiniz.
          </p>
          <p className="mb-3 font-body text-[13px] text-ink-soft">
            Hesabın yok mu?{' '}
            <Link href="/kayit" className="text-accent-deep transition-colors hover:text-ink">
              Üye ol
            </Link>
          </p>
          <p className="font-body text-[13px]">
            <Link
              href="/giris"
              className="text-accent-deep transition-colors hover:text-ink"
            >
              Giriş sayfasına dön
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <h1 className="font-heading text-[36px] font-light text-ink mb-2 text-center">
          Şifremi Unuttum
        </h1>
        <div className="w-16 h-px bg-accent mx-auto mb-10" />
        <p className="text-[13px] font-body text-ink-soft text-center mb-6">
          E-posta adresinizi girin, şifre sıfırlama linki gönderelim.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="E-posta *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-ink text-bg font-body text-[12px] tracking-[0.15em] uppercase hover:bg-accent transition-colors disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor...' : 'Link Gönder'}
          </button>

          <p className="text-center text-[13px] font-body">
            <Link
              href="/giris"
              className="text-accent-deep hover:text-ink transition-colors"
            >
              Giriş sayfasına dön
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
