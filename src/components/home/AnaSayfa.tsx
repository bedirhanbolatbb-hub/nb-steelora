import Link from 'next/link'
import { getHomeData } from '@/lib/home/homeData'
import HeroSlider from '@/components/home/HeroSlider'
import HeroCinema from '@/components/home/HeroCinema'
import PromoStrip from '@/components/home/PromoStrip'
import CategoryRail from '@/components/home/CategoryRail'
import CollectionsBand from '@/components/home/CollectionsBand'
import GiftSplit from '@/components/home/GiftSplit'
import YeniGelenlerRayi from '@/components/home/YeniGelenlerRayi'
import YorumSeridi from '@/components/home/YorumSeridi'
import InstagramDuvari from '@/components/home/InstagramDuvari'
import WhyUs from '@/components/home/WhyUs'
import BlogPreview from '@/components/home/BlogPreview'
import Newsletter from '@/components/home/Newsletter'
import ProductCardV2 from '@/components/store/ProductCardV2'
import JsonLd from '@/components/seo/JsonLd'
import KanitSeridi from '@/components/home/KanitSeridi'
import BolumBasligi from '@/components/home/BolumBasligi'
import { saticiPuaniOku } from '@/lib/metin/saticiPuani'
import { ilkEkranKampanyasi } from '@/lib/campaigns/kampanyaVitrini'
import type { kampanyaOnizlemesiGetir } from '@/lib/campaigns/vitrinIndirimi'
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo'


/** Önizlemede gösterilecek kampanya (yalnız /onizleme; ana sayfada null). */
export type AnaSayfaOnizlemesi = Awaited<ReturnType<typeof kampanyaOnizlemesiGetir>>

/**
 * Anasayfa — "Sessiz Atölye" (Faz 9A veri katmanıyla).
 * Tüm veri tek TTL önbellekli paralel yükleyiciden gelir (lib/home/homeData);
 * istek yolunda ne ardışık sorgu ne görsel indirme kalır (logo gecikmesi
 * düzeltmesi). Hero artık kampanya bandı: 1-4 slayt, otomatik dönme yok;
 * hiç aktif slayt yoksa ivory tipografik fallback.
 * Tekilleştirme: featured > new_arrivals (grup kardeşi dahil) aynen sürer.
 */
export default async function AnaSayfa({ onizleme }: { onizleme: AnaSayfaOnizlemesi }) {
  const veri = await getHomeData()
  const c = veri.content

  // Panel önizlemesi (henüz başlamamış kampanyanın ilk ekranı) /onizleme
  // sayfasından gelir; ana sayfa önbellekten verildiği için burada adres parametresi okunmaz.

  // Tüm ürünlerde geçerli koşulsuz indirim → ilk ekranın kendisi kampanya
  // olur (oran + tarih + düğme). Koşullu kampanyada ilk ekran değişmez,
  // bant eskisi gibi altında durur.
  const ilkEkran = ilkEkranKampanyasi(onizleme ?? veri.kampanya)

  // 24 Kas 2026 tasarım denetimi — ana sayfa yeniden sıralandı ve kısaldı
  // (telefonda 9.239 px → yaklaşık 5.500 px). Sıra: ilk ekran → kanıt şeridi →
  // kategoriler → öne çıkanlar → hediye → yeni gelenler → koleksiyonlar →
  // marka → rehber → bülten. Her söz bir kez söylenir; bölüm başlıkları tek
  // kalıp (BolumBasligi), kartlar tek boy.
  const saticiPuani = saticiPuaniOku(c)
  const hediyeKoleksiyonu = veri.collections.find((k) => /hediye/i.test(k.name)) ?? null

  return (
    <>
      <JsonLd
        data={organizationJsonLd([c.instagram_url, c.tiktok_url, c.facebook_url, c.x_url], {
          // Künye /iletisim'de zaten yayında ve panelden yönetiliyor; aynı
          // site_content kaydından okunuyor, ek sorgu yok (Faz 11F denetimi).
          unvan: c.veri_sorumlusu_unvan,
          adres: c.veri_sorumlusu_adres,
          telefon: c.veri_sorumlusu_telefon,
          vergi: c.veri_sorumlusu_vergi,
          logo: c.logo_kare_url,
        })}
      />
      <JsonLd data={websiteJsonLd()} />

      {onizleme && (
        <div className="fixed bottom-4 left-4 z-[60] max-w-[calc(100vw-2rem)] rounded-[4px] bg-ink px-4 py-3 font-body text-[12px] text-bg shadow-lg">
          Önizleme: kampanya başladığında ilk ekran böyle görünecek.{' '}
          <Link prefetch={false} href="/" className="underline underline-offset-4">
            Kapat
          </Link>
        </div>
      )}

      {/* 1 · Hero — kampanya bandı (slayt yoksa tipografik fallback) */}
      {veri.slides.length > 0 ? (
        <HeroSlider slides={veri.slides} kampanya={ilkEkran} />
      ) : (
        <HeroCinema c={c} image={null} imageHref={null} />
      )}

      {/* 2 · Promo şeridi — kampanya ilk ekrandaysa tekrar basılmaz */}
      {!(ilkEkran && veri.slides.length > 0) && <PromoStrip bant={veri.bant} />}

      {/* 2b · Kanıt şeridi: Trendyol puanı, ücretsiz kargo (alt limit yok), iade
          — ilk ekranın hemen altında, tek satır (components/home/KanitSeridi). */}
      <KanitSeridi saticiPuani={saticiPuani} />

      {/* 3 · Kategoriler */}
      <CategoryRail categoryImages={veri.categoryImages} />

      {/* 4 · Öne Çıkanlar — tek boy kart; telefonda 6, geniş ekranda 8 ürün.
          Faz 12: `priority` yok — kartlar ilk ekranın altında, hero görseliyle
          bant genişliği paylaşmasınlar. */}
      {veri.featured.length > 0 && (
        <section id="one-cikanlar" className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-12 lg:pt-20">
          <BolumBasligi
            baslik={c.featured_title || 'Öne Çıkanlar'}
            aciklama={c.featured_subtitle}
            href="/urunler"
            etiket="Tüm ürünler"
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
            {veri.featured.slice(0, 8).map((product: any, i: number) => (
              <div
                key={product.id}
                className={i >= 6 ? 'hidden lg:block' : undefined}
                data-reveal
                style={{ '--reveal-delay': `${(i % 4) * 50}ms` } as React.CSSProperties}
              >
                <ProductCardV2 product={product} />
              </div>
            ))}
          </div>
          <div className="mt-8 lg:mt-10 lg:text-center">
            <Link
              prefetch={false}
              href="/urunler"
              className="basis inline-flex min-h-[52px] w-full items-center justify-center rounded-[4px] border border-ink px-8 font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-ink hover:bg-ink hover:text-bg lg:w-auto"
            >
              Tüm ürünleri görün
            </Link>
          </div>
        </section>
      )}

      {/* 5 · Hediye kutusu — görsel ve metin panelden (Faz 11D); hediye
          kısayollarıyla öne alındı. */}
      <GiftSplit
        gorsel={c.hakkimizda_gorsel_paket}
        baslik={c.hediye_baslik}
        metin={c.hediye_metin}
        hediyeKoleksiyonu={hediyeKoleksiyonu ? { slug: hediyeKoleksiyonu.slug, name: hediyeKoleksiyonu.name } : null}
      />

      {/* 6 · Yeni Gelenler — peek'li rail */}
      {veri.newArrivals.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-12 lg:pt-20">
          <BolumBasligi
            baslik={c.new_arrivals_title || 'Yeni Gelenler'}
            href="/urunler?siralama=yeni"
          />

          {/* Faz 11B-ek: düz şerit masaüstünde ok/gösterge olmadan duruyordu —
              ~4,6 kart görünüyor, kalan 8'e ulaşmanın görünür yolu yoktu.
              24 Kas 2026: telefonda kart 68vw yerine ızgara kartıyla aynı
              boyda (2 kart + üçüncünün kenarı görünür). */}
          <YeniGelenlerRayi>
            {veri.newArrivals.map((product: any, i: number) => (
              <div
                key={product.id}
                className="w-[42vw] sm:w-[240px] shrink-0 snap-start"
                data-reveal
                style={{ '--reveal-delay': `${(i % 4) * 40}ms` } as React.CSSProperties}
              >
                <ProductCardV2 product={product} morph={false} />
              </div>
            ))}
          </YeniGelenlerRayi>
        </section>
      )}

      {/* 6b · Çok Beğenilenler (Faz 11D) — yalnız onaylı yorumu olan ürün
          sayısı 8'i bulunca; azsa bölüm HİÇ basılmaz. */}
      {veri.cokBegenilenler.length >= 8 && (
        <section className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-12 lg:pt-20">
          <BolumBasligi baslik="Çok Beğenilenler" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
            {veri.cokBegenilenler.map((product: any, i: number) => (
              <div key={product.id} data-reveal style={{ '--reveal-delay': `${(i % 4) * 40}ms` } as React.CSSProperties}>
                <ProductCardV2 product={product} morph={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7 · Koleksiyonlar */}
      <CollectionsBand collections={veri.collections} />

      {/* 8 · Marka bölümü (eski "Neden NB Steelora") + tarihli Trendyol puanı */}
      <WhyUs saticiPuani={saticiPuani} />

      {/* 8b · Gerçek yorumlar (Faz 11D) — en az 3 onaylı yorum şartı bileşende */}
      <YorumSeridi yorumlar={veri.yorumlar} />

      {/* 8c · Instagram duvarı (Faz 11D) — kareler panelden; boşsa görünmez */}
      <InstagramDuvari kareler={veri.instagram} profil={c.instagram_url} />

      {/* 9 · Blog önizleme */}
      <BlogPreview posts={veri.blogPosts} />

      {/* 10 · Bülten */}
      <Newsletter />
    </>
  )
}
