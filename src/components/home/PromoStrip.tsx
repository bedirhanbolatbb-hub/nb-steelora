import Link from 'next/link'

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
    <section className="border-y border-accent/30 bg-bg">
      <Link
        href={bant.hedef}
        className="mx-auto flex max-w-[1400px] flex-wrap items-baseline justify-center gap-x-3 gap-y-1 px-4 py-3.5 text-center transition-colors hover:bg-accent-soft/40 lg:px-8"
      >
        <p className="font-body text-[12px] uppercase tracking-[0.14em] text-ink">{bant.metin}</p>
        {bant.bitis && (
          <p className="font-body text-[10px] tracking-[0.08em] text-muted">
            {new Date(bant.bitis).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })} tarihine kadar
          </p>
        )}
        <span className="font-body text-[10px] uppercase tracking-[0.14em] text-accent-deep underline underline-offset-2">
          Keşfet
        </span>
      </Link>
    </section>
  )
}
