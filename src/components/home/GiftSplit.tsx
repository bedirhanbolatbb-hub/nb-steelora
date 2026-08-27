import Image from 'next/image'
import Link from 'next/link'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY } from '@/lib/images'
import { HEDIYE_VARSAYILAN } from '@/lib/metin/hediyeMetni'

/**
 * Hediye kutusu bandı v3 (Faz 11D).
 *
 * İKİ KUSUR DÜZELTİLDİ:
 *  1) Görsel koda gömülü sabit dosyaydı (/hediye-paketi.jpg). BB panelden
 *     "Hediye paketi fotoğrafı" alanına kendi kutusunun fotoğrafını yükledi
 *     ama alan HİÇBİR yerden okunmuyordu — sitede değişmedi. Artık görsel
 *     panelden gelir (site_content.hakkimizda_gorsel_paket — aynı fotoğraf
 *     Hakkımızda sayfasında da kullanılıyor, tek kaynak); alan boşsa eski
 *     dosya yedek olarak kalır.
 *  2) Metin yanıltıcıydı: "Sevdiklerinize özel hediye paketi" + "HEDİYE SEÇ"
 *     hediye ürün verildiği/kutu satıldığı algısı yaratıyordu. Tek mesaj:
 *     her sipariş ücretsiz hediye kutusunda gelir. Metinler panelden
 *     düzenlenir (hediye_baslik / hediye_metin), boşsa Faz 21 kütüphanesinin
 *     varsayılanı basılır. Kutunun görünümü hakkında varsayım yazılmaz —
 *     onu fotoğraf anlatır.
 */
export default function GiftSplit({
  gorsel,
  baslik,
  metin,
}: {
  gorsel?: string | null
  baslik?: string | null
  metin?: string | null
}) {
  const kaynak = (gorsel ?? '').trim() || '/hediye-paketi.jpg'
  const kBaslik = (baslik ?? '').trim() || HEDIYE_VARSAYILAN.baslik
  const kMetin = (metin ?? '').trim() || HEDIYE_VARSAYILAN.metin

  return (
    <section className="bg-surface-muted">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[480px]">
          <Image
            src={kaynak}
            // Vercel görsel dönüşüm kotası dolu (Faz 9B kararı): hem yerel
            // yedek hem panel medyası doğrudan servis edilir, /_next/image
            // isteği 402 alıp boş kalmasın.
            unoptimized
            alt="NB Steelora hediye kutusu"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            quality={IMAGE_QUALITY}
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
        </div>
        <div className="flex items-center px-6 py-14 lg:px-16 lg:py-20">
          <div data-reveal>
            <p className="eyebrow">Hediye kutusu</p>
            <h2 className="font-heading text-[30px] lg:text-[40px] font-medium text-ink mt-3 leading-tight">
              {kBaslik}
            </h2>
            <p className="text-[13px] font-body text-ink-soft mt-4 leading-relaxed max-w-md">
              {kMetin}
            </p>
            <Link
              href="/urunler"
              className="inline-flex items-center mt-8 bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
            >
              Ürünleri keşfet
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
