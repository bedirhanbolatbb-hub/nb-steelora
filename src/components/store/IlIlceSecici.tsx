'use client'

import { useEffect, useMemo, useState } from 'react'
import Input from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { adAnahtari } from '@/lib/shipping/adAnahtari'

/**
 * Ödeme sayfası il/ilçe seçici (17 Kas 2026).
 *
 * Önceden il ve ilçe elle yazılıyordu; "Mersın", "Merkez" ya da yanlış ilçe
 * yazılınca kargo kaydında il/ilçe eşleşmiyor ve panel elle seçim istiyordu
 * (deneme siparişinde görüldü). Liste, kargo sağlayıcısının kendi il/ilçe
 * adlarından üretilmiş sabit dosyadan gelir (lib/shipping/trBolgeler.json):
 * seçilen ad sağlayıcıdakiyle birebir aynı olduğu için kargo kaydı kendiliğinden
 * eşleşir. Sunucuya istek atılmaz, sayfa hızı etkilenmez.
 *
 * Liste herhangi bir sebeple yüklenemezse eski serbest metin alanlarına düşer;
 * müşteri hiçbir durumda adres giremez hâle gelmez.
 */

type IlKaydi = { ad: string; ilceler: string[] }
type Veri = { iller: IlKaydi[] }

const SECICI_SINIF =
  'w-full border border-line bg-white px-4 py-3 text-base sm:text-sm font-body text-ink focus:border-accent-line focus:outline-none transition-colors disabled:opacity-60'

export default function IlIlceSecici({
  il,
  ilce,
  onIl,
  onIlce,
}: {
  il: string
  ilce: string
  onIl: (deger: string) => void
  onIlce: (deger: string) => void
}) {
  const [veri, setVeri] = useState<Veri | null>(null)
  const [hata, setHata] = useState(false)

  useEffect(() => {
    let canli = true
    import('@/lib/shipping/trBolgeler.json')
      .then((m) => {
        const v = m.default as Veri
        if (!canli) return
        if (Array.isArray(v?.iller) && v.iller.length > 0) setVeri(v as Veri)
        else setHata(true)
      })
      .catch(() => canli && setHata(true))
    return () => {
      canli = false
    }
  }, [])

  const seciliIl = useMemo(() => {
    if (!veri) return null
    const k = adAnahtari(il)
    return k ? veri.iller.find((x) => adAnahtari(x.ad) === k) ?? null : null
  }, [veri, il])

  const seciliIlce = useMemo(() => {
    if (!seciliIl) return ''
    const k = adAnahtari(ilce)
    return (k && seciliIl.ilceler.find((x) => adAnahtari(x) === k)) || ''
  }, [seciliIl, ilce])

  // Önceden yazılmış (ör. tarayıcı doldurmuş) adı listedeki doğru yazımla eşitle.
  useEffect(() => {
    if (seciliIl && seciliIl.ad !== il) onIl(seciliIl.ad)
    if (seciliIlce && seciliIlce !== ilce) onIlce(seciliIlce)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seciliIl, seciliIlce])

  if (hata) {
    return (
      <>
        <Input
          placeholder="İl *"
          autoComplete="address-level1"
          value={il}
          onChange={(e) => onIl(e.target.value)}
        />
        <Input
          placeholder="İlçe *"
          autoComplete="address-level2"
          value={ilce}
          onChange={(e) => onIlce(e.target.value)}
        />
      </>
    )
  }

  return (
    <>
      <select
        aria-label="İl"
        name="il"
        autoComplete="address-level1"
        disabled={!veri}
        value={seciliIl?.ad ?? ''}
        onChange={(e) => {
          const yeni = e.target.value
          onIl(yeni)
          if (adAnahtari(yeni) !== adAnahtari(il)) onIlce('')
        }}
        className={cn(SECICI_SINIF, !seciliIl && 'text-muted')}
      >
        <option value="">{veri ? 'İl seçin *' : 'İller yükleniyor…'}</option>
        {veri?.iller.map((x) => (
          <option key={x.ad} value={x.ad} className="text-ink">
            {x.ad}
          </option>
        ))}
      </select>
      <select
        aria-label="İlçe"
        name="ilce"
        autoComplete="address-level2"
        disabled={!seciliIl}
        value={seciliIlce}
        onChange={(e) => onIlce(e.target.value)}
        className={cn(SECICI_SINIF, !seciliIlce && 'text-muted')}
      >
        <option value="">{seciliIl ? 'İlçe seçin *' : 'Önce il seçin'}</option>
        {seciliIl?.ilceler.map((x) => (
          <option key={x} value={x} className="text-ink">
            {x}
          </option>
        ))}
      </select>
    </>
  )
}
