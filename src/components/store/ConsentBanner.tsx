'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
// Rıza modülü (lib/analytics/consent) sunucu tarafında kalır; band yalnız
// ihtiyacı olan iki sabiti ve kendi çözümleyicisini taşır — böylece o modül
// istemci paketine hiç girmez (Faz 12 cilası).
const CONSENT_COOKIE = 'nb_consent'
const CONSENT_VERSION = 'v1.0'

type ConsentCategories = { zorunlu: true; analitik_gelismis: boolean; pazarlama: boolean }
const DEFAULT_CONSENT: ConsentCategories = { zorunlu: true, analitik_gelismis: false, pazarlama: false }

function parseConsent(ham: string | undefined): { categories: ConsentCategories; version: string } | null {
  if (!ham) return null
  try {
    const d = JSON.parse(decodeURIComponent(ham))
    if (!d?.categories) return null
    return {
      categories: {
        zorunlu: true,
        analitik_gelismis: Boolean(d.categories.analitik_gelismis),
        pazarlama: Boolean(d.categories.pazarlama),
      },
      version: String(d.version ?? ''),
    }
  } catch {
    return null
  }
}

/**
 * Kategori açıklamaları yalnız bu bandda kullanılıyor; ortak modülde
 * durduğunda rıza kararı vermiş ziyaretçilerin paketine de giriyordu (Faz 12 cilası).
 */
const KATEGORI_METINLERI: {
  key: keyof ConsentCategories
  baslik: string
  aciklama: string
  /** Tek satırlık künye: süre · hukuki sebep (KVKK). */
  kunye: string
  kilitli?: boolean
  pasif?: boolean
}[] = [
  {
    key: 'zorunlu',
    baslik: 'Zorunlu',
    aciklama:
      'Sepetiniz, oturumunuz ve güvenlik için gereken teknik kayıtlar. Ayrıca kimliğinizle ' +
      'ilişkilendirilmeyen, tamamen anonim ziyaret sayımı yaparız — çerez kullanmadan, ' +
      'IP adresinizi saklamadan. Bu kapatılamaz.',
    kunye: 'Süre: tercih kaydı 365 gün, sepet/favori siz silene kadar · Hukuki sebep: sözleşmenin ifası ve meşru menfaat (KVKK m.5/2-c, f)',
    kilitli: true,
  },
  {
    key: 'analitik_gelismis',
    baslik: 'Analitik — gelişmiş',
    aciklama:
      'Tarayıcınıza kalıcı bir ziyaretçi kimliği yazılır; böylece tekrar gelen ziyaretçileri ' +
      've ziyaretler arası yolculuğu görebiliriz. Yalnız bizim sunucumuzda tutulur, ' +
      'üçüncü tarafla paylaşılmaz.',
    kunye: 'Süre: 13 ay (rızayı geri alırsanız hemen silinir) · Hukuki sebep: açık rıza (KVKK m.5/1)',
  },
  {
    key: 'pazarlama',
    baslik: 'Pazarlama',
    aciklama:
      'Şu anda sitemizde hiçbir reklam pikseli ya da izleyici bulunmuyor. Bu kategori, ' +
      'ileride eklenmesi hâlinde onayınızın sorulacağı yeri şimdiden ayırır.',
    kunye: 'Süre: — · Hukuki sebep: açık rıza (KVKK m.5/1); şu an hiçbir çerez çalıştırılmıyor',
    pasif: true,
  },
]

/**
 * KVKK rıza bandı (Faz 12).
 *
 * «Kabul et» ve «Reddet» aynı görsel ağırlıkta — karanlık desen yok.
 * Üçüncü seçenek «Ayarlar» kategori kırılımını açar. Footer'daki «Çerez
 * tercihleri» bağlantısı bu bileşeni her zaman yeniden açabilir
 * (window event: nb:consent-ac).
 */
export default function ConsentBanner() {
  // Gösterim kararını ConsentGate verir; bu bileşen yüklendiyse zaten
  // gösterilecek demektir (Faz 12 cilası).
  const [acik, setAcik] = useState(true)
  const [ayarlar, setAyarlar] = useState(false)
  const [secim, setSecim] = useState<ConsentCategories>(DEFAULT_CONSENT)
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const bantRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Daha önce karar verilmişse (footer'dan yeniden açılış) mevcut seçimler
    // işaretli gelsin.
    const cerez = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
      ?.slice(CONSENT_COOKIE.length + 1)

    const durum = parseConsent(cerez)
    if (durum) {
      setSecim(durum.categories)
      // Kararını vermiş ziyaretçi bandı ancak footer bağlantısıyla açar:
      // doğrudan ayarlar görünümü daha anlamlı.
      if (durum.version === CONSENT_VERSION) setAyarlar(true)
    }

    const yenidenAc = () => {
      setAyarlar(true)
      setAcik(true)
    }
    window.addEventListener('nb:consent-ac', yenidenAc)
    return () => window.removeEventListener('nb:consent-ac', yenidenAc)
  }, [])

  // Bant sayfanın altına yapışık; görünürken gövdeye kendi yüksekliği kadar
  // boşluk eklenir ki son ürün kartlarının/footer'ın üstünü örtmesin. Ölçülen
  // yükseklik ayrıca `--nb-consent-h` değişkenine yazılır: WhatsApp düğmesi ve
  // mobil satın-al çubuğu (position: fixed oldukları için gövde boşluğundan
  // etkilenmezler) kendilerini bu kadar yukarı iter. Bant kapanınca ikisi de
  // geri alınır.
  useEffect(() => {
    if (!acik) {
      document.documentElement.style.removeProperty('--nb-consent-h')
      return
    }
    const uygula = () => {
      const h = bantRef.current?.offsetHeight ?? 0
      document.body.style.paddingBottom = h ? `${h}px` : ''
      document.documentElement.style.setProperty('--nb-consent-h', `${h}px`)
    }
    uygula()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(uygula) : null
    if (ro && bantRef.current) ro.observe(bantRef.current)
    window.addEventListener('resize', uygula)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', uygula)
      document.body.style.paddingBottom = ''
      document.documentElement.style.removeProperty('--nb-consent-h')
    }
  }, [acik, ayarlar])

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

  // Kompakt bant (Faz 13C): masaüstünde tek satır, mobilde en fazla iki satır.
  // Reddet ve Kabul et AYNI ölçüde ve aynı kontrast ailesinde — KVKK karanlık
  // desen yasağı gereği reddetmek kabul etmek kadar kolay görünmeli.
  const dugme =
    'min-h-[36px] shrink-0 px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-50'
  // Ayarlar görünümündeki geniş düğmeler (alt alta sığsın diye esner).
  const genisDugme = `${dugme} flex-1`

  return (
    <div
      ref={bantRef}
      role="dialog"
      aria-label="Çerez tercihleri"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-bg motion-safe:animate-[nbConsentIn_.28s_ease-out]"
    >
      <div
        className={
          ayarlar
            ? 'mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8'
            : 'mx-auto max-w-[1400px] px-4 py-2.5 sm:px-6 lg:px-8'
        }
      >
        {!ayarlar ? (
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-[13px] leading-snug text-ink-soft">
              Sitemizi geliştirmek için anonim ziyaret istatistikleri tutuyoruz. Dilerseniz tekrar
              gelen ziyaretçi analizine de izin verebilirsiniz.{' '}
              <Link href="/cerez-politikasi" className="text-accent-deep underline underline-offset-4">
                Çerez Politikası
              </Link>
              {' · '}
              <Link href="/kvkk" className="text-accent-deep underline underline-offset-4">
                KVKK Aydınlatma Metni
              </Link>
            </p>
            <div className="flex shrink-0 items-center gap-2">
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
                className="shrink-0 px-2 py-2 text-[11px] text-muted underline underline-offset-4 transition-colors hover:text-ink"
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
            <p className="text-[12px] text-ink-soft">
              Ayrıntılar:{' '}
              <Link href="/cerez-politikasi" className="text-accent-deep underline underline-offset-4">
                Çerez Politikası
              </Link>
              {' · '}
              <Link href="/kvkk" className="text-accent-deep underline underline-offset-4">
                KVKK Aydınlatma Metni
              </Link>
            </p>

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
                      {/* Süre ve hukuki sebep — KVKK şeffaflık gereği tek satırda. */}
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                        {k.kunye}
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
                className={`${genisDugme} border border-ink text-ink hover:bg-surface-muted`}
              >
                Tümünü reddet
              </button>
              <button
                type="button"
                disabled={gonderiliyor}
                onClick={() => kaydet(secim, 'ayarlar')}
                className={`${genisDugme} border border-ink bg-ink text-bg hover:bg-ink/90`}
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
