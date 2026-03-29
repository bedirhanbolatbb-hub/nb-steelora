'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SifreSifirlaPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor')
      return
    }
    if (password.length < 6) {
      setError('En az 6 karakter')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Hata oluştu')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/giris'), 2000)
  }

  if (success)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <p className="font-heading text-[24px]">Şifreniz güncellendi!</p>
          <p className="text-text-secondary text-[12px] font-body mt-2">
            Giriş sayfasına yönlendiriliyorsunuz...
          </p>
        </div>
      </div>
    )

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <h1 className="font-heading text-[36px] font-light text-text-primary mb-2 text-center">
          Yeni Şifre Belirle
        </h1>
        <div className="w-16 h-px bg-gold mx-auto mb-10" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Yeni Şifre *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="Şifre Tekrar *"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full px-4 py-3 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors"
          />
          {error && (
            <p className="text-red-500 text-sm font-body">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-dark text-champagne font-body text-[12px] tracking-[0.15em] uppercase hover:bg-gold transition-colors disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      </div>
    </div>
  )
}
