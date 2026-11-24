import Link from 'next/link'
import { dugmeSinifi } from '@/components/ui/Button'
import { Clock, XCircle } from 'lucide-react'
import { bankaYanitiAciklamasi } from '@/lib/tosla/bankaYaniti'

/**
 * Kartla ödeme sonucu (12 Kas 2026 · Tosla).
 *
 * İki ayrı durum, iki ayrı söz:
 *  - Banka reddetti / ödeme tamamlanmadı → "tekrar deneyin".
 *  - `durum=kontrol` → ödeme alınmış OLABİLİR (dönüş yarıda kaldı, sorgu
 *    cevap vermedi, tutar incelemede). Müşteriye "tekrar deneyin" denirse
 *    ikinci kez ödeyebilir; bu yüzden "kontrol ediyoruz, size yazacağız"
 *    denir. Gecelik süpürge siparişi Tosla'ya yeniden sorar.
 *
 * `neden` bankanın mesajıdır (Tosla'dan gelir, 120 karakterle sınırlı);
 * React metni kaçırarak basar.
 */
export default async function BasarisizPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; neden?: string; siparis?: string; kod?: string }>
}) {
  const { durum, neden, siparis, kod } = await searchParams
  const kontrol = durum === 'kontrol'
  const siparisNo = siparis && /^NBS-\d{13}$/.test(siparis) ? siparis : null
  const bankaNedeni = !kontrol && neden ? neden.slice(0, 120) : null
  const bankaKodu = !kontrol && kod && /^[0-9A-Za-z]{1,4}$/.test(kod) ? kod : null
  // 21 Kas 2026: bankanın İngilizce kısa yanıtı ("Transaction is not valid.")
  // müşteriye ne yapacağını söylemiyordu; Türkçe açıklama önce gelir.
  const aciklama = !kontrol ? bankaYanitiAciklamasi(bankaKodu, bankaNedeni) : null

  if (kontrol) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={30} className="text-amber-700" />
        </div>
        <h1 className="font-heading text-[32px] text-ink mb-3">Ödemeniz Kontrol Ediliyor</h1>
        <p className="text-[15px] font-body text-ink-soft mb-4 leading-relaxed">
          Ödemenizin sonucunu bankadan henüz kesin olarak alamadık. Lütfen tekrar ödeme
          yapmayın: kartınızdan çekim yapıldıysa siparişiniz onaylanır ve size e-posta
          göndeririz. Çekim yapılmadıysa da e-postayla bilgilendiririz.
        </p>
        {siparisNo && (
          <p className="text-[13px] font-body text-ink-soft mb-8">
            Sipariş numaranız: <span className="font-mono text-ink">{siparisNo}</span>
          </p>
        )}
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            prefetch={false}
            href="/iletisim"
            className={dugmeSinifi('outline', 'md')}
          >
            Bize Ulaşın
          </Link>
          <Link
            prefetch={false}
            href="/urunler"
            className={dugmeSinifi('ghost', 'md', 'underline underline-offset-4')}
          >
            Alışverişe Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle size={32} className="text-red-600" />
      </div>
      <h1 className="font-heading text-[32px] text-ink mb-3">
        Ödeme Başarısız
      </h1>
      <p className="text-[15px] font-body text-ink-soft mb-3 leading-relaxed">
        Ödeme işlemi tamamlanamadı; kartınızdan çekim yapılmadı. Kart bilgilerinizi kontrol
        edip tekrar deneyebilir, farklı bir kart kullanabilir ya da havale/EFT ile ödeyebilirsiniz.
      </p>
      {aciklama && (
        <p className="text-[15px] font-body text-ink mb-3 leading-relaxed">{aciklama}</p>
      )}
      {bankaNedeni && (
        <p className="text-[13px] font-body text-ink-soft mb-8">
          Bankanın yanıtı: {bankaNedeni}
          {bankaKodu ? ` (kod ${bankaKodu})` : ''}
        </p>
      )}
      <div className={`mx-auto flex max-w-[340px] flex-col items-stretch gap-3 ${bankaNedeni ? '' : 'mt-5'}`}>
        <Link
          prefetch={false}
          href="/odeme"
          className={dugmeSinifi('primary', 'md')}
        >
          Tekrar Dene
        </Link>
        {/* 21 Kas 2026: kartı reddedilen müşteriye ikinci yol tek tıkla —
            ödeme adımı havale/EFT seçili açılır (sepet aynı kalır). */}
        <Link
          prefetch={false}
          href="/odeme?yontem=havale"
          className={dugmeSinifi('outline', 'md')}
        >
          Havale / EFT ile öde
        </Link>
        <Link
          prefetch={false}
          href="/urunler"
          className={dugmeSinifi('ghost', 'md', 'underline underline-offset-4')}
        >
          Alışverişe Dön
        </Link>
      </div>
    </div>
  )
}
