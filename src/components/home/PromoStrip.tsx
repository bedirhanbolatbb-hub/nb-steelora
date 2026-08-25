import Link from 'next/link'
import GeriSayim from './GeriSayim'

/**
 * Vitrin kampanya bandı (Faz 20'de yeniden yazıldı).
 *
 * BOZUKLUK: bant iki ayrı hatayla yanlış çalışıyordu.
 *  1) Kampanyanın PANEL ADINI basıyordu — canlıda "İKİNCİ SİPARİŞ KUPONU"
 *     yazıyordu; açıklama, oran, kod, bağlantı yoktu.
 *  2) Gösterilecek kampanya "en yeni aktif kampanya" diye seçiliyordu
 *     (homeData'da created_at DESC limit 1). En yeni satır kişiye özel,
 *     teslimat sonrası mailde giden kupon ŞABLONUYDU — vitrinde asla
 *     duyurulmamalıydı.
 *
 * Artık bant `vitrinIndirimiGetir()` çıktısını basıyor. O kaynak zaten:
 *  · kod gerektiren ve kişiye özel kupon üreten kampanyaları dışarıda
 *    bırakıyor (onlar `kodlular` listesine düşüyor, `otomatikler`e değil),
 *  · birden çok uygun kampanya varsa en yüksek değerlisini seçiyor,
 *  · hiçbiri yoksa null dönüyor — bant hiç basılmıyor, boş şerit kalmıyor.
 *
 * Metin boşsa da basılmaz: yanlış bir şey yazmaktansa hiç yazmamak yeğdir.
 */
export type VitrinBandi = {
  metin: string
  hedef: string
  bitis: string | null
}

export default function PromoStrip({ bant }: { bant: VitrinBandi | null }) {
  if (!bant?.metin) return null

  return (
    /* Faz 11A: bant vardı ama silikti — ince çizgi arası, açık zemin, küçük
       gri yazı. Kampanya sitenin en güçlü dönüşüm aracıyken göze çarpmıyordu.
       Artık dolgulu zemin ve tam genişlik; renk markanın altın tonu, bağırma
       yok. Süre kampanya kaydından gelir (ends_at), kodda sabit tarih yok. */
    <section className="bg-accent-soft">
      <Link
        href={bant.hedef}
        className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-4 text-center transition-colors hover:bg-[#efe6d4] lg:px-8"
      >
        <p className="font-body text-[13px] font-medium tracking-[0.06em] text-ink sm:text-[14px]">
          {bant.metin}
        </p>
        {bant.bitis && <GeriSayim bitis={bant.bitis} />}
        <span className="font-body text-[11px] uppercase tracking-[0.14em] text-accent-deep underline underline-offset-4">
          Keşfet
        </span>
      </Link>
    </section>
  )
}
