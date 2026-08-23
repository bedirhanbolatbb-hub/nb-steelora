import type { NextConfig } from "next";
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
    return [{ source: '/:path*', headers: SABIT_GUVENLIK_BASLIKLARI }]
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

export default nextConfig;
