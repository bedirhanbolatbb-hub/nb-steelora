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
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo'

/**
 * Anasayfa — "Sessiz Atölye" (Faz 9A veri katmanıyla).
 * Tüm veri tek TTL önbellekli paralel yükleyiciden gelir (lib/home/homeData);
 * istek yolunda ne ardışık sorgu ne görsel indirme kalır (logo gecikmesi
 * düzeltmesi). Hero artık kampanya bandı: 1-4 slayt, otomatik dönme yok;
 * hiç aktif slayt yoksa ivory tipografik fallback.
 * Tekilleştirme: featured > new_arrivals (grup kardeşi dahil) aynen sürer.
 */
export default async function HomePage() {
  const veri = await getHomeData()
  const c = veri.content

  const buyukler = veri.featured.slice(0, 2)
  const standartlar = veri.featured.slice(2, 8)

  return (
    <>
      <JsonLd
        data={organizationJsonLd([c.instagram_url, c.facebook_url, c.x_url], {
          // Künye /iletisim'de zaten yayında ve panelden yönetiliyor; aynı
          // site_content kaydından okunuyor, ek sorgu yok (Faz 11F denetimi).
          unvan: c.veri_sorumlusu_unvan,
          adres: c.veri_sorumlusu_adres,
          telefon: c.veri_sorumlusu_telefon,
          vergi: c.veri_sorumlusu_vergi,
        })}
      />
      <JsonLd data={websiteJsonLd()} />

      {/* 1 · Hero — kampanya bandı (slayt yoksa tipografik fallback) */}
      {veri.slides.length > 0 ? (
        <HeroSlider slides={veri.slides} />
      ) : (
        <HeroCinema c={c} image={null} imageHref={null} />
      )}

      {/* 2 · Promo şeridi */}
      <PromoStrip bant={veri.bant} />

      {/* 3 · Kategoriler */}
      <CategoryRail categoryImages={veri.categoryImages} />

      {/* 4 · Öne Çıkanlar — editorial: 2 büyük (masaüstünde 5:4) + 6 standart */}
      {veri.featured.length > 0 && (
        <section id="one-cikanlar" className="max-w-[1400px] mx-auto px-4 lg:px-8 pb-16 lg:pb-20">
          <div className="mb-8 text-center" data-reveal>
            <p className="eyebrow">Seçki</p>
            <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-ink mt-2">
              {c.featured_title || 'Öne Çıkanlar'}
            </h2>
            {c.featured_subtitle && (
              <p className="text-[12px] font-body text-muted mt-1.5">{c.featured_subtitle}</p>
            )}
          </div>

          {/* Faz 11B: mobilde bu iki kart tek sütundu ve 5:4 oranıyla neredeyse
              tam ekran kaplıyordu — iki ürün için iki ekran kaydırmak
              gerekiyordu. Mobilde normal 2'li ızgaraya ve standart kart boyuna
              (4:5) iniyor; masaüstü editorial düzeni aynen duruyor. */}
          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            {buyukler.map((product: any, i: number) => (
              <div key={product.id} data-reveal style={{ '--reveal-delay': `${i * 60}ms` } as React.CSSProperties}>
                <ProductCardV2 product={product} priority buyuk />
              </div>
            ))}
          </div>

          {standartlar.length > 0 && (
            <div className="mt-4 lg:mt-6 grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {standartlar.map((product: any, i: number) => (
                <div key={product.id} data-reveal style={{ '--reveal-delay': `${(i % 3) * 50}ms` } as React.CSSProperties}>
                  <ProductCardV2 product={product} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5 · Koleksiyonlar */}
      <CollectionsBand collections={veri.collections} />

      {/* 6 · Yeni Gelenler — peek'li rail */}
      {veri.newArrivals.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-16 lg:py-20">
          <div className="mb-8 flex items-end justify-between" data-reveal>
            <div>
              <p className="eyebrow">Taze</p>
              <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-ink mt-2">
                {c.new_arrivals_title || 'Yeni Gelenler'}
              </h2>
            </div>
            <Link
              href="/urunler?siralama=yeni"
              className="hidden sm:block text-[11px] uppercase tracking-[0.16em] font-body font-medium text-ink border-b border-accent pb-0.5 hover:text-accent-deep transition-colors"
            >
              Tümünü Gör →
            </Link>
          </div>

          {/* Faz 11B-ek: düz şerit masaüstünde ok/gösterge olmadan duruyordu —
              ~4,6 kart görünüyor, kalan 8'e ulaşmanın görünür yolu yoktu. */}
          <YeniGelenlerRayi>
            {veri.newArrivals.map((product: any, i: number) => (
              <div
                key={product.id}
                className="w-[68vw] sm:w-[280px] shrink-0 snap-start"
                data-reveal
                style={{ '--reveal-delay': `${(i % 4) * 40}ms` } as React.CSSProperties}
              >
                <ProductCardV2 product={product} />
              </div>
            ))}
          </YeniGelenlerRayi>
        </section>
      )}

      {/* 6b · Çok Beğenilenler (Faz 11D) — yalnız onaylı yorumu olan ürün
          sayısı 8'i bulunca; azsa bölüm HİÇ basılmaz. */}
      {veri.cokBegenilenler.length >= 8 && (
        <section className="max-w-[1400px] mx-auto px-4 lg:px-8 pb-16 lg:pb-20">
          <div className="mb-8 text-center" data-reveal>
            <p className="eyebrow">Beğenilenler</p>
            <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-ink mt-2">
              Çok Beğenilenler
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {veri.cokBegenilenler.map((product: any, i: number) => (
              <div key={product.id} data-reveal style={{ '--reveal-delay': `${(i % 4) * 40}ms` } as React.CSSProperties}>
                <ProductCardV2 product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7 · Hediye kutusu — görsel ve metin panelden (Faz 11D) */}
      <GiftSplit
        gorsel={c.hakkimizda_gorsel_paket}
        baslik={c.hediye_baslik}
        metin={c.hediye_metin}
      />

      {/* 8 · Neden NB Steelora */}
      <WhyUs />

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
