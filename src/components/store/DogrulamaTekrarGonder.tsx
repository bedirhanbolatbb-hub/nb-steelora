'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'

/**
 * Doğrulama mailini yeniden gönderir.
 *
 * Mesaj her durumda aynıdır — "gönderildi" ya da "böyle bir hesap yok" ayrımı
 * yapılmaz. Aksi hâlde form, hangi adreslerin kayıtlı olduğunu sorgulayan bir
 * hesap sayımı aracına dönerdi (KVKK: üçüncü kişiye müşteri bilgisi ifşası).
 * Aynı nedenle Supabase'ten dönen hata da kullanıcıya yansıtılmaz.
 *
 * 60 saniyelik kilit hem SMTP kotasını hem de kullanıcıyı korur.
 */
export default function DogrulamaTekrarGonder({
  eposta: baslangicEposta = '',
  epostaDuzenlenebilir = false,
}: {
  eposta?: string
  epostaDuzenlenebilir?: boolean
}) {
  const [eposta, setEposta] = useState(baslangicEposta)
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [gonderildi, setGonderildi] = useState(false)
  const [kalan, setKalan] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (kalan <= 0) return
    const t = setTimeout(() => setKalan((k) => k - 1), 1000)
    return () => clearTimeout(t)
  }, [kalan])

  const gonder = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!eposta || kalan > 0 || gonderiliyor) return
    setGonderiliyor(true)
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: eposta,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      })
    } catch {
      // Sonuç kullanıcıya yansıtılmaz; mesaj her hâlükârda aynı.
    }
    setGonderiliyor(false)
    setGonderildi(true)
    setKalan(60)
  }

  return (
    <form onSubmit={gonder} className="space-y-3">
      {epostaDuzenlenebilir && (
        <Input
          type="email"
          placeholder="E-posta adresiniz"
          value={eposta}
          onChange={(e) => setEposta(e.target.value)}
          required
        />
      )}

      <button
        type="submit"
        disabled={gonderiliyor || kalan > 0 || !eposta}
        className="w-full border border-ink px-6 py-3 font-body text-[11px] uppercase tracking-[0.15em] text-ink transition-colors hover:bg-surface-muted disabled:opacity-45"
      >
        {gonderiliyor
          ? 'Gönderiliyor…'
          : kalan > 0
            ? `Tekrar gönder (${kalan} sn)`
            : gonderildi
              ? 'Tekrar gönder'
              : 'Doğrulama bağlantısını tekrar gönder'}
      </button>

      {gonderildi && (
        <p className="text-[12px] font-body leading-relaxed text-ink-soft">
          Bu e-posta ile kayıtlı ve henüz doğrulanmamış bir hesap varsa yeni doğrulama
          bağlantısını gönderdik. Birkaç dakika içinde ulaşmazsa spam klasörünü kontrol edin ya da
          bu adresle kayıtlı olmayabilirsiniz.
        </p>
      )}
    </form>
  )
}
