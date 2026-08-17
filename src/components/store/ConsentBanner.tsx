'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  DEFAULT_CONSENT,
  KATEGORI_METINLERI,
  parseConsent,
  type ConsentCategories,
} from '@/lib/analytics/consent'

/**
 * KVKK rıza bandı (Faz 12).
 *
 * «Kabul et» ve «Reddet» aynı görsel ağırlıkta — karanlık desen yok.
 * Üçüncü seçenek «Ayarlar» kategori kırılımını açar. Footer'daki «Çerez
 * tercihleri» bağlantısı bu bileşeni her zaman yeniden açabilir
 * (window event: nb:consent-ac).
 */
export default function ConsentBanner() {
  const [acik, setAcik] = useState(false)
  const [ayarlar, setAyarlar] = useState(false)
  const [secim, setSecim] = useState<ConsentCategories>(DEFAULT_CONSENT)
  const [gonderiliyor, setGonderiliyor] = useState(false)

  useEffect(() => {
    const cerez = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
      ?.slice(CONSENT_COOKIE.length + 1)

    const durum = parseConsent(cerez)
    // Karar yoksa ya da rıza metni sürümü değiştiyse tekrar sorulur.
    if (!durum || durum.version !== CONSENT_VERSION) setAcik(true)
    else setSecim(durum.categories)

    const yenidenAc = () => {
      setAyarlar(true)
      setAcik(true)
    }
    window.addEventListener('nb:consent-ac', yenidenAc)
    return () => window.removeEventListener('nb:consent-ac', yenidenAc)
  }, [])

  const kaydet = async (kategoriler: ConsentCategories, kaynak: string) => {
    setGonderiliyor(true)
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: kategoriler, source: kaynak }),
      })
    } catch {
      // Rıza yazılamazsa varsayılan "reddet" durumu geçerli kalır.
    }
    setGonderiliyor(false)
    setAcik(false)
    setAyarlar(false)
  }

  if (!acik) return null

  const dugme =
    'min-h-[44px] flex-1 px-5 py-3 text-[11px] uppercase tracking-[0.16em] transition-colors disabled:opacity-50'

  return (
    <div
      role="dialog"
      aria-label="Çerez tercihleri"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-bg motion-safe:animate-[nbConsentIn_.28s_ease-out]"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
        {!ayarlar ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-[70ch] text-[13px] leading-relaxed text-ink-soft">
              Siteyi geliştirmek için ziyaret sayımı yapıyoruz. Temel sayım tamamen anonimdir
              (çerezsiz, IP saklanmadan). Tekrar gelen ziyaretçileri tanıyabilmemiz içinse
              tarayıcınıza kalıcı bir kimlik yazmamız gerekir — bunun için onayınızı istiyoruz.{' '}
              <Link href="/cerez-politikasi" className="text-accent underline underline-offset-4">
                Çerez Politikası
              </Link>
            </p>
            <div className="flex w-full shrink-0 gap-2 lg:w-auto">
              {/* Aynı ağırlık: iki düğme de aynı boyut ve kontrast ailesinde. */}
              <button
                type="button"
                disabled={gonderiliyor}
                onClick={() => kaydet({ ...DEFAULT_CONSENT, analitik_gelismis: false }, 'banner')}
                className={`${dugme} border border-ink text-ink hover:bg-surface-muted`}
              >
                Reddet
              </button>
              <button
                type="button"
                disabled={gonderiliyor}
                onClick={() =>
                  kaydet({ zorunlu: true, analitik_gelismis: true, pazarlama: false }, 'banner')
                }
                className={`${dugme} border border-ink bg-ink text-bg hover:bg-ink/90`}
              >
                Kabul et
              </button>
              <button
                type="button"
                disabled={gonderiliyor}
                onClick={() => setAyarlar(true)}
                className="min-h-[44px] px-4 text-[11px] uppercase tracking-[0.16em] text-muted underline underline-offset-4 transition-colors hover:text-ink"
              >
                Ayarlar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-[20px] font-medium text-ink">Çerez tercihleri</h2>
              <span className="text-[11px] text-muted">Sürüm {CONSENT_VERSION}</span>
            </div>

            <ul className="space-y-3">
              {KATEGORI_METINLERI.map((k) => {
                const secili = k.kilitli ? true : secim[k.key]
                return (
                  <li key={k.key} className="flex gap-3 border-b border-line pb-3 last:border-0">
                    <input
                      id={`consent-${k.key}`}
                      type="checkbox"
                      checked={Boolean(secili)}
                      disabled={k.kilitli || k.pasif}
                      onChange={(e) => setSecim({ ...secim, [k.key]: e.target.checked })}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#2A1E1E]"
                    />
                    <label htmlFor={`consent-${k.key}`} className="cursor-pointer">
                      <span className="block text-[13px] text-ink">
                        {k.baslik}
                        {k.kilitli && <span className="text-muted"> — her zaman açık</span>}
                        {k.pasif && <span className="text-muted"> — şu an kullanılmıyor</span>}
                      </span>
                      <span className="mt-0.5 block max-w-[80ch] text-[12px] leading-relaxed text-ink-soft">
                        {k.aciklama}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={gonderiliyor}
                onClick={() => kaydet({ ...DEFAULT_CONSENT, analitik_gelismis: false }, 'ayarlar')}
                className={`${dugme} border border-ink text-ink hover:bg-surface-muted`}
              >
                Tümünü reddet
              </button>
              <button
                type="button"
                disabled={gonderiliyor}
                onClick={() => kaydet(secim, 'ayarlar')}
                className={`${dugme} border border-ink bg-ink text-bg hover:bg-ink/90`}
              >
                Seçimimi kaydet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
