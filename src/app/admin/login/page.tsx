'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
      router.refresh()
    } else {
      setError('Şifre yanlış')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-champagne flex items-center justify-center">
      <div className="bg-white p-8 w-full max-w-sm shadow-sm">
        <h1 className="font-heading text-[24px] font-light text-dark text-center mb-8">
          NB Steelora Admin
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm font-body">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-dark text-champagne text-[11px] tracking-[0.15em] uppercase font-body hover:bg-gold transition-colors disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
