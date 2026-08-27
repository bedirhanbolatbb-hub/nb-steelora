'use client'

import { useState } from 'react'

/**
 * "Sipariş numaranızı bilmiyor musunuz?" (Faz 11C).
 *
 * GERÇEK OLAY: onay maili müşteriye ulaşmayınca sipariş numarası da elinde
 * olmuyor; takip formu numara + e-posta istediği için kilitleniyordu.
 * Buradan yalnız e-posta girilir; siparişler EKRANA DEĞİL, o adrese mail
 * olarak gider (sızıntı yok). Yanıt her durumda aynı genel cümledir.
 */
export default function SiparisleriniBul() {
  const [acik, setAcik] = useState(false)
  const [eposta, setEposta] = useState('')
  const [durum, setDurum] = useState<'bekliyor' | 'gonderiliyor' | 'tamam'>('bekliyor')

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eposta.trim()) return
    setDurum('gonderiliyor')
    try {
      await fetch('/api/kargo-takip/bul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eposta: eposta.trim() }),
      })
    } catch {
      /* genel mesaj yine gösterilir — var/yok sızdırılmaz */
    }
    setDurum('tamam')
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      {!acik ? (
        <button
          onClick={() => setAcik(true)}
          className="font-body text-[12px] text-accent-deep underline underline-offset-4 hover:text-ink transition-colors"
        >
          Sipariş numaranızı bilmiyor musunuz?
        </button>
      ) : durum === 'tamam' ? (
        <p className="font-body text-[12px] leading-relaxed text-ink-soft">
          Kayıtlı bir adres varsa sipariş bilgileriniz o adrese gönderildi. Birkaç dakika
          içinde gelmezse gereksiz (spam) klasörünü de kontrol edin.
        </p>
      ) : (
        <form onSubmit={gonder} className="space-y-2">
          <p className="font-body text-[12px] leading-relaxed text-ink-soft">
            E-posta adresinizi girin; bu adrese kayıtlı siparişlerin numaralarını ve takip
            bağlantılarını size mail ile gönderelim.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              placeholder="E-posta adresiniz"
              className="min-h-[44px] flex-1 rounded-[4px] border border-line bg-bg px-3 font-body text-[13px] text-ink outline-none focus:border-ink"
            />
            <button
              type="submit"
              disabled={durum === 'gonderiliyor'}
              className="min-h-[44px] shrink-0 rounded-[4px] bg-ink px-5 font-body text-[11px] font-medium uppercase tracking-[0.14em] text-bg transition-colors hover:bg-accent-deep disabled:opacity-50"
            >
              {durum === 'gonderiliyor' ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
