'use client'

import { useState } from 'react'
import { Mail, RotateCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PBadge, PButton, PCard } from '../../_components/ui'
import { useToast } from '../../_components/overlays'

/**
 * Müşteriye giden maillerin listesi ve elle tekrar gönderme (Faz 30).
 *
 * İlk gerçek siparişte iki mailin gitmediği ancak günler sonra anlaşıldı ve
 * geriye dönük kanıt bulmak mümkün olmadı (Vercel Hobby günlükleri saklamıyor,
 * Resend anahtarı yalnız gönderim yetkili). Artık gönderim siparişe
 * damgalanıyor ve o damga burada görünüyor: "gitti mi" sorusunun cevabı
 * panelde, siparişin yanında duruyor.
 */

const TURLER: { anahtar: string; ad: string; aciklama: string }[] = [
  { anahtar: 'onay', ad: 'Sipariş onayı', aciklama: 'Ödeme alınınca' },
  { anahtar: 'kargo', ad: 'Kargoya verildi', aciklama: 'Takip kodu ve takip bağlantısıyla' },
  { anahtar: 'teslimat', ad: 'Teslim edildi', aciklama: 'Değerlendirme davetiyle birlikte' },
  { anahtar: 'iptal', ad: 'İptal / iade', aciklama: 'Yalnız iptal edilen siparişlerde' },
]

const zamanYaz = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function MailGecmisi({
  siparisId,
  gecmis,
}: {
  siparisId: string
  gecmis: Record<string, string>
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [gonderiliyor, setGonderiliyor] = useState<string | null>(null)

  const gonder = async (tur: string) => {
    setGonderiliyor(tur)
    try {
      const res = await fetch('/api/panel/siparis-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: siparisId, tur }),
      })
      const d = await res.json()
      if (d?.ok) {
        toast('Mail gönderildi', 'success')
        router.refresh()
      } else {
        toast(d?.error || `Gönderilemedi (${d?.sebep ?? 'bilinmeyen'})`, 'danger')
      }
    } catch {
      toast('Gönderilemedi', 'danger')
    }
    setGonderiliyor(null)
  }

  return (
    <PCard title="Müşteri e-postaları">
      <ul className="divide-y divide-[var(--p-line)]">
        {TURLER.map((t) => {
          const damga = gecmis?.[t.anahtar]
          return (
            <li key={t.anahtar} className="flex flex-wrap items-center gap-2 py-2.5">
              <Mail size={13} className="shrink-0 text-[var(--p-muted)]" />
              <span className="text-[13px] font-medium text-[var(--p-ink)]">{t.ad}</span>
              <span className="text-[11px] text-[var(--p-muted)]">{t.aciklama}</span>
              <span className="ml-auto flex items-center gap-2">
                {damga ? (
                  <>
                    <PBadge tone="success">gönderildi</PBadge>
                    <span className="text-[11px] tabular-nums text-[var(--p-muted)]">
                      {zamanYaz(damga)}
                    </span>
                  </>
                ) : (
                  <PBadge tone="neutral">gönderilmedi</PBadge>
                )}
                <PButton
                  variant="ghost"
                  onClick={() => gonder(t.anahtar)}
                  disabled={gonderiliyor !== null}
                >
                  <RotateCw size={12} />
                  {gonderiliyor === t.anahtar ? 'Gönderiliyor…' : damga ? 'Tekrar gönder' : 'Gönder'}
                </PButton>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-[var(--p-muted)]">
        Bu maillerin hepsi akış ilerledikçe kendiliğinden gider; buradaki düğme yalnız bir mail
        müşteriye ulaşmadığında (spam kutusu gibi) tekrar göndermek içindir. Gönderilmemiş kalanları
        gecelik denetim de yakalayıp yollar.
      </p>
    </PCard>
  )
}
