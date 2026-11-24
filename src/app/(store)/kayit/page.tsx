'use client'

import { useState } from 'react'
import UyelikTesvikSatiri from '@/components/store/UyelikTesvikSatiri'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import DogrulamaTekrarGonder from '@/components/store/DogrulamaTekrarGonder'
import { izle } from '@/lib/analytics/izle'

export default function KayitPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Şifreler eşleşmiyor')
      return
    }
    if (form.password.length < 6) {
      setError('Şifre en az 6 karakter olmalı')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      setError(
        error.message === 'User already registered'
          ? 'Bu e-posta zaten kayıtlı'
          : 'Kayıt sırasında hata oluştu'
      )
      setLoading(false)
      return
    }

    // Ölçüm, doğrulama e-postası GÖNDERİLDİĞİ anda yazılır; hesabın
    // onaylanması ayrı bir adım (bkz. /auth/confirm).
    izle('signup')
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 text-4xl">✉️</div>
          <h1 className="mb-4 font-heading text-[28px] font-light text-ink">
            E-postanızı kontrol edin
          </h1>
          <p className="mb-2 font-body text-[13px] leading-relaxed text-ink-soft">
            <strong className="text-ink">{form.email}</strong> adresine doğrulama bağlantısı
            gönderdik. Bağlantıya tıkladığınızda hesabınız açılır.
          </p>
          <p className="mb-8 font-body text-[12px] leading-relaxed text-muted">
            Birkaç dakika içinde ulaşmazsa spam/gereksiz klasörünüzü kontrol edin.
          </p>

          <DogrulamaTekrarGonder eposta={form.email} />

          <p className="mt-8 font-body text-[13px]">
            <Link
              prefetch={false}
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
        <h1 className="font-heading text-[30px] font-medium text-ink mb-6 text-center">
          Üye Ol
        </h1>

        {/* Faz 11E: üyelere özel kampanya varsa burada görünür; yoksa hiç
            basılmaz (olmayan indirim vaat edilmez). */}
        <div className="mb-6">
          <UyelikTesvikSatiri baglam="kayit" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            etiket="Ad Soyad"
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input
            type="email"
            etiket="E-posta adresi"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            type="password"
            etiket="Şifre"
            ipucu="En az 6 karakter."
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Input
            type="password"
            etiket="Şifre (tekrar)"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            required
          />

          {error && <p role="alert" className="text-red-700 text-[14px] font-body">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="basis flex min-h-[52px] w-full items-center justify-center rounded-[4px] bg-ink font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-accent-deep disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Üye Ol'}
          </button>

          <p className="text-center text-[13px] font-body text-ink-soft">
            Zaten üye misiniz?{' '}
            <Link
              prefetch={false}
              href="/giris"
              className="text-accent-deep hover:text-ink transition-colors"
            >
              Giriş yapın
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
