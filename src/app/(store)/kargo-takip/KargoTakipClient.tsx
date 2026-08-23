'use client'

import { useState } from 'react'
import { DURUM_SIRASI, DURUM_ETIKETLERI, type KargoDurumu } from '@/lib/shipping/providers/types'

type Sonuc = {
  siparisNo: string | null
  siparisDurumu: string | null
  gonderi: {
    durum: KargoDurumu
    durumEtiketi: string
    takipKodu: string | null
    firmaAdi: string | null
    olusturuldu: string
    guncellendi: string
  } | null
  mesaj?: string
  olaylar?: { durum: KargoDurumu; etiket: string; not: string | null; zaman: string }[]
}

const ts = (t: string) =>
  new Date(t).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Istanbul' })

/** Dallanan durumlar çizelgede değil, ayrı bir satırda anlatılır. */
const DAL_DURUMLARI: Partial<Record<KargoDurumu, string>> = {
  teslim_edilemedi: 'Kargo teslim edilemedi. Kargo firması sizinle iletişime geçecek.',
  iade_surecinde: 'Gönderi iade sürecinde.',
  kayip: 'Gönderi için kayıp kaydı açıldı. Sizinle iletişime geçiyoruz.',
  iptal: 'Bu gönderi iptal edildi.',
}

export default function KargoTakipClient({
  onTakipKodu,
  onSiparisNo,
}: {
  onTakipKodu: string
  onSiparisNo: string
}) {
  const [mod, setMod] = useState<'siparis' | 'kod'>(onTakipKodu ? 'kod' : 'siparis')
  const [siparisNo, setSiparisNo] = useState(onSiparisNo)
  const [eposta, setEposta] = useState('')
  const [kod, setKod] = useState(onTakipKodu)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [sonuc, setSonuc] = useState<Sonuc | null>(null)

  const sorgula = async (e: React.FormEvent) => {
    e.preventDefault()
    setYukleniyor(true)
    setHata(null)
    setSonuc(null)
    try {
      const res = await fetch('/api/kargo-takip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mod === 'kod'
            ? { tracking_code: kod.trim() }
            : { order_number: siparisNo.trim(), email: eposta.trim() }
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sorgulama başarısız')
      setSonuc(data)
    } catch (e: any) {
      setHata(e.message)
    }
    setYukleniyor(false)
  }

  const alanSinifi =
    'w-full border border-line bg-bg px-4 py-3 text-[14px] text-ink placeholder:text-muted focus:border-accent-line focus:outline-none transition-colors'

  const aktifIdx = sonuc?.gonderi ? DURUM_SIRASI.indexOf(sonuc.gonderi.durum) : -1
  const dalMesaji = sonuc?.gonderi ? DAL_DURUMLARI[sonuc.gonderi.durum] : undefined

  return (
    <div className="mx-auto mt-10 max-w-[560px]">
      {/* Sorgulama biçimi */}
      <div className="flex gap-6 border-b border-line">
        {(
          [
            ['siparis', 'Sipariş numarası ile'],
            ['kod', 'Takip kodu ile'],
          ] as const
        ).map(([deger, etiket]) => (
          <button
            key={deger}
            type="button"
            onClick={() => setMod(deger)}
            className={`-mb-px border-b pb-3 text-[12px] uppercase tracking-[0.14em] transition-colors ${
              mod === deger ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink-soft'
            }`}
          >
            {etiket}
          </button>
        ))}
      </div>

      <form onSubmit={sorgula} className="mt-6 space-y-3">
        {mod === 'siparis' ? (
          <>
            <input
              className={alanSinifi}
              placeholder="Sipariş numarası (NBS-…)"
              value={siparisNo}
              onChange={(e) => setSiparisNo(e.target.value)}
              required
            />
            <input
              className={alanSinifi}
              type="email"
              placeholder="Sipariş e-postanız"
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              required
            />
          </>
        ) : (
          <input
            className={alanSinifi}
            placeholder="Takip kodu"
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            required
          />
        )}

        <button
          type="submit"
          disabled={yukleniyor}
          className="w-full bg-ink px-6 py-3.5 text-[12px] uppercase tracking-[0.18em] text-bg transition-colors hover:bg-ink/90 disabled:opacity-50"
        >
          {yukleniyor ? 'Sorgulanıyor…' : 'Kargomu sorgula'}
        </button>
      </form>

      {hata && (
        <p className="mt-5 border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-soft">{hata}</p>
      )}

      {sonuc && (
        <section className="mt-10">
          {sonuc.siparisNo && (
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Sipariş {sonuc.siparisNo}</p>
          )}

          {!sonuc.gonderi ? (
            <p className="mt-4 border border-line bg-surface-muted px-5 py-6 text-[14px] leading-relaxed text-ink-soft">
              {sonuc.mesaj}
            </p>
          ) : (
            <>
              <h2 className="mt-3 font-heading text-[28px] font-medium text-ink">
                {sonuc.gonderi.durumEtiketi}
              </h2>

              <dl className="mt-5 space-y-2 border-y border-line py-5 text-[13px]">
                {sonuc.gonderi.firmaAdi && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Kargo firması</dt>
                    <dd className="text-ink">{sonuc.gonderi.firmaAdi}</dd>
                  </div>
                )}
                {sonuc.gonderi.takipKodu && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Takip kodu</dt>
                    <dd className="font-medium tracking-wide text-ink">{sonuc.gonderi.takipKodu}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Son güncelleme</dt>
                  <dd className="text-ink">{ts(sonuc.gonderi.guncellendi)}</dd>
                </div>
              </dl>

              {dalMesaji ? (
                <p className="mt-5 border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-soft">
                  {dalMesaji}
                </p>
              ) : (
                /* İlerleme çizelgesi */
                <ol className="mt-7 space-y-5">
                  {DURUM_SIRASI.map((d, i) => {
                    const gecildi = aktifIdx >= i
                    const aktif = aktifIdx === i
                    return (
                      <li key={d} className="flex gap-4">
                        <span className="relative flex flex-col items-center">
                          <span
                            className={`mt-1 h-2.5 w-2.5 rounded-full ${
                              gecildi ? 'bg-accent' : 'border border-line bg-bg'
                            }`}
                          />
                          {i < DURUM_SIRASI.length - 1 && (
                            <span className={`mt-1 w-px flex-1 ${gecildi ? 'bg-accent/40' : 'bg-line'}`} />
                          )}
                        </span>
                        <span className="pb-1">
                          <span className={`block text-[14px] ${aktif ? 'text-ink' : gecildi ? 'text-ink-soft' : 'text-muted'}`}>
                            {DURUM_ETIKETLERI[d]}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}

              {sonuc.olaylar && sonuc.olaylar.length > 0 && (
                <details className="mt-8 border-t border-line pt-5">
                  <summary className="cursor-pointer text-[12px] uppercase tracking-[0.14em] text-muted hover:text-ink">
                    Hareket geçmişi
                  </summary>
                  <ul className="mt-4 space-y-3">
                    {sonuc.olaylar.map((o, i) => (
                      <li key={i} className="text-[13px]">
                        <span className="text-ink">{o.etiket}</span>
                        {o.not && <span className="text-ink-soft"> — {o.not}</span>}
                        <span className="block text-[12px] text-muted">{ts(o.zaman)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
