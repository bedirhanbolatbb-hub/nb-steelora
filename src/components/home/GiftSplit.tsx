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
  hediyeKoleksiyonu = null,
}: {
  gorsel?: string | null
  baslik?: string | null
  metin?: string | null
  /** Adında "hediye" geçen koleksiyon varsa ilk kısayol odur (ana sayfa verisinden). */
  hediyeKoleksiyonu?: { slug: string; name: string } | null
}) {
  const kaynak = (gorsel ?? '').trim() || '/hediye-paketi.jpg'
  const kBaslik = (baslik ?? '').trim() || HEDIYE_VARSAYILAN.baslik
  const kMetin = (metin ?? '').trim() || HEDIYE_VARSAYILAN.metin

  // 24 Kas 2026 tasarım denetimi: bölümün tek düğmesi "Ürünleri keşfet" idi ve
  // kataloğun tamamına gidiyordu — hediye arayan müşteri için bir giriş yoktu
  // (müşteri panelinde hediye alan iki kesimin de takıldığı yer). Dört kısayol:
  // hepsi var olan sayfalar ve süzgeçler, yeni iddia yok.
  const kisayollar = [
    ...(hediyeKoleksiyonu
      ? [{ href: `/koleksiyon/${hediyeKoleksiyonu.slug}`, ad: hediyeKoleksiyonu.name }]
      : []),
    { href: '/kategori/setler', ad: 'Setler' },
    { href: '/urunler?max_fiyat=350', ad: '350 ₺ altı' },
    { href: '/kategori/erkek', ad: 'Erkek için' },
  ]

  return (
    <section className="mt-12 bg-surface-muted lg:mt-20">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-2">
        <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[440px]">
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
        <div className="flex items-center px-4 py-8 lg:px-16 lg:py-16">
          <div data-reveal className="w-full">
            <h2 className="font-heading text-[24px] lg:text-[32px] font-medium text-ink leading-tight">
              {kBaslik}
            </h2>
            <p className="mt-3 max-w-md font-body text-[15px] leading-relaxed text-ink-soft">
              {kMetin}
            </p>
            <ul className="mt-5 grid max-w-md grid-cols-2 gap-2">
              {kisayollar.map((k) => (
                <li key={k.href}>
                  <Link
                    prefetch={false}
                    href={k.href}
                    className="flex min-h-[48px] items-center justify-center rounded-[4px] border border-line-strong bg-bg px-3 text-center font-body text-[14px] font-medium text-ink transition-colors hover:border-ink"
                  >
                    {k.ad}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
