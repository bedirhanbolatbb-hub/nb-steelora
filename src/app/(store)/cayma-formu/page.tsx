import LegalPageLayout from '@/components/store/LegalPageLayout'
import SaticiKunyesi from '@/components/store/SaticiKunyesi'
import { kunyeGetir } from '@/lib/legal/veriSorumlusu'
import { CAYMA_SURESI_GUN, SOZLESME_YOLLARI } from '@/lib/legal/sozlesme'
import { ORG_EMAIL } from '@/lib/seo'
import CaymaFormuAraclar from './CaymaFormuAraclar'
import Link from 'next/link'

export const metadata = { title: 'Örnek Cayma Formu' }
export const dynamic = 'force-dynamic'

/**
 * Örnek Cayma Formu — Mesafeli Sözleşmeler Yönetmeliği EK'i (Faz 20).
 *
 * Yönetmeliğin sonunda TEK bir ek vardır, başlığı "EK — ÖRNEK CAYMA FORMU";
 * Ek-1/Ek-2 diye bir ayrım yoktur. Alan başlıkları aşağıda BİREBİR
 * korunmuştur.
 *
 * m.11/2 iki şeyi birlikte söylüyor: (i) tüketici bu formu KULLANABİLİR ama
 * ZORUNLU DEĞİLDİR — açık bir cayma beyanı da geçerlidir; (ii) internet
 * sitesi üzerinden cayma sunuluyorsa talebin ulaştığına dair teyit
 * bildiriminin DERHÂL iletilmesi zorunludur. Sayfa ikisini de yazıyor;
 * "formu doldurmayan iade edemez" demek hukuka aykırı olurdu.
 */
export default async function CaymaFormuPage() {
  const kunye = await kunyeGetir()

  const alanlar = [
    'Sipariş tarihi veya teslim tarihi',
    'Cayma hakkına konu mal veya hizmet',
    'Cayma hakkına konu mal veya hizmetin bedeli',
    'Tüketicinin adı ve soyadı',
    'Tüketicinin adresi',
    'Tüketicinin imzası (sadece kâğıt üzerinde gönderilmesi hâlinde)',
    'Tarih',
  ]

  return (
    <LegalPageLayout eyebrow="Hukuk" title="Örnek Cayma Formu">
      <p>
        Bu form, Mesafeli Sözleşmeler Yönetmeliği ekinde yer alan örnek cayma formudur.
        <strong> Doldurmak zorunlu değildir:</strong> cayma kararınızı bildiren açık bir
        beyanı e-posta ile göndermeniz de yeterlidir. Talebiniz bize ulaştığında size
        derhâl teyit bildirimi gönderilir.
      </p>
      <p>
        Cayma süresi, ürünü teslim aldığınız günden itibaren{' '}
        <strong>{CAYMA_SURESI_GUN} gündür</strong>. Ayrıntılar için{' '}
        <Link href={SOZLESME_YOLLARI.onBilgilendirme}>ön bilgilendirme formuna</Link> ve{' '}
        <Link href={SOZLESME_YOLLARI.kargoVeIade}>kargo ve iade sayfasına</Link>{' '}
        bakabilirsiniz. <strong>İade kargo ücreti tarafımıza aittir.</strong>
      </p>

      <CaymaFormuAraclar eposta={ORG_EMAIL} />

      <hr />

      <h2>Kime</h2>
      <SaticiKunyesi kunye={kunye} baslikYok />
      <p>E-posta: {ORG_EMAIL}</p>

      <h2>Beyan</h2>
      <p>
        Bu formla aşağıdaki malların satışına veya hizmetlerin sunulmasına ilişkin
        sözleşmeden cayma hakkımı kullandığımı beyan ederim.
      </p>

      <div className="not-prose my-6 space-y-5">
        {alanlar.map((alan) => (
          <div key={alan}>
            <p className="mb-2 font-body text-[12px] text-ink-soft">{alan}</p>
            <div className="h-8 border-b border-line" />
          </div>
        ))}
      </div>

      <p className="text-[12px]">
        Bu form, sadece sözleşmeden cayma hakkı kullanılmak istenildiğinde doldurulup
        gönderilecektir.
      </p>
    </LegalPageLayout>
  )
}
