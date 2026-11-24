'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import { dugmeSinifi } from '@/components/ui/Button'
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
            className={`-mb-px inline-flex min-h-[44px] items-center border-b font-body text-[14px] transition-colors ${
              mod === deger ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {etiket}
          </button>
        ))}
      </div>

      <form onSubmit={sorgula} className="mt-6 space-y-4">
        {mod === 'siparis' ? (
          <>
            {/* 24 Kas 2026: etiket yalnız yer tutucuydu ve alan 14 px idi
                (iPhone'da dokununca sayfa yakınlaşıyordu). */}
            <Input
              etiket="Sipariş numarası"
              ipucu="Sipariş onay e-postanızda yazar."
              placeholder="NBS-…"
              autoComplete="off"
              autoCapitalize="characters"
              value={siparisNo}
              onChange={(e) => setSiparisNo(e.target.value)}
              required
            />
            <Input
              etiket="Siparişte kullandığınız e-posta"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ornek@eposta.com"
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              required
            />
          </>
        ) : (
          <Input
            etiket="Takip kodu"
            autoComplete="off"
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            required
          />
        )}

        <button
          type="submit"
          disabled={yukleniyor}
          className={dugmeSinifi('primary', 'lg', 'w-full')}
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
            <p className="text-[12px] uppercase tracking-[0.1em] text-muted">Sipariş {sonuc.siparisNo}</p>
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

              <dl className="mt-5 space-y-2 border-y border-line py-5 text-[14px]">
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
                  <summary className="flex min-h-[44px] cursor-pointer items-center font-body text-[14px] text-ink-soft underline underline-offset-4 hover:text-ink">
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

          {/* Faz 30: üyeliksiz iade. Talep açmanın tek yolu üyeye özel
              "Siparişlerim" ekranıydı; üyeliksiz müşterinin sitede iade
              başlatmasının hiçbir yolu yoktu (7 Eyl'de gerçek müşteride
              yaşandı). Yalnız sipariş no + e-posta ile sorgulandığında ve
              sipariş teslim edildiyse görünür. */}
          {sonuc.siparisDurumu === 'delivered' && mod === 'siparis' && (
            <IadeTalebi siparisNo={siparisNo.trim()} eposta={eposta.trim()} />
          )}
        </section>
      )}
    </div>
  )
}

function IadeTalebi({ siparisNo, eposta }: { siparisNo: string; eposta: string }) {
  const [acik, setAcik] = useState(false)
  const [gerekce, setGerekce] = useState('')
  const [durum, setDurum] = useState<'bekliyor' | 'gonderiliyor' | 'tamam'>('bekliyor')
  const [hata, setHata] = useState<string | null>(null)

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault()
    setDurum('gonderiliyor')
    setHata(null)
    try {
      const res = await fetch('/api/kargo-takip/iade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: siparisNo, email: eposta, reason: gerekce.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setHata(data?.error || 'Talep oluşturulamadı. Birazdan tekrar deneyin.')
        setDurum('bekliyor')
        return
      }
      setDurum('tamam')
    } catch {
      setHata('Talep oluşturulamadı. Birazdan tekrar deneyin.')
      setDurum('bekliyor')
    }
  }

  if (durum === 'tamam') {
    return (
      <div className="mt-8 border-t border-line pt-5">
        <p className="font-heading text-[17px] text-ink">İade talebiniz alındı</p>
        <p className="mt-2 font-body text-[13px] leading-relaxed text-ink-soft">
          Teyit e-postası adresinize gönderildi. Talebinizi onayladığımızda kullanacağınız
          kargo firmasını ve iade kodunu yine e-posta ile bildireceğiz. İade kargo ücreti
          bize aittir; sizden hiçbir ücret alınmaz.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 border-t border-line pt-5">
      {!acik ? (
        <>
          <p className="font-body text-[13px] leading-relaxed text-ink-soft">
            Siparişiniz teslim edildi. Teslim tarihinden itibaren 14 gün içinde, gerekçe
            göstermeden iade edebilirsiniz. Üye olmanız gerekmez.
          </p>
          <button
            onClick={() => setAcik(true)}
            className={dugmeSinifi('outline', 'sm', 'mt-3 px-6')}
          >
            İade talebi oluştur
          </button>
        </>
      ) : (
        <form onSubmit={gonder} className="space-y-3">
          <label className="block font-body text-[13px] text-ink-soft" htmlFor="iade-gerekce">
            İade sebebiniz (isteğe bağlı)
          </label>
          <textarea
            id="iade-gerekce"
            value={gerekce}
            onChange={(e) => setGerekce(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Yazmak zorunda değilsiniz."
            className="w-full border border-line-strong bg-white px-4 py-3 font-body text-base text-ink outline-none focus:border-ink sm:text-sm"
          />
          {hata && <p role="alert" className="font-body text-[13px] text-red-700">{hata}</p>}
          <button
            type="submit"
            disabled={durum === 'gonderiliyor'}
            className={dugmeSinifi('primary', 'md')}
          >
            {durum === 'gonderiliyor' ? 'Gönderiliyor…' : 'İade talebini gönder'}
          </button>
        </form>
      )}
    </div>
  )
}
