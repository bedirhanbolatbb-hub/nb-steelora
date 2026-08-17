'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SifreSifirlaPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  // Oturum durumu: bağlantı geçersiz/süresi dolmuşsa formu hiç göstermeyip
  // kullanıcıyı yeni bağlantı istemeye yönlendiririz (Faz 11).
  const [oturum, setOturum] = useState<'bekliyor' | 'var' | 'yok'>('bekliyor')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setOturum(data.session ? 'var' : 'yok')
    })
  }, [])

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
      // Gerçek sebep gösterilir; "Hata oluştu" tek satırı sorunu gizliyordu.
      setError(
        /session|Auth session missing/i.test(error.message)
          ? 'Bağlantının süresi dolmuş görünüyor. Lütfen yeni bir sıfırlama bağlantısı isteyin.'
          : `Şifre güncellenemedi: ${error.message}`
      )
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
          <p className="text-ink-soft text-[12px] font-body mt-2">
            Giriş sayfasına yönlendiriliyorsunuz...
          </p>
        </div>
      </div>
    )

  if (oturum === 'bekliyor') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-[13px] text-muted">Bağlantı doğrulanıyor…</p>
      </div>
    )
  }

  if (oturum === 'yok') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="font-heading text-[30px] font-light text-ink">Bağlantı geçersiz</h1>
          <div className="w-16 h-px bg-accent mx-auto my-6" />
          <p className="font-body text-[13px] leading-relaxed text-ink-soft">
            Şifre sıfırlama bağlantısı kullanılmış ya da süresi dolmuş olabilir.
            Yeni bir bağlantı isteyip tekrar deneyin.
          </p>
          <Link
            href="/sifremi-unuttum"
            className="mt-8 inline-block bg-ink px-8 py-3.5 font-body text-[12px] uppercase tracking-[0.15em] text-bg transition-colors hover:bg-accent"
          >
            Yeni bağlantı iste
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <h1 className="font-heading text-[36px] font-light text-ink mb-2 text-center">
          Yeni Şifre Belirle
        </h1>
        <div className="w-16 h-px bg-accent mx-auto mb-10" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Yeni Şifre *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border border-line bg-white font-body text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="Şifre Tekrar *"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full px-4 py-3 border border-line bg-white font-body text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
          />
          {error && (
            <p className="text-red-500 text-sm font-body">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-ink text-bg font-body text-[12px] tracking-[0.15em] uppercase hover:bg-accent transition-colors disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      </div>
    </div>
  )
}
