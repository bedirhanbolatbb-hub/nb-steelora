import type { Metadata } from 'next'
import SaticiKunyesi from '@/components/store/SaticiKunyesi'
import { kunyeGetir } from '@/lib/legal/veriSorumlusu'
import IletisimClient from './IletisimClient'

export const metadata: Metadata = { title: 'İletişim' }
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
      <IletisimClient />
      <section className="border-t border-line bg-surface-muted/40">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent">Yasal</p>
          <h2 className="mt-2 font-heading text-[26px] font-medium text-ink">Satıcı Bilgileri</h2>
          <div className="mt-5 max-w-[68ch] text-[13px] leading-relaxed font-body text-ink-soft">
            <SaticiKunyesi kunye={kunye} baslikYok />
          </div>
        </div>
      </section>
    </>
  )
}
