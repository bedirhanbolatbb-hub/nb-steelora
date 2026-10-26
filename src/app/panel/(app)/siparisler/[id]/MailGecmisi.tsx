'use client'

import { useState } from 'react'
import { Mail, RotateCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PBadge, PButton, PCard, PInput } from '../../_components/ui'
import type { BaskiKaydi } from '@/lib/emails/baskiListesi'
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
  durumlar = {},
  durumKisitli = false,
  baski = null,
  eposta = null,
}: {
  siparisId: string
  gecmis: Record<string, string>
  /** Resend son olayı (Faz 11C): teslim edildi / bounce / şikâyet. */
  durumlar?: Record<string, { etiket: string; olay: string }>
  durumKisitli?: boolean
  /** Alıcı Resend baskı listesindeyse kaydı (Faz 34). */
  baski?: BaskiKaydi | null
  /** Siparişteki müşteri adresi — düzeltme kutusunun başlangıç değeri. */
  eposta?: string | null
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [gonderiliyor, setGonderiliyor] = useState<string | null>(null)
  /** Faz 34: baskı listesi işlemleri. */
  const [engelKaldiriliyor, setEngelKaldiriliyor] = useState(false)
  const [yeniEposta, setYeniEposta] = useState(eposta ?? '')
  const [epostaKaydediliyor, setEpostaKaydediliyor] = useState(false)
  const engellenenTurler = Object.entries(durumlar)
    .filter(([, d]) => d.olay === 'suppressed')
    .map(([tur]) => tur)

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

  /**
   * Engeli kaldır, sonra engellenen mailleri sırayla tekrar gönder. Adres
   * yanlışsa ilk mail yine geri döner ve Resend adresi listeye geri alır —
   * kutudaki metin bunu önceden söyler.
   */
  const engeliKaldirVeGonder = async () => {
    setEngelKaldiriliyor(true)
    try {
      const res = await fetch('/api/panel/mail-baski', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: siparisId }),
      })
      const d = await res.json()
      if (!res.ok || !d?.ok) throw new Error(d?.error || 'Engel kaldırılamadı')
      let gonderilen = 0
      for (const tur of engellenenTurler) {
        const r = await fetch('/api/panel/siparis-mail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: siparisId, tur }),
        })
        const g = await r.json()
        if (g?.ok) gonderilen++
      }
      toast(`Engel kaldırıldı · ${gonderilen} mail yeniden gönderildi`, 'success')
      router.refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Engel kaldırılamadı', 'danger')
    }
    setEngelKaldiriliyor(false)
  }

  const epostayiDuzelt = async () => {
    setEpostaKaydediliyor(true)
    try {
      const res = await fetch('/api/panel/siparis-eposta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: siparisId, email: yeniEposta }),
      })
      const d = await res.json()
      if (!res.ok || !d?.ok) throw new Error(d?.error || 'Kaydedilemedi')
      toast('E-posta düzeltildi — şimdi mailleri yeniden gönderin', 'success')
      router.refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Kaydedilemedi', 'danger')
    }
    setEpostaKaydediliyor(false)
  }

  return (
    <PCard title="Müşteri e-postaları">
      {/* Faz 34 · alıcı Resend baskı listesinde: gönderim "başarılı" görünür ama
          hiçbir mail teslim edilmez. Sebep ve çıkış yolu burada. */}
      {baski && (
        <div className="mb-3 rounded-[6px] border border-[var(--p-danger)] bg-[var(--p-danger-bg)] p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--p-danger)]">
            ⚠ Bu adrese mail GİTMİYOR
          </p>
          <p className="text-[13px] leading-relaxed text-[var(--p-ink)]">
            {baski.sebep === 'bounce' ? (
              <>
                Bu adrese gönderilen bir mail <strong>kalıcı olarak geri döndü</strong>
                {baski.kaynakMail?.konu ? <> (&quot;{baski.kaynakMail.konu}&quot;, {zamanYaz(baski.eklenme)})</> : null}
                ; büyük ihtimalle adres yok ya da yanlış yazılmış. Mail sağlayıcı o günden beri bu
                adrese giden <strong>her maili teslim etmeden durduruyor</strong>. Önce müşteriyi
                telefonla arayıp adresi doğrulayın.
              </>
            ) : baski.sebep === 'complaint' ? (
              <>
                Alıcı daha önce bir mailimizi <strong>spam olarak işaretledi</strong> ({zamanYaz(baski.eklenme)});
                mail sağlayıcı o günden beri bu adrese gönderimi durduruyor. Müşteri açıkça istemeden
                engeli kaldırmayın.
              </>
            ) : (
              <>Adres mail sağlayıcıda elle engellenmiş ({zamanYaz(baski.eklenme)}).</>
            )}
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block min-w-[240px] flex-1">
              <span className="mb-1 block text-[12px] text-[var(--p-muted)]">
                Adres yanlışsa doğrusunu yazıp kaydedin
              </span>
              <PInput
                type="email"
                value={yeniEposta}
                onChange={(e) => setYeniEposta(e.target.value)}
                placeholder="musteri@ornek.com"
              />
            </label>
            <PButton
              variant="ghost"
              onClick={epostayiDuzelt}
              disabled={epostaKaydediliyor || !yeniEposta.trim() || yeniEposta.trim().toLowerCase() === (eposta ?? '').toLowerCase()}
            >
              {epostaKaydediliyor ? 'Kaydediliyor…' : 'E-postayı düzelt'}
            </PButton>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PButton variant="danger" onClick={engeliKaldirVeGonder} disabled={engelKaldiriliyor}>
              {engelKaldiriliyor ? 'İşleniyor…' : 'Adres doğru — engeli kaldır ve yeniden gönder'}
            </PButton>
            <span className="text-[11px] text-[var(--p-muted)]">
              Adres yanlışken basılırsa mail yine döner ve engel kendiliğinden geri gelir.
            </span>
          </div>
        </div>
      )}
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
                    {(() => {
                      const d = durumlar[t.anahtar]
                      if (!d) return <PBadge tone="success">gönderildi</PBadge>
                      const kotu = ['bounced', 'complained', 'failed', 'suppressed'].includes(d.olay)
                      return (
                        <PBadge tone={kotu ? 'danger' : d.olay === 'delivered' ? 'success' : 'neutral'}>
                          {d.etiket}
                        </PBadge>
                      )
                    })()}
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
