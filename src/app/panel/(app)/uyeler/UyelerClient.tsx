'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { PBadge, PCard, PEmptyState, PInput } from '../_components/ui'

export type Satir = {
  id: string
  eposta: string
  ad: string | null
  kayit: string
  onayli: boolean
  sonGiris: string | null
  bugunKatildi: boolean
  siparis: number
  ciro: number
  hareket: number
}

const tarih = (t: string | null) =>
  t
    ? new Date(t).toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

export default function UyelerClient({
  satirlar,
  baglantiAcik,
}: {
  satirlar: Satir[]
  baglantiAcik: boolean
}) {
  const [q, setQ] = useState('')

  const gorunen = useMemo(() => {
    const a = q.trim().toLowerCase()
    if (!a) return satirlar
    return satirlar.filter(
      (s) => s.eposta.toLowerCase().includes(a) || (s.ad || '').toLowerCase().includes(a)
    )
  }, [satirlar, q])

  const bugun = satirlar.filter((s) => s.bugunKatildi)

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <p className="text-[12px] leading-relaxed text-[var(--p-muted)]">
        E-posta adresleri <strong className="font-medium text-[var(--p-ink)]">maskeli</strong>{' '}
        gösterilir — ekran paylaşırken müşteri adresi ifşa olmasın diye. Tam adres siparişin
        kendi sayfasında görünür.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Toplam üye', satirlar.length],
          ['Bugün katılan', bugun.length],
          ['Doğrulanmış', satirlar.filter((s) => s.onayli).length],
          ['Sipariş vermiş', satirlar.filter((s) => s.siparis > 0).length],
        ].map(([ad, deger]) => (
          <div
            key={String(ad)}
            className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">{ad}</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--p-ink)]">
              {deger}
            </p>
          </div>
        ))}
      </div>

      {bugun.length > 0 && (
        <PCard title="Bugün katılanlar">
          <ul className="space-y-2">
            {bugun.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                <Link
                  href={`/panel/uyeler/${u.id}`}
                  className="font-medium text-[var(--p-ink)] underline underline-offset-2"
                >
                  {u.eposta}
                </Link>
                {u.ad && <span className="text-[var(--p-muted)]">· {u.ad}</span>}
                <span className="text-[var(--p-muted)]">· {tarih(u.kayit)}</span>
                {!u.onayli && <PBadge tone="warning">doğrulanmadı</PBadge>}
              </li>
            ))}
          </ul>
        </PCard>
      )}

      <PCard
        title={`Tüm üyeler (${gorunen.length})`}
        action={
          <PInput
            placeholder="Ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-40"
          />
        }
      >
        {gorunen.length === 0 ? (
          <PEmptyState title="Üye yok" description="Aramanıza uyan üye bulunamadı." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--p-line)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">
                  <th className="py-2 pr-3 font-normal">Üye</th>
                  <th className="py-2 pr-3 font-normal">Kayıt</th>
                  <th className="py-2 pr-3 font-normal">Son giriş</th>
                  <th className="py-2 pr-3 text-right font-normal">Sipariş</th>
                  <th className="py-2 pr-3 text-right font-normal">Ciro</th>
                  <th className="py-2 text-right font-normal">Hareket</th>
                </tr>
              </thead>
              <tbody>
                {gorunen.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--p-line)] last:border-0">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/panel/uyeler/${u.id}`}
                        className="font-medium text-[var(--p-ink)] underline underline-offset-2"
                      >
                        {u.eposta}
                      </Link>
                      {u.ad && (
                        <span className="block text-[11px] text-[var(--p-muted)]">{u.ad}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-[var(--p-muted)]">{tarih(u.kayit)}</td>
                    <td className="py-2 pr-3 text-[var(--p-muted)]">{tarih(u.sonGiris)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{u.siparis || '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {u.ciro ? formatPrice(u.ciro) : '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums text-[var(--p-muted)]">
                      {baglantiAcik ? u.hareket || '—' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!baglantiAcik && (
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--p-muted)]">
            Hareket sütunu boş: üye bağlantısı için gereken veritabanı sütunu henüz eklenmedi
            (<code>docs/analiz/02-uye-baglantisi.sql</code>). Diğer bilgiler etkilenmez.
          </p>
        )}
      </PCard>
    </div>
  )
}
