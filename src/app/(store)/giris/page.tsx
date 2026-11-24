'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import { izle } from '@/lib/analytics/izle'

export default function GirisPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setError('E-posta veya şifre hatalı')
      setLoading(false)
      return
    }

    izle('login')
    router.push('/hesabim')
    router.refresh()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <h1 className="font-heading text-[30px] font-medium text-ink mb-6 text-center">
          Giriş Yap
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <div className="text-right">
            <Link
              prefetch={false}
              href="/sifremi-unuttum"
              className="inline-flex min-h-[44px] items-center text-[14px] font-body text-ink underline decoration-accent underline-offset-4 hover:text-accent-deep transition-colors"
            >
              Şifremi unuttum
            </Link>
          </div>

          {error && <p role="alert" className="text-red-700 text-[14px] font-body">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="basis flex min-h-[52px] w-full items-center justify-center rounded-[4px] bg-ink font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-accent-deep disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <p className="text-center text-[14px] font-body text-ink-soft">
            Üye değil misiniz?{' '}
            <Link
              prefetch={false}
              href="/kayit"
              className="text-ink underline decoration-accent underline-offset-4 hover:text-accent-deep transition-colors"
            >
              Üye olun
            </Link>
          </p>
          {/* 24 Kas 2026 tasarım denetimi: üyeliğin şart olmadığı bu sayfada
              yazmıyordu; siparişini takip etmek isteyen misafir müşteri giriş
              ekranında takılıyordu. */}
          <p className="border-t border-line pt-4 text-center text-[13px] font-body leading-relaxed text-ink-soft">
            Sipariş vermek ve siparişinizi takip etmek için üyelik gerekmez.{' '}
            <Link
              prefetch={false}
              href="/kargo-takip"
              className="text-ink underline decoration-accent underline-offset-4 hover:text-accent-deep transition-colors"
            >
              Siparişimi takip et
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
