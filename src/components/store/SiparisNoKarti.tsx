'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'

/**
 * Teşekkür sayfasındaki sipariş numarası kartı (Faz 11C).
 *
 * GERÇEK OLAY: onay maili müşteriye ulaşmayınca elindeki tek kayıt bu ekran
 * oluyor — ama numara küçük yazıyordu, kopyalanamıyordu ve ekran kapanınca
 * kayboluyordu. Artık numara büyük, tek dokunuşla kopyalanır, "not alın"
 * uyarısı ve takip bağlantısı yanında; mail gelmezse "tekrar gönder" düğmesi
 * takip mailini kayıtlı adrese yeniden yollar.
 */
export default function SiparisNoKarti({ orderNumber }: { orderNumber: string }) {
  const [kopyalandi, setKopyalandi] = useState(false)
  const [mailDurumu, setMailDurumu] = useState<'bekliyor' | 'gonderiliyor' | 'tamam'>('bekliyor')

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 1800)
    } catch {
      /* pano izni yoksa numara zaten seçilebilir metin */
    }
  }

  const tekrarGonder = async () => {
    setMailDurumu('gonderiliyor')
    try {
      await fetch('/api/kargo-takip/bul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siparisNo: orderNumber }),
      })
    } catch {
      /* yanıt her durumda aynı — genel mesaj gösterilir */
    }
    setMailDurumu('tamam')
  }

  return (
    <div className="bg-surface border border-line rounded-[4px] px-6 py-5 mb-8 text-left">
      <p className="text-[12px] uppercase tracking-[0.1em] font-body text-muted mb-1 text-center">
        Sipariş Numarası
      </p>
      <div className="flex items-center justify-center gap-2">
        {/* 24 Kas 2026: 24 px'te numara 390 px ekranda "NBS-" ve rakamlar diye
            iki satıra bölünüyordu. Tek satır; telefonda 20 px. */}
        <p className="price select-all whitespace-nowrap text-[20px] text-ink sm:text-[24px]">
          {orderNumber}
        </p>
        <button
          onClick={kopyala}
          aria-label="Sipariş numarasını kopyala"
          className="flex h-11 w-11 items-center justify-center rounded-[4px] text-ink-soft transition-colors hover:text-accent-deep"
        >
          {kopyalandi ? <Check size={18} className="text-accent-deep" /> : <Copy size={18} />}
        </button>
      </div>
      <p className="mt-2 text-center font-body text-[13px] leading-relaxed text-ink-soft">
        <strong>Bu numarayı not alın.</strong> Onay e-postası ulaşmazsa siparişinize bu
        numarayla{' '}
        <Link
          prefetch={false}
          href={`/kargo-takip?no=${encodeURIComponent(orderNumber)}`}
          className="text-accent-deep underline underline-offset-2"
        >
          Kargo Takip
        </Link>{' '}
        sayfasından ulaşabilirsiniz.
      </p>
      <div className="mt-3 text-center">
        {mailDurumu === 'tamam' ? (
          <p className="font-body text-[13px] leading-relaxed text-ink-soft">
            Sipariş bilgileri kayıtlı adresinize yeniden gönderildi — gereksiz (spam)
            klasörünü de kontrol edin.
          </p>
        ) : (
          <button
            onClick={tekrarGonder}
            disabled={mailDurumu === 'gonderiliyor'}
            className="min-h-[44px] font-body text-[13px] text-accent-deep underline underline-offset-4 transition-colors hover:text-ink disabled:opacity-50"
          >
            {mailDurumu === 'gonderiliyor'
              ? 'Gönderiliyor…'
              : 'Onay e-postası gelmedi mi? Tekrar gönder'}
          </button>
        )}
      </div>
    </div>
  )
}
