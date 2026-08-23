'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { PBadge, PButton, PCard, PEmptyState, ORDER_STATUS } from '../../_components/ui'
import { PDialog, useToast } from '../../_components/overlays'

export type Hareket = {
  event: string
  zaman: string
  path: string | null
  urunAdi: string | null
  urunSlug: string | null
  sorgu: string | null
  tutar: number | null
}

export type SiparisOzet = {
  id: string
  no: string
  tutar: number
  durum: string
  zaman: string
}

/** Teknik olay adı panelde görünmez — mağazacının diliyle yazılır. */
const OLAY_ADI: Record<string, string> = {
  page_view: 'Sayfa gezindi',
  product_view: 'Ürün görüntüledi',
  add_to_cart: 'Sepete ekledi',
  remove_from_cart: 'Sepetten çıkardı',
  favorite_add: 'Favoriledi',
  favorite_remove: 'Favoriden çıkardı',
  search: 'Arama yaptı',
  begin_checkout: 'Ödemeye başladı',
  purchase: 'Sipariş verdi',
  signup: 'Üye oldu',
  login: 'Giriş yaptı',
  newsletter_signup: 'Bültene abone oldu',
}

const zamanYaz = (t: string) =>
  new Date(t).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function UyeDetayClient({
  uye,
  hareketler,
  siparisler,
  baglantiAcik,
}: {
  uye: {
    id: string
    eposta: string
    ad: string | null
    kayit: string
    onayli: boolean
    sonGiris: string | null
  }
  hareketler: Hareket[]
  siparisler: SiparisOzet[]
  baglantiAcik: boolean
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [silDialog, setSilDialog] = useState(false)
  const [siliniyor, setSiliniyor] = useState(false)

  const sil = async () => {
    setSiliniyor(true)
    try {
      const res = await fetch(`/api/panel/uyeler/${uye.id}/analiz`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Silinemedi')
      toast(`${d.silinen} hareket kaydı silindi.`)
      setSilDialog(false)
      router.refresh()
    } catch (e: any) {
      toast(e?.message || 'Silinemedi')
    } finally {
      setSiliniyor(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/panel/uyeler" className="text-[12px] text-[var(--p-muted)] underline underline-offset-2">
        ← Üyeler
      </Link>

      <PCard title={uye.eposta}>
        <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Ad</dt>
            <dd className="mt-0.5">{uye.ad || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Kayıt</dt>
            <dd className="mt-0.5">{zamanYaz(uye.kayit)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">Son giriş</dt>
            <dd className="mt-0.5">{uye.sonGiris ? zamanYaz(uye.sonGiris) : '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">E-posta</dt>
            <dd className="mt-0.5">
              {uye.onayli ? <PBadge tone="success">doğrulandı</PBadge> : <PBadge tone="warning">doğrulanmadı</PBadge>}
            </dd>
          </div>
        </dl>
      </PCard>

      <PCard title={`Siparişler (${siparisler.length})`}>
        {siparisler.length === 0 ? (
          <PEmptyState title="Sipariş yok" description="Bu adrese ait sipariş bulunmuyor." />
        ) : (
          <ul className="divide-y divide-[var(--p-line)] text-[13px]">
            {siparisler.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                <Link href={`/panel/siparisler/${s.id}`} className="font-medium underline underline-offset-2">
                  {s.no}
                </Link>
                <PBadge tone={ORDER_STATUS[s.durum]?.tone ?? 'neutral'}>
                  {ORDER_STATUS[s.durum]?.label ?? s.durum}
                </PBadge>
                <span className="text-[var(--p-muted)]">{zamanYaz(s.zaman)}</span>
                <span className="ml-auto tabular-nums">{formatPrice(s.tutar)}</span>
              </li>
            ))}
          </ul>
        )}
      </PCard>

      <PCard
        title={`Site hareketleri (${hareketler.length})`}
        action={
          baglantiAcik && hareketler.length > 0 ? (
            <PButton variant="danger" onClick={() => setSilDialog(true)}>
              Bu veriyi sil
            </PButton>
          ) : null
        }
      >
        {!baglantiAcik ? (
          <p className="text-[12px] leading-relaxed text-[var(--p-muted)]">
            Üye hareketleri için gereken veritabanı sütunu henüz eklenmedi
            (<code>docs/analiz/02-uye-baglantisi.sql</code>). Sütun eklenene kadar hareket
            kaydedilmez; üyenin diğer bilgileri etkilenmez.
          </p>
        ) : hareketler.length === 0 ? (
          <PEmptyState
            title="Hareket yok"
            description="Bu üye giriş yaptıktan sonra henüz ölçülen bir hareket bırakmadı."
          />
        ) : (
          <>
            <p className="mb-3 text-[12px] leading-relaxed text-[var(--p-muted)]">
              Son 200 hareket. Kayıtlar <strong className="font-medium text-[var(--p-ink)]">13 ay</strong>{' '}
              saklanır, sonra otomatik silinir. Üye hesabını sildiğinde bu kayıtlar da silinir.
            </p>
            <ul className="divide-y divide-[var(--p-line)] text-[13px]">
              {hareketler.map((h, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-2 py-1.5">
                  <span className="w-[110px] shrink-0 text-[11px] tabular-nums text-[var(--p-muted)]">
                    {zamanYaz(h.zaman)}
                  </span>
                  <span className="font-medium">{OLAY_ADI[h.event] ?? h.event}</span>
                  {h.urunAdi && (
                    <Link
                      href={`/urun/${h.urunSlug}`}
                      target="_blank"
                      className="text-[var(--p-accent-deep)] underline underline-offset-2"
                    >
                      {h.urunAdi}
                    </Link>
                  )}
                  {h.sorgu && <span className="text-[var(--p-muted)]">“{h.sorgu}”</span>}
                  {h.tutar != null && h.event === 'purchase' && (
                    <span className="tabular-nums">{formatPrice(h.tutar)}</span>
                  )}
                  {!h.urunAdi && !h.sorgu && h.path && (
                    <span className="text-[var(--p-muted)]">{h.path}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </PCard>

      <PDialog
        open={silDialog}
        onClose={() => setSilDialog(false)}
        title="Hareket kayıtlarını sil"
        footer={
          <>
            <PButton variant="ghost" onClick={() => setSilDialog(false)}>
              Vazgeç
            </PButton>
            <PButton variant="danger" onClick={sil} disabled={siliniyor}>
              {siliniyor ? 'Siliniyor…' : 'Kalıcı olarak sil'}
            </PButton>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed">
          Bu üyenin <strong>{hareketler.length}</strong> site hareketi kaydı kalıcı olarak
          silinecek. Siparişleri, hesabı ve favorileri <strong>etkilenmez</strong>. Geri alınamaz.
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--p-muted)]">
          KVKK kapsamında silme talebi geldiğinde bu düğmeyi kullanın.
        </p>
      </PDialog>
    </div>
  )
}
