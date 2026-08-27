import { CAYMA_SURESI_GUN, GERI_ODEME_GUN } from './sozlesme'
import { FREE_SHIPPING_LABEL } from '@/lib/shipping'

/**
 * Sık sorulan sorular (Faz 11A).
 *
 * KURAL: cevaplar YALNIZ zaten yayında olan metinlerden türer —
 *  · bakım cümleleri  → lib/catalog/material.ts (materialCare)
 *  · iade süreleri    → lib/legal/sozlesme.ts (tek kaynak)
 *  · kargo ifadesi    → lib/shipping.ts
 * YENİ VAAT YAZILMAZ. Sitede karşılığı olmayan bir söz (garanti süresi,
 * hediye paketi, hijyen mührü) buraya GİRMEZ.
 *
 * HİJYEN MÜHRÜ ÖZELLİKLE YOK: mühür kullanmama kararı verildi, dolayısıyla
 * "mühürle gönderilir" demek yalan olurdu.
 *
 * Aynı liste üç yerde kullanılır: /sss sayfası, FAQPage şeması ve ürün
 * sayfasındaki akordeon — üçü ayrışmasın diye tek kaynak.
 */

export type SssSorusu = { soru: string; cevap: string }

/** Ürün sayfası akordeonunda da gösterilecek kısa küme. */
export const SSS_URUN: SssSorusu[] = [
  {
    soru: 'Çelik takı kararır mı?',
    cevap:
      '316L paslanmaz çelik ürünler suya, terlemeye ve parfüme dayanıklıdır; nemli bir bezle silerek temizleyebilirsiniz. Altın ya da gümüş kaplamalı ürünlerde kaplama yüzeyi korumak için parfüm, deniz ve havuz suyuyla temastan kaçının ve kuru bir bezle silin. Her ürünün malzemesi ve bakım bilgisi kendi sayfasında yazar.',
  },
  {
    soru: 'Duşta, denizde ya da havuzda takabilir miyim?',
    cevap:
      '316L paslanmaz çelik ürünlerde su teması sorun çıkarmaz. Kaplamalı ürünlerde ve boncuk/doğal taş içeren parçalarda deniz ve havuz suyundan uzak tutmanızı öneriyoruz; boncuklu yüzeyler suyla uzun temasta matlaşabilir.',
  },
  {
    soru: 'Parfüm ve kozmetik ürünlerle birlikte kullanabilir miyim?',
    cevap:
      'Parfümü ve kozmetiği takınızı takmadan önce uygulayın, kuruduktan sonra takınızı takın. 316L çelik parfüme dayanıklıdır; kaplamalı ürünlerde doğrudan temastan kaçınmak kaplamanın ömrünü uzatır.',
  },
  {
    soru: 'Hediye paketi var mı?',
    cevap:
      'Her sipariş ücretsiz hediye kutusunda özenle paketlenir; ayrıca ücret ya da seçim gerekmez. Ödeme adımındaki "Hediye Notu" alanına 300 karaktere kadar not bırakabilirsiniz, notunuz paketin içine konur.',
  },
  {
    soru: 'İade ve değişim nasıl işliyor?',
    cevap:
      `Teslim aldığınız günden itibaren ${CAYMA_SURESI_GUN} gün içinde hiçbir gerekçe göstermeden cayma hakkınızı kullanabilirsiniz. Talebinizi Hesabım → Siparişlerim ekranından iletirsiniz; onaylandığında kullanacağınız kargo firmasını ve iade kodunu e-posta ile bildiririz. İade ücretini hiçbir hâlde sizden talep etmeyiz. Ürün tarafımıza ulaştıktan sonra ödemeniz en geç ${GERI_ODEME_GUN} gün içinde iade edilir.`,
  },
]

/** /sss sayfasında gösterilen tam liste. */
export const SSS_TAMAMI: SssSorusu[] = [
  ...SSS_URUN,
  {
    soru: 'Kargo ücreti var mı?',
    cevap: `${FREE_SHIPPING_LABEL}. Sipariş tutarına bakılmaksızın kargo bizden.`,
  },
  {
    soru: 'Siparişimi nasıl takip ederim?',
    cevap:
      'Siparişiniz kargoya verildiğinde takip numarasını e-posta ile gönderiyoruz. Kargo Takip sayfasından sipariş numaranız ve e-posta adresinizle ya da doğrudan takip kodunuzla durumu görebilirsiniz.',
  },
  {
    soru: 'Ürünlerin malzemesi ne?',
    cevap:
      'Katalogdaki malzemeler 316L paslanmaz çelik, premium kaplama pirinç ve boncuk & doğal taştır. Her ürünün malzemesi kendi sayfasında yazılıdır.',
  },
  {
    soru: 'Ödeme güvenli mi?',
    cevap:
      'Ödemeler iyzico altyapısı üzerinden 3D Secure ile alınır. Kart bilgileriniz tarafımızca görülmez ve saklanmaz.',
  },
]
