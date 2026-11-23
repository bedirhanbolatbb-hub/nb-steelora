import type { Metadata } from 'next'
import SaticiKunyesi from '@/components/store/SaticiKunyesi'
import JsonLd from '@/components/seo/JsonLd'
import KirintiYolu from '@/components/seo/KirintiYolu'
import { kunyeGetir } from '@/lib/legal/veriSorumlusu'
import { webPageJsonLd, sayfaUstVerisi } from '@/lib/seo'
import IletisimClient from './IletisimClient'

/** Meta açıklaması ile ContactPage şeması aynı cümleyi taşır. */
const ILETISIM_ACIKLAMA =
  'NB Steelora ile iletişim: mesaj formu, e-posta ve telefon ile satıcı künyesi — unvan, adres ve vergi bilgileri.'

export const metadata: Metadata = sayfaUstVerisi({
  baslik: 'İletişim',
  aciklama: ILETISIM_ACIKLAMA,
  yol: '/iletisim',
})
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
      <IletisimClient adres={kunye.adres} telefon={kunye.telefon} />
      <section className="border-t border-line bg-surface-muted/40">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="font-heading text-[24px] font-medium text-ink lg:text-[26px]">Satıcı Bilgileri</h2>
          <div className="mt-4 max-w-[68ch] text-[14px] leading-relaxed font-body text-ink-soft">
            <SaticiKunyesi kunye={kunye} baslikYok />
          </div>
        </div>
      </section>
    </>
  )
}
