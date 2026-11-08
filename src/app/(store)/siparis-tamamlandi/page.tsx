import Link from 'next/link'
import GiftBoxAnimation from '@/components/store/GiftBoxAnimation'
import SiparisNoKarti from '@/components/store/SiparisNoKarti'
import HavaleBilgiKarti from '@/components/store/HavaleBilgiKarti'
import { createServiceClient } from '@/lib/supabase/service'
import { ibanBicimle } from '@/lib/odeme/havale'
import { BaglamliSaticiPuaniSatiri } from '@/components/store/SaticiPuaniContext'

export const dynamic = 'force-dynamic'

type HavaleBekleyen = { tutar: number; alici: string; banka: string; iban: string }

/**
 * Havale/EFT siparişi ödeme bekliyorsa bilgileri döner (7 Kas 2026).
 * Yalnız tutar ve satıcının hesap bilgisi gösterilir — müşterinin adı,
 * adresi gibi kişisel veri bu sayfaya hiç gelmez.
 */
async function havaleBekleyen(siparisNo: string): Promise<HavaleBekleyen | null> {
  if (!/^NBS-\d{10,16}$/.test(siparisNo)) return null
  try {
    const { data } = await createServiceClient()
      .from('orders')
      .select('status, total, metadata')
      .eq('order_number', siparisNo)
      .maybeSingle()
    const h = (data?.metadata as any)?.havale
    if (!data || (data.metadata as any)?.odeme_yontemi !== 'havale' || data.status !== 'pending' || !h) return null
    return {
      tutar: Number(data.total) || 0,
      alici: String(h.alici ?? ''),
      banka: String(h.banka ?? ''),
      iban: ibanBicimle(String(h.iban ?? '')),
    }
  } catch {
    return null
  }
}

export default async function SiparisTamamlandiPage({
  searchParams,
}: {
  searchParams: Promise<{ siparis?: string; odeme?: string }>
}) {
  const { siparis: orderNumber, odeme } = await searchParams
  const havale = orderNumber && odeme === 'havale' ? await havaleBekleyen(orderNumber) : null

  if (orderNumber && havale) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-[34px] lg:text-[40px] font-medium text-ink mb-3">
          Siparişiniz Alındı
        </h1>
        <p className="text-[13px] font-body text-ink-soft mb-6 leading-relaxed">
          Ödemenizi aşağıdaki hesaba havale/EFT ile gönderdiğinizde siparişinizi onaylayıp
          kargoya hazırlıyoruz. Onaylandığında size e-posta göndereceğiz.
        </p>
        <HavaleBilgiKarti siparisNo={orderNumber} {...havale} />
        <p className="text-[12px] font-body text-ink-soft mb-2 leading-relaxed">
          <strong>Açıklama alanına yalnız sipariş numaranızı yazın;</strong> ödemenizi bununla
          eşleştiriyoruz. Ödemenizi 2 gün içinde yapmanızı rica ederiz.
        </p>
        {/* 8 Kas 2026: ödemeyi göndermeden önceki son güven anı (bağlamdan;
            puan yoksa satır basılmaz, boşluk değişmez). */}
        <div className="mb-8 space-y-5">
          <p className="text-[12px] font-body text-muted">
            Bu bilgiler e-postanıza da gönderildi — birkaç dakika içinde gelmezse gereksiz (spam)
            klasörünü kontrol edin.
          </p>
          <BaglamliSaticiPuaniSatiri />
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/urunler"
            className="inline-block border border-line text-ink-soft text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:border-accent-line hover:text-accent-deep transition-all"
          >
            Alışverişe Devam
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="mb-6">
        <GiftBoxAnimation />
      </div>
      <h1 className="font-heading text-[34px] lg:text-[40px] font-medium text-ink mb-3">
        Siparişiniz Alındı
      </h1>
      <p className="text-[13px] font-body text-ink-soft mb-4 leading-relaxed">
        Ödemeniz başarıyla tamamlandı. Siparişinizi en kısa sürede hazırlayıp kargoya vereceğiz.
      </p>
      {/* Faz 11C: onay maili ulaşmazsa müşterinin elindeki tek kayıt bu
          ekran — numara büyük, kopyalanabilir, "not alın" uyarılı ve mail
          gelmezse tekrar gönderme düğmeli. */}
      {orderNumber && <SiparisNoKarti orderNumber={orderNumber} />}
      <p className="text-[12px] font-body text-muted mb-8">
        Sipariş onay e-postası kayıtlı adresinize gönderildi — birkaç dakika içinde
        gelmezse gereksiz (spam) klasörünü kontrol edin.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/hesabim"
          className="inline-block bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
        >
          Siparişlerim
        </Link>
        <Link
          href="/urunler"
          className="inline-block border border-line text-ink-soft text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:border-accent-line hover:text-accent-deep transition-all"
        >
          Alışverişe Devam
        </Link>
      </div>
    </div>
  )
}
