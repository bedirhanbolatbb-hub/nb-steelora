'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/ui/Input'

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

    router.push('/hesabim')
    router.refresh()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <h1 className="font-heading text-[36px] font-light text-text-primary mb-2 text-center">
          Giriş Yap
        </h1>
        <div className="w-16 h-px bg-gold mx-auto mb-10" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="E-posta *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="Şifre *"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <div className="text-right">
            <Link
              href="/sifremi-unuttum"
              className="text-[12px] font-body text-gold hover:text-gold-light transition-colors"
            >
              Şifremi unuttum
            </Link>
          </div>

          {error && <p className="text-red-500 text-sm font-body">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-text-primary text-white font-body text-[12px] tracking-[0.15em] uppercase hover:bg-gold transition-colors disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <p className="text-center text-[13px] font-body text-text-secondary">
            Üye değil misiniz?{' '}
            <Link
              href="/kayit"
              className="text-gold hover:text-gold-light transition-colors"
            >
              Üye olun
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
