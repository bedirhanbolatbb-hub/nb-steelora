import Link from 'next/link'
import { dugmeSinifi } from '@/components/ui/Button'
import { redirect } from 'next/navigation'
import GiftBoxAnimation from '@/components/store/GiftBoxAnimation'
import SiparisNoKarti from '@/components/store/SiparisNoKarti'
import HavaleBilgiKarti from '@/components/store/HavaleBilgiKarti'
import { createServiceClient } from '@/lib/supabase/service'
import { ibanBicimle } from '@/lib/odeme/havale'
import { BaglamliSaticiPuaniSatiri } from '@/components/store/SaticiPuaniContext'
import SepetiBosalt from '@/components/store/SepetiBosalt'
import { KART_SIPARIS_DESENI } from '@/lib/tosla/ortak'

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

/**
 * Kart siparişinin ödeme durumu (12 Kas 2026). Tosla dönüşü buraya YALNIZ
 * ödeme Tosla'ya sorulup doğrulandıktan sonra yönlendirir; yine de sayfa
 * kararını kendi verir: adres çubuğuna elle yazılan bir numara sepeti
 * silmez, ödemesi doğrulanmamış siparişe "ödendi" denmez.
 */
async function kartSiparisiDurumu(siparisNo: string): Promise<'odendi' | 'bekliyor' | null> {
  if (!KART_SIPARIS_DESENI.test(siparisNo)) return null
  try {
    const { data } = await createServiceClient()
      .from('orders')
      .select('status, metadata')
      .eq('order_number', siparisNo)
      .maybeSingle()
    if (!data || (data.metadata as any)?.odeme_yontemi !== 'kart') return null
    if (['paid', 'preparing', 'shipped', 'delivered'].includes(String(data.status))) return 'odendi'
    if (data.status === 'pending') return 'bekliyor'
    return null
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
  const kart = orderNumber && odeme === 'kart' ? await kartSiparisiDurumu(orderNumber) : null
  if (orderNumber && kart === 'bekliyor') {
    redirect(`/odeme/basarisiz?durum=kontrol&siparis=${encodeURIComponent(orderNumber)}`)
  }

  if (orderNumber && havale) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-[34px] lg:text-[40px] font-medium text-ink mb-3">
          Siparişiniz Alındı
        </h1>
        <p className="text-[15px] font-body text-ink-soft mb-6 leading-relaxed">
          Ödemenizi aşağıdaki hesaba havale/EFT ile gönderdiğinizde siparişinizi onaylayıp
          kargoya hazırlıyoruz. Onaylandığında size e-posta göndereceğiz.
        </p>
        <HavaleBilgiKarti siparisNo={orderNumber} {...havale} />
        <p className="text-[14px] font-body text-ink-soft mb-2 leading-relaxed">
          <strong>Açıklama alanına yalnız sipariş numaranızı yazın;</strong> ödemenizi bununla
          eşleştiriyoruz. Ödemenizi 2 gün içinde yapmanızı rica ederiz.
        </p>
        {/* 8 Kas 2026: ödemeyi göndermeden önceki son güven anı (bağlamdan;
            puan yoksa satır basılmaz, boşluk değişmez). */}
        <div className="mb-8 space-y-5">
          <p className="text-[13px] font-body leading-relaxed text-muted">
            Bu bilgiler e-postanıza da gönderildi — birkaç dakika içinde gelmezse gereksiz (spam)
            klasörünü kontrol edin.
          </p>
          <BaglamliSaticiPuaniSatiri />
        </div>
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            prefetch={false}
            href="/urunler"
            className={dugmeSinifi('outline', 'md')}
          >
            Alışverişe devam
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      {kart === 'odendi' && <SepetiBosalt />}
      <div className="mb-6">
        <GiftBoxAnimation />
      </div>
      <h1 className="font-heading text-[34px] lg:text-[40px] font-medium text-ink mb-3">
        Siparişiniz Alındı
      </h1>
      <p className="text-[15px] font-body text-ink-soft mb-4 leading-relaxed">
        Ödemeniz başarıyla tamamlandı. Siparişinizi en kısa sürede hazırlayıp kargoya vereceğiz.
      </p>
      {/* Faz 11C: onay maili ulaşmazsa müşterinin elindeki tek kayıt bu
          ekran — numara büyük, kopyalanabilir, "not alın" uyarılı ve mail
          gelmezse tekrar gönderme düğmeli. */}
      {orderNumber && <SiparisNoKarti orderNumber={orderNumber} />}
      <p className="text-[13px] font-body leading-relaxed text-muted mb-8">
        Sipariş onay e-postası kayıtlı adresinize gönderildi — birkaç dakika içinde
        gelmezse gereksiz (spam) klasörünü kontrol edin.
      </p>
      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        {/* 24 Kas 2026: birincil eylem "Siparişlerim" idi; üyeliksiz müşteri
            (çoğunluk) giriş ekranına düşüyordu. Takip sayfası üyelik
            istemez ve sipariş numarası hazır gelir. */}
        {orderNumber && (
          <Link
            prefetch={false}
            href={`/kargo-takip?no=${encodeURIComponent(orderNumber)}`}
            className={dugmeSinifi('primary', 'md')}
          >
            Siparişimi takip et
          </Link>
        )}
        <Link prefetch={false} href="/urunler" className={dugmeSinifi('outline', 'md')}>
          Alışverişe devam
        </Link>
      </div>
      <p className="mt-5 text-[13px] font-body text-muted">
        Üyeyseniz siparişiniz{' '}
        <Link
          prefetch={false}
          href="/hesabim"
          className="text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Hesabım
        </Link>{' '}
        sayfasında da görünür.
      </p>
    </div>
  )
}
