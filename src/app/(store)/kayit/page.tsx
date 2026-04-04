'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Input from '@/components/ui/Input'

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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl mb-6">✉️</div>
          <h1 className="font-heading text-[28px] font-light text-text-primary mb-4">
            E-postanızı Doğrulayın
          </h1>
          <p className="text-[13px] font-body text-text-secondary mb-6">
            <strong>{form.email}</strong> adresine doğrulama linki gönderdik.
            Lütfen e-postanızı kontrol edin.
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
          Üye Ol
        </h1>
        <div className="w-16 h-px bg-gold mx-auto mb-10" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Ad Soyad *"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input
            type="email"
            placeholder="E-posta *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="Şifre * (en az 6 karakter)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="Şifre Tekrar *"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            required
          />

          {error && <p className="text-red-500 text-sm font-body">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-text-primary text-white font-body text-[12px] tracking-[0.15em] uppercase hover:bg-gold transition-colors disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Üye Ol'}
          </button>

          <p className="text-center text-[13px] font-body text-text-secondary">
            Zaten üye misiniz?{' '}
            <Link
              href="/giris"
              className="text-gold hover:text-gold-light transition-colors"
            >
              Giriş yapın
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
