import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPageLayout from '@/components/store/LegalPageLayout'
import JsonLd from '@/components/seo/JsonLd'
import { SSS_TAMAMI } from '@/lib/legal/sss'

export const metadata: Metadata = {
  title: 'Sık Sorulan Sorular',
  description:
    'Çelik takı kararır mı, suyla teması sorun olur mu, iade nasıl yapılır, kargo ücreti var mı — en çok sorulanların cevapları.',
  alternates: { canonical: '/sss' },
}

/**
 * Sık sorulan sorular (Faz 11A).
 *
 * Sayfa 404 veriyordu ama müşteri bu soruları soruyor; cevaplar sitede
 * dağınık hâlde (bakım cümleleri ürün sayfasında, iade koşulları kargo-iade
 * sayfasında) duruyordu. Tek yerde toplandı.
 *
 * İçerik lib/legal/sss.ts'ten gelir ve YALNIZ mevcut yayın metinlerinden
 * türer — yeni vaat yazılmaz. Aynı kaynak ürün sayfası akordeonunu da besler.
 */
export default function SssPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: SSS_TAMAMI.map((s) => ({
            '@type': 'Question',
            name: s.soru,
            acceptedAnswer: { '@type': 'Answer', text: s.cevap },
          })),
        }}
      />
      <LegalPageLayout eyebrow="Yardım" title="Sık Sorulan Sorular" path="/sss" semaTipi={null}>
        <div className="space-y-8">
          {SSS_TAMAMI.map((s) => (
            <section key={s.soru}>
              <h2 className="font-heading text-[20px] font-light text-ink">{s.soru}</h2>
              <p className="mt-2 font-body text-[14px] leading-relaxed text-ink-soft">{s.cevap}</p>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-line pt-6 font-body text-[13px] text-ink-soft">
          Aradığınız cevabı bulamadıysanız{' '}
          <Link href="/iletisim" className="text-accent-deep underline underline-offset-4">
            bize yazın
          </Link>
          . Kargo ve iade koşullarının tamamı{' '}
          <Link href="/kargo-ve-iade" className="text-accent-deep underline underline-offset-4">
            Kargo, İade ve Değişim
          </Link>{' '}
          sayfasında.
        </p>
      </LegalPageLayout>
    </>
  )
}
