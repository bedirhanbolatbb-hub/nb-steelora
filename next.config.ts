import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { SABIT_GUVENLIK_BASLIKLARI } from "./src/lib/security/basliklar";

const nextConfig: NextConfig = {
  // Faz 27: `x-powered-by: Next.js` çalışan çatıyı duyuruyordu. Saldırıyı tek
  // başına mümkün kılmaz ama hedefe uygun açık aramayı kolaylaştırır.
  poweredByHeader: false,

  /**
   * Güvenlik başlıkları TÜM yollara (API dahil) uygulanır. CSP burada DEĞİL:
   * her istek için ayrı nonce gerektiği için proxy.ts'te üretiliyor.
   */
  async headers() {
    return [
      { source: '/:path*', headers: SABIT_GUVENLIK_BASLIKLARI },
      /**
       * Faz 36: görsel sunucularına ERKEN bağlantı.
       *
       * Ölçüm (6 Kas 2026, ana sayfa): belge 141 ms'de akmaya başlıyor ama
       * <head> — dolayısıyla hero görselinin ön yükleme bağlantısı — sayfa
       * verisi hazırlanınca, ~500 ms'de geliyor; görsel isteği ancak o zaman
       * başlıyor ve AYRI bir adres (Supabase depolama) olduğu için önce
       * bağlantı kuruluyordu. Bu başlık ilk baytla gider: tarayıcı sayfa
       * hazırlanırken bağlantıyı açmış olur. Ürün görselleri de Trendyol
       * CDN'inde (galeri, hover görseli).
       */
      {
        // Tarayıcılar Link başlığını yalnız sayfa (belge) yanıtında işler;
        // API ve dosya yanıtlarında zararsızdır.
        source: '/:path*',
        headers: [
          {
            key: 'Link',
            value: [
              process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://halyhtowppivuwpdserp.supabase.co',
              'https://cdn.dsmcdn.com',
            ]
              .map((adres) => `<${adres.replace(/\/$/, '')}>; rel=preconnect`)
              .join(', '),
          },
        ],
      },
    ]
  },

  /**
   * /garanti bir dönem yayındaydı, kaldırıldı ve 404 döndürüyordu (5 Eyl 2026
   * denetimi). Ölü sayfa hem arama motorunda hem Merchant Center incelemesinde
   * "site tam çalışmıyor" işareti; içerik zaten Kargo & İade sayfasında.
   */
  async redirects() {
    return [
      { source: '/garanti', destination: '/kargo-ve-iade', permanent: true },
      // Kasım 2026 blog birleştirmesi. Aynı aramayı birden çok kısa yazı
      // paylaşıyordu (Google "bijuteri nedir" için ikinci yazıyı seçiyordu);
      // iki "test" yazısı ise yapılmamış denemeleri anlatıyordu. İçerik tek
      // kapsamlı rehberde toplandı; eski adresler oraya kalıcı yönlenir.
      { source: '/blog/bijuteri-nedir', destination: '/blog/bijuteri-ile-celik-taki-farki', permanent: true },
      { source: '/blog/takilar-neden-kararir', destination: '/blog/celik-taki-kararir-mi', permanent: true },
      { source: '/blog/celik-taki-kararmaz-mi-gercek-test', destination: '/blog/celik-taki-kararir-mi', permanent: true },
      { source: '/blog/1-yil-ccelik-taki-kullandik', destination: '/blog/celik-taki-kararir-mi', permanent: true },
      { source: '/blog/gunluk-kullanim-icin-en-iyi-taki', destination: '/blog/en-iyi-gunluk-takilar', permanent: true },
      // İkinci tur (aynı gün): kısa ve birbirini tekrarlayan yazılar konu
      // rehberlerine toplandı. Kaplama üzerine dört yazı tek rehberde.
      { source: '/blog/kaliteli-bijuteri-nasil-secilir', destination: '/blog/bijuteri-ile-celik-taki-farki', permanent: true },
      { source: '/blog/en-iyi-kararmayan-takilar-2026', destination: '/blog/kararmayan-taki-nasil-anlasilir', permanent: true },
      { source: '/blog/neden-celik-takiya-gecmelisiniz', destination: '/blog/paslanmaz-celik-taki-nedir', permanent: true },
      { source: '/blog/50-tl-vs-500-tl-taki-farki', destination: '/blog/premium-kaplama-taki-nedir', permanent: true },
      { source: '/blog/ucuz-taki-mi-premium-kaplama-mi', destination: '/blog/premium-kaplama-taki-nedir', permanent: true },
      { source: '/blog/altin-kaplama-taki-kararir-mi', destination: '/blog/premium-kaplama-taki-nedir', permanent: true },
      { source: '/blog/en-uzun-omurlu-kolyeler', destination: '/blog/uzun-omurlu-kolye-nasil-secilir', permanent: true },
      { source: '/blog/en-dayanikli-bileklik-modelleri', destination: '/blog/celik-bileklik-nasil-secilir', permanent: true },
    ]
  },

  /**
   * Site izleyicisi (13 Kas 2026 — Vercel ücretsiz sunucu süresi).
   *
   * Sentry'nin site izleyicisi (SentryUptimeBot) ana sayfayı DAKİKADA BİR
   * yokluyor: ayda ~43 bin istek. proxy.ts bu isteğe kısa bir 200 dönüyordu
   * ama ara katmanın kendisi her seferinde bir sunucu çağrısıydı; 13 Kas
   * ölçümünde 12 saatte 758 "respond" çağrısının ~720'si bu yoklamaydı ve ara
   * katman toplam sunucu süresinin %43'ünü yiyordu.
   *
   * Artık yoklama Vercel'in yönlendirme katmanında statik /izleyici.txt'ye
   * gider: ne ara katman ne sayfa kurulumu çalışır, dosya CDN'den döner.
   * proxy.ts'in matcher'ı kökü (yalnız kökü) bu tarayıcıya karşı atlıyor —
   * ara katman yönlendirmeden ÖNCE çalıştığı için bu koşul şart. Dağıtım
   * kapanırsa (10–12 Kas'taki gibi) dosya da döner olmaz, izleyici yine
   * haber verir. Uygulamanın asıl sağlığı /api/health'te ayrıca izleniyor.
   */
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'header', key: 'user-agent', value: '.*SentryUptimeBot.*' }],
          destination: '/izleyici.txt',
        },
      ],
    }
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.dsmcdn.com' },
      { protocol: 'https', hostname: '**.trendyol.com' },
      { protocol: 'https', hostname: '**.ty-cdn.com' },
      // Faz 9A: panelden yüklenen medya (public "media" bucket'ı).
      // İki proje birden listede: taşıma penceresinde canlı hâlâ eski projede,
      // yeni proje (Frankfurt) hazır. Eski satır taşıma tamamlanıp geri dönüş
      // penceresi kapanınca kaldırılabilir (Faz 13B).
      {
        protocol: 'https',
        hostname: 'npvanotrzbqsnxvasmxm.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'halyhtowppivuwpdserp.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Kaynak görseller Trendyol CDN'inden ~1200px geliyor; 1920/3840 istemek
    // upscale demek ve ilk boyamayı saniyelerce geciktiriyordu. Üst sınır 1600.
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600],
    imageSizes: [64, 96, 128, 200, 256, 384, 600],
    // Next 16'da izin listesi zorunlu.
    qualities: [72],
  },
};

/**
 * Sentry sarmalayıcı (Faz 11F sonrası — hata gözcüsü).
 *
 * KAYNAK HARİTALARI: SENTRY_AUTH_TOKEN Vercel'de tanımlıysa derleme sırasında
 * yüklenir ve Sentry'de yığın izi okunabilir satırları gösterir; tanımlı
 * değilse derleme yine BAŞARILI olur, yalnız izler küçültülmüş kalır. Yani
 * anahtar eksikken dağıtım kırılmaz.
 *
 * hideSourceMaps: haritalar Sentry'ye yüklenir ama tarayıcıya SUNULMAZ —
 * aksi hâlde kaynak kodumuz herkese açık olurdu.
 *
 * TÜNEL AÇILMADI: olaylar doğrudan Sentry'ye gider ve CSP'ye yalnız DSN'in
 * kendi kaynağı eklenir (lib/security/basliklar.ts). Tünel her hatayı bir
 * Vercel işlev çağrısına çevirirdi; Hobby planında bu kotayı yer.
 *
 * `automaticVercelMonitors` ve `disableLogger` VERİLMEDİ: ikisi de kullanımdan
 * kaldırıldı ve yalnız webpack derlemesinde çalışıyor — bu proje Turbopack ile
 * derleniyor, verilseler sessizce yok sayılırlardı.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
