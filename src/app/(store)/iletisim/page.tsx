import type { Metadata } from 'next'
import SaticiKunyesi from '@/components/store/SaticiKunyesi'
import JsonLd from '@/components/seo/JsonLd'
import KirintiYolu from '@/components/seo/KirintiYolu'
import { kunyeGetir } from '@/lib/legal/veriSorumlusu'
import { webPageJsonLd } from '@/lib/seo'
import IletisimClient from './IletisimClient'

/** Meta açıklaması ile ContactPage şeması aynı cümleyi taşır. */
const ILETISIM_ACIKLAMA =
  'NB Steelora ile iletişim: mesaj formu, e-posta ve telefon ile satıcı künyesi — unvan, adres ve vergi bilgileri.'

export const metadata: Metadata = {
  title: 'İletişim',
  description: ILETISIM_ACIKLAMA,
  alternates: { canonical: '/iletisim' },
}
export const dynamic = 'force-dynamic'

/**
 * İletişim sayfası. Form istemci tarafında (IletisimClient); satıcı künyesi
 * sunucuda okunur — E-Ticaret Kanunu ve Mesafeli Sözleşmeler Yönetmeliği
 * gereği satıcı bilgileri erişilebilir olmalı (Faz 12 tamamlama).
 */
export default async function IletisimPage() {
  const kunye = await kunyeGetir()

  return (
    <>
      {/* ContactPage'in konusu kurumun kendisi: mainEntity, ekranda basılan
          künyenin AYNI kaynağından türer (uydurma iletişim bilgisi yok). */}
      <JsonLd
        data={webPageJsonLd({
          tip: 'ContactPage',
          ad: 'İletişim',
          aciklama: ILETISIM_ACIKLAMA,
          path: '/iletisim',
          kunye: {
            unvan: kunye.unvan,
            adres: kunye.adres,
            telefon: kunye.telefon,
            vergi: kunye.vergi,
          },
        })}
      />
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-10">
        <KirintiYolu
          adimlar={[
            { ad: 'Ana Sayfa', path: '/' },
            { ad: 'İletişim', path: '/iletisim' },
          ]}
          className="mb-0"
        />
      </div>
      <IletisimClient />
      <section className="border-t border-line bg-surface-muted/40">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent-deep">Yasal</p>
          <h2 className="mt-2 font-heading text-[26px] font-medium text-ink">Satıcı Bilgileri</h2>
          <div className="mt-5 max-w-[68ch] text-[13px] leading-relaxed font-body text-ink-soft">
            <SaticiKunyesi kunye={kunye} baslikYok />
          </div>
        </div>
      </section>
    </>
  )
}
