'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Panel girişi — eski /admin/login'in devamı, aynı auth ucunu kullanır
 * (POST /api/admin/login → admin_token çerezi). Yeni auth yazılmadı.
 */
export default function PanelLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [hata, setHata] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  const gir = async (e: React.FormEvent) => {
    e.preventDefault()
    setGonderiliyor(true)
    setHata('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) throw new Error('Parola hatalı')
      router.push('/panel')
      router.refresh()
    } catch (err: any) {
      setHata(err.message || 'Giriş başarısız')
      setGonderiliyor(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={gir}
        className="w-full max-w-sm rounded-[8px] border border-[var(--p-line)] bg-[var(--p-surface)] p-6"
      >
        <p className="panel-brand text-center text-[18px] tracking-[0.12em] text-[var(--p-ink)]">
          NB STEELORA
        </p>
        <p className="mb-6 mt-1 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--p-accent)]">
          Yönetim Paneli
        </p>

        <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Parola</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface)] px-3 py-2.5 text-[14px] text-[var(--p-ink)] focus:border-[var(--p-accent)] focus:outline-none"
        />
        {hata && <p className="mt-2 text-[12px] text-[var(--p-danger)]">{hata}</p>}

        <button
          type="submit"
          disabled={gonderiliyor || !password}
          className="mt-4 w-full rounded-[4px] bg-[var(--p-ink)] py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--p-accent-deep)] disabled:opacity-40"
        >
          {gonderiliyor ? 'Giriliyor…' : 'Giriş yap'}
        </button>
      </form>
    </div>
  )
}
