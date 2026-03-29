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

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/sifremi-sifirla`,
    })

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl mb-6">✉️</div>
          <h1 className="font-heading text-[28px] font-light text-text-primary mb-4">
            E-posta Gönderildi
          </h1>
          <p className="text-[13px] font-body text-text-secondary mb-6">
            Şifre sıfırlama linki <strong>{email}</strong> adresine gönderildi.
          </p>
          <Link
            href="/giris"
            className="text-gold hover:text-gold-light text-[12px] font-body transition-colors"
          >
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <h1 className="font-heading text-[36px] font-light text-text-primary mb-2 text-center">
          Şifremi Unuttum
        </h1>
        <div className="w-16 h-px bg-gold mx-auto mb-10" />
        <p className="text-[13px] font-body text-text-secondary text-center mb-6">
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
            className="w-full py-4 bg-dark text-champagne font-body text-[12px] tracking-[0.15em] uppercase hover:bg-gold transition-colors disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor...' : 'Link Gönder'}
          </button>

          <p className="text-center text-[13px] font-body">
            <Link
              href="/giris"
              className="text-gold hover:text-gold-light transition-colors"
            >
              Giriş sayfasına dön
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
