'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Check, ExternalLink } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { ORDER_STATUS, PBadge, PButton, PCard, PInput, PSelect } from '../../_components/ui'
import { PDialog, useToast } from '../../_components/overlays'

type Kalem = { ad: string; adet: number; birim: number; slug: string | null; image: string | null }

export type SiparisDetay = {
  id: string
  no: string
  durum: string
  secilebilirDurumlar: string[]
  email: string | null
  items: Kalem[]
  araToplam: number
  kargo: number
  indirim: number
  kuponKodu: string | null
  toplam: number
  adres: {
    full_name?: string
    phone?: string
    city?: string
    district?: string
    neighborhood?: string
    address?: string
    zip_code?: string
  } | null
  hediyeNotu: string | null
  iyzicoId: string | null
  takipNo: string | null
  createdAt: string
  updatedAt: string | null
  stockDeductedAt: string | null
  stockRestoredAt: string | null
  paymentRefundedAt: string | null
  reviewInviteSentAt: string | null
}

/** Geri alınamaz geçişler — onay diyaloğu ister. */
const GERI_ALINAMAZ: Record<string, string> = {
  shipped: 'Kargoya verildi olarak işaretlenecek ve müşteriye kargo maili gidecek. Bu geçiş geri alınamaz (yalnız teslim edildi kalır).',
  delivered: 'Teslim edildi olarak işaretlenecek ve müşteriye değerlendirme daveti gidecek (sipariş başına bir kez). Bu son adımdır.',
  cancelled: 'Sipariş iptal edilecek: mevcut akış iyzico iadesini ve stok geri yüklemesini otomatik çalıştırır. Bu geçiş geri alınamaz.',
}

const ts = (t: string | null) =>
  t
    ? new Date(t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' })
    : null

export default function SiparisDetayClient({ siparis }: { siparis: SiparisDetay }) {
  const router = useRouter()
  const { push: toast } = useToast()

  const [hedefDurum, setHedefDurum] = useState(siparis.durum)
  const [takipNo, setTakipNo] = useState(siparis.takipNo ?? '')
  const [onayAcik, setOnayAcik] = useState(false)
  const [isleniyor, setIsleniyor] = useState(false)

  const durumDegisti = hedefDurum !== siparis.durum
  const takipZorunlu = hedefDurum === 'shipped' && !takipNo.trim()

  const uygula = async () => {
    setIsleniyor(true)
    try {
      // Mevcut admin ucu: geçiş doğrulaması, iptalde iade+stok, kargoda ve
      // teslimde mail tetikleri hep bu uçta — panel yeni mantık yazmaz.
      const res = await fetch(`/api/admin/orders/${siparis.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: hedefDurum,
          ...(takipNo.trim() ? { tracking_number: takipNo.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Geçiş başarısız')
      toast(
        hedefDurum === 'shipped'
          ? 'Kargoya verildi — müşteriye bildirim gönderildi'
          : hedefDurum === 'delivered'
            ? 'Teslim edildi — değerlendirme daveti tetiklendi'
            : 'Durum güncellendi',
        'success'
      )
      setOnayAcik(false)
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  const durumRozet = ORDER_STATUS[siparis.durum] ?? { label: siparis.durum, tone: 'neutral' as const }

  // Zaman çizelgesi mevcut alanlardan türetilir.
  const iptalDali = siparis.durum === 'cancelled'
  const adimSirasi = ['pending', 'paid', 'preparing', 'shipped', 'delivered']
  const mevcutIdx = adimSirasi.indexOf(siparis.durum)
  const cizelge = iptalDali
    ? [
        { ad: 'Oluşturuldu', zaman: ts(siparis.createdAt), oldu: true },
        { ad: 'İptal edildi', zaman: ts(siparis.updatedAt), oldu: true },
        ...(siparis.stockRestoredAt ? [{ ad: 'Stok iade edildi', zaman: ts(siparis.stockRestoredAt), oldu: true }] : []),
        ...(siparis.paymentRefundedAt ? [{ ad: 'Ödeme iade edildi', zaman: ts(siparis.paymentRefundedAt), oldu: true }] : []),
      ]
    : [
        { ad: 'Oluşturuldu', zaman: ts(siparis.createdAt), oldu: true },
        { ad: 'Ödendi', zaman: ts(siparis.stockDeductedAt), oldu: mevcutIdx >= 1 },
        { ad: 'Hazırlanıyor', zaman: null, oldu: mevcutIdx >= 2 },
        { ad: 'Kargoda', zaman: siparis.takipNo ? null : null, oldu: mevcutIdx >= 3 },
        { ad: 'Teslim edildi', zaman: ts(siparis.reviewInviteSentAt), oldu: mevcutIdx >= 4 },
      ]

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/panel/siparisler" className="flex min-h-[44px] items-center gap-1 text-[13px] text-[var(--p-muted)] hover:text-[var(--p-ink)]">
          <ArrowLeft size={14} /> Siparişler
        </Link>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[14px] font-semibold">{siparis.no}</span>
          <PBadge tone={durumRozet.tone}>{durumRozet.label}</PBadge>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Kalemler */}
          <PCard title={`Kalemler (${siparis.items.length})`}>
            <ul className="divide-y divide-[var(--p-line)]/60">
              {siparis.items.map((k, i) => (
                <li key={i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                    {k.image && <Image src={k.image} alt="" width={44} height={44} sizes="44px" className="h-11 w-11 object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    {k.slug ? (
                      <a href={`/urun/${k.slug}`} target="_blank" rel="noopener noreferrer" className="block truncate text-[13px] text-[var(--p-ink)] hover:text-[var(--p-accent-deep)]">
                        {k.ad} <ExternalLink size={11} className="mb-0.5 inline" />
                      </a>
                    ) : (
                      <span className="block truncate text-[13px]">{k.ad}</span>
                    )}
                    <span className="text-[12px] text-[var(--p-muted)]">{k.adet} × {formatPrice(k.birim)}</span>
                  </span>
                  <span className="tabular-nums text-[13px]">{formatPrice(k.adet * k.birim)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-[var(--p-line)] pt-3 text-[13px]">
              <div className="flex justify-between"><dt className="text-[var(--p-ink-soft)]">Ara toplam</dt><dd className="tabular-nums">{formatPrice(siparis.araToplam)}</dd></div>
              {siparis.indirim > 0 && (
                <div className="flex justify-between text-[var(--p-success)]">
                  <dt>İndirim{siparis.kuponKodu ? ` (${siparis.kuponKodu})` : ''}</dt>
                  <dd className="tabular-nums">-{formatPrice(siparis.indirim)}</dd>
                </div>
              )}
              <div className="flex justify-between"><dt className="text-[var(--p-ink-soft)]">Kargo</dt><dd className="tabular-nums">{siparis.kargo === 0 ? 'Ücretsiz' : formatPrice(siparis.kargo)}</dd></div>
              <div className="flex justify-between border-t border-[var(--p-line)] pt-1.5 font-semibold"><dt>Toplam</dt><dd className="tabular-nums">{formatPrice(siparis.toplam)}</dd></div>
            </dl>
          </PCard>

          {/* Adres + notlar */}
          <PCard title="Teslimat">
            <div className="space-y-2 text-[13px]">
              <p className="font-medium">{siparis.adres?.full_name ?? '—'}</p>
              <p className="text-[var(--p-ink-soft)]">
                {[siparis.adres?.address, siparis.adres?.neighborhood, siparis.adres?.district, siparis.adres?.city, siparis.adres?.zip_code]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </p>
              <p className="text-[var(--p-muted)]">{siparis.adres?.phone ?? ''} · {siparis.email ?? ''}</p>
              {siparis.hediyeNotu && (
                <p className="rounded-[4px] bg-[#f5efe2] px-3 py-2 text-[12px] text-[var(--p-accent-deep)]">
                  🎁 Hediye notu: {siparis.hediyeNotu}
                </p>
              )}
              {siparis.iyzicoId && (
                <p className="text-[11px] text-[var(--p-muted)]">iyzico ödeme kimliği: {siparis.iyzicoId}</p>
              )}
            </div>
          </PCard>
        </div>

        <div className="space-y-4">
          {/* Durum akışı */}
          <PCard title="Durum akışı">
            <div className="space-y-3">
              <PSelect value={hedefDurum} onChange={(e) => setHedefDurum(e.target.value)} aria-label="Yeni durum">
                {siparis.secilebilirDurumlar.map((s) => (
                  <option key={s} value={s}>{ORDER_STATUS[s]?.label ?? s}</option>
                ))}
              </PSelect>

              {hedefDurum === 'shipped' && (
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">
                    Takip numarası <span className="text-[var(--p-danger)]">*</span>
                  </label>
                  <PInput value={takipNo} onChange={(e) => setTakipNo(e.target.value)} placeholder="Kargo takip no" />
                  {takipZorunlu && (
                    <p className="mt-1 text-[11px] text-[var(--p-danger)]">Kargoya verme adımında takip numarası zorunlu.</p>
                  )}
                </div>
              )}

              <PButton
                className="w-full"
                disabled={!durumDegisti || isleniyor || takipZorunlu}
                onClick={() => {
                  if (GERI_ALINAMAZ[hedefDurum]) setOnayAcik(true)
                  else uygula()
                }}
              >
                {isleniyor ? 'Uygulanıyor…' : 'Durumu uygula'}
              </PButton>

              <p className="text-[11px] leading-relaxed text-[var(--p-muted)]">
                Geçiş kuralları, iptalde iyzico iadesi + stok geri yükleme ve mail tetikleri
                mevcut yönetim ucundan çalışır; panel yeni ödeme/mail mantığı içermez.
              </p>
            </div>
          </PCard>

          {/* Zaman çizelgesi */}
          <PCard title="Zaman çizelgesi">
            <ol className="space-y-2.5">
              {cizelge.map((adim) => (
                <li key={adim.ad} className="flex items-start gap-2.5 text-[13px]">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      adim.oldu
                        ? 'border-[var(--p-success)] bg-[var(--p-success-bg)] text-[var(--p-success)]'
                        : 'border-[var(--p-line)] text-transparent'
                    }`}
                  >
                    {adim.oldu && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className={adim.oldu ? 'text-[var(--p-ink)]' : 'text-[var(--p-muted)]'}>
                    {adim.ad}
                    {adim.zaman && <span className="ml-1.5 text-[11px] text-[var(--p-muted)]">{adim.zaman}</span>}
                  </span>
                </li>
              ))}
            </ol>
            {siparis.takipNo && (
              <p className="mt-3 border-t border-[var(--p-line)] pt-2 text-[12px] text-[var(--p-ink-soft)]">
                Takip no: <span className="font-medium">{siparis.takipNo}</span>
              </p>
            )}
          </PCard>
        </div>
      </div>

      {/* Geri alınamaz geçiş onayı */}
      <PDialog
        open={onayAcik}
        onClose={() => setOnayAcik(false)}
        title={`${ORDER_STATUS[hedefDurum]?.label ?? hedefDurum} — emin misiniz?`}
        footer={
          <>
            <PButton variant="ghost" onClick={() => setOnayAcik(false)}>Vazgeç</PButton>
            <PButton variant={hedefDurum === 'cancelled' ? 'danger' : 'primary'} onClick={uygula} disabled={isleniyor}>
              {isleniyor ? 'Uygulanıyor…' : 'Evet, uygula'}
            </PButton>
          </>
        }
      >
        <p>{GERI_ALINAMAZ[hedefDurum]}</p>
      </PDialog>
    </div>
  )
}
