import { CAYMA_SURESI_GUN, GERI_ODEME_GUN } from './sozlesme'
import { FREE_SHIPPING_LABEL, GONDERIM_BOLGESI, TESLIM_CUMLESI } from '@/lib/shipping'

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
 * "mühürle gönderilir" demek yalan olurdu. 25 Kas 2026: hukuk sayfaları,
 * sipariş e-postası ve piercing kategori cümlesi de bu karara uyduruldu —
 * küpe ve piercing diğer ürünler gibi iade edilir; tek istisna kişiye özel
 * hazırlanan ürünlerdir (lib/legal/__testler__/iadeMetni.test.mts).
 * Aynı gün iade cevabındaki geri ödeme süresi de sözleşmeyle eşitlendi:
 * süre "ürün bize ulaştıktan sonra" değil, ürünün iade kargosuna teslim
 * edildiği günden işler (MSY m.12/1; sözleşme ve /kargo-ve-iade böyle yazar).
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
      '316L paslanmaz çelik ürünler suya, terlemeye ve parfüme dayanıklıdır; nemli bir bezle silerek temizleyebilirsiniz. Altın rengi ya da gümüş rengi kaplamalı ürünlerde kaplama yüzeyini korumak için parfüm, deniz ve havuz suyuyla temastan kaçının ve ürünü kuru bir bezle silin. Her ürünün malzemesi ve bakım bilgisi kendi sayfasında yazar.',
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
      `Teslim aldığınız günden itibaren ${CAYMA_SURESI_GUN} gün içinde hiçbir gerekçe göstermeden cayma hakkınızı kullanabilirsiniz. Talebinizi üye olmadan Kargo Takip sayfasından (sipariş numaranız ve e-posta adresinizle), üyeyseniz Hesabım → Siparişlerim ekranından oluşturursunuz; kullanacağınız kargo firmasını ve iade kodunu e-posta ile bildiririz. İade kargo ücreti bize aittir; hiçbir hâlde sizden talep etmeyiz. Ürünü iade kargosuna teslim ettiğiniz tarihten itibaren en geç ${GERI_ODEME_GUN} gün içinde ödemeniz iade edilir.`,
  },
]

const SSS_HEDIYE = SSS_URUN[3]
const SSS_IADE = SSS_URUN[4]
const SSS_PARFUM_SORUSU = 'Parfüm ve kozmetik ürünlerle birlikte kullanabilir miyim?'
const SSS_SU_SORUSU = 'Duşta, denizde ya da havuzda takabilir miyim?'
const PARFUM_ORTAK =
  'Parfümü ve kozmetiği takınızı takmadan önce uygulayın, kuruduktan sonra takınızı takın.'

/**
 * Ürün sayfasının soruları — ÜRÜNÜN KENDİ MALZEMESİNE göre (24 Kas 2026
 * tasarım denetimi).
 *
 * KUSUR: kaplama pirinç bir ürünün sayfasında ilk soru "Çelik takı kararır
 * mı?" idi ve cevap çelikle başlıyordu; müşteri elindeki ürünün cevabını
 * ikinci cümlede arıyordu, bir kısmı da ürünü çelik sanıyordu.
 *
 * Cevaplar yine yalnız yayındaki bakım cümlelerinden (materialCare ve yukarıdaki
 * genel küme) türer; kaplamalı ürün için tek ek, rengin zamanla değişebileceğini
 * açıkça söylemektir — bu bir vaat değil, beklentiyi doğru kuran bir uyarıdır.
 * Malzemesi bilinmeyen üründe genel küme aynen kalır.
 *
 * Son soru ödeme: ürün sayfasında "nasıl ödeyeceğim?" yanıtsızdı.
 */
export function sssUrun(malzeme: string | null | undefined, kartAcik: boolean): SssSorusu[] {
  const odeme: SssSorusu = { soru: 'Nasıl ödeme yapabilirim?', cevap: odemeCevabi(kartAcik) }

  if (malzeme === 'stainless_steel') {
    return [
      {
        soru: 'Bu ürün kararır mı?',
        cevap:
          'Bu ürün 316L paslanmaz çeliktir; suya, terlemeye ve parfüme dayanıklıdır. Nemli bir bezle silerek temizleyebilirsiniz.',
      },
      {
        soru: SSS_SU_SORUSU,
        cevap: 'Bu ürün 316L paslanmaz çeliktir; su teması sorun çıkarmaz.',
      },
      { soru: SSS_PARFUM_SORUSU, cevap: `${PARFUM_ORTAK} 316L çelik parfüme dayanıklıdır.` },
      SSS_HEDIYE,
      SSS_IADE,
      odeme,
    ]
  }

  if (malzeme === 'plated_brass') {
    return [
      {
        soru: 'Bu ürünün rengi zamanla değişir mi?',
        cevap:
          'Bu ürün kaplama pirinçtir; bijuteri üründür, altın ya da gümüş değildir. Kaplamalı takılarda renk; ter, su, parfüm ve kimyasallarla temas ettikçe zamanla değişebilir. Parfüm, deniz ve havuz suyundan uzak tutup kuru bir bezle sildiğinizde kaplama daha uzun korunur.',
      },
      {
        soru: SSS_SU_SORUSU,
        cevap:
          'Önermiyoruz. Kaplamalı ürünleri deniz ve havuz suyundan uzak tutun; duştan önce çıkarmanız kaplamanın ömrünü uzatır.',
      },
      {
        soru: SSS_PARFUM_SORUSU,
        cevap: `${PARFUM_ORTAK} Kaplamalı ürünlerde doğrudan temastan kaçınmak kaplamanın ömrünü uzatır.`,
      },
      SSS_HEDIYE,
      SSS_IADE,
      odeme,
    ]
  }

  if (malzeme === 'beaded') {
    return [
      {
        soru: 'Bu ürün suyla temas edebilir mi?',
        cevap:
          'Boncuk ve doğal taş yüzeyler suyla uzun temasta matlaşabilir. Deniz ve havuz suyundan uzak tutun, kuru bir bezle silin.',
      },
      {
        soru: SSS_PARFUM_SORUSU,
        cevap: `${PARFUM_ORTAK} Boncuk ve doğal taş yüzeyleri parfümle doğrudan temastan koruyun.`,
      },
      SSS_HEDIYE,
      SSS_IADE,
      odeme,
    ]
  }

  return [...SSS_URUN, odeme]
}

/** Ödeme dışındaki sorular — ödeme cevabı aşağıdaki `sssTamami` ile eklenir. */
const SSS_TAMAMI_SABIT: SssSorusu[] = [
  ...SSS_URUN,
  // 25 Kas 2026: takı alışverişinde en sık sorulan iade sorusu. Cevap
  // /kargo-ve-iade sayfasındaki cümlenin aynısıdır — yeni vaat değil.
  {
    soru: 'Küpe ve piercing iade edilebilir mi?',
    cevap: `Evet. Küpe ve piercing dâhil tüm ürünlerde, teslim aldığınız günden itibaren ${CAYMA_SURESI_GUN} gün içinde cayma hakkınızı kullanabilirsiniz; ambalajı açmanız bu hakkı etkilemez. Cayma hakkı yalnızca kişiye özel hazırlanan ürünlerde kullanılamaz.`,
  },
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
      'Katalogdaki malzemeler 316L paslanmaz çelik, kaplama pirinç ve boncuk & doğal taştır. Kaplama pirinç ürünler bijuteridir; altın ya da gümüş değildir. Her ürünün malzemesi kendi sayfasında yazılıdır.',
  },
]

/**
 * "Nasıl ödeme yapabilirim?" cevabı (12 Kas 2026). Kart (Tosla) açık mı
 * sorusunu çağıran sunucudan verir (lib/tosla/client `kartOdemesiAcikMi`);
 * bu dosya ortam değişkeni okumaz, yalnız iki doğru metinden birini seçer.
 */
export function odemeCevabi(kartAcik: boolean): string {
  if (kartAcik) {
    return 'Kartla ya da havale/EFT ile ödeyebilirsiniz. Kartla ödemede kart bilgilerinizi Tosla\'nın güvenli ödeme sayfasında girersiniz; ödeme 3D Secure ile tek çekim alınır, kart numaranızın tamamı ve güvenlik kodunuz bize ulaşmaz ve ödemeniz onaylanınca siparişiniz hazırlanmaya başlar. Havale/EFT\'yi seçerseniz siparişi onayladığınızda alıcı, banka, IBAN ve tutar ekranda ve e-postanızda yer alır; açıklamaya sipariş numaranızı yazmanız yeterli. Hesap sahibi, sitedeki satıcı bilgisiyle aynı kişidir. Taksit ve kapıda ödeme seçeneğimiz bulunmuyor.'
  }
  return 'Şu an ödemeler havale/EFT ile alınıyor. Siparişi onayladığınızda alıcı, banka, IBAN ve tutar ekranda ve e-postanızda yer alır; açıklamaya sipariş numaranızı yazmanız yeterli. Ödemeniz hesabımıza geçince siparişiniz onaylanır ve hazırlanır. Hesap sahibi, sitedeki satıcı bilgisiyle aynı kişidir; kart bilgisi istenmez. Kartla ödemek isterseniz ürünlerimiz Trendyol mağazamızda (NB STEELORA) da satışta. Kapıda ödeme seçeneğimiz bulunmuyor.'
}

/**
 * /sss sayfasında gösterilen tam liste.
 *
 * 24 Kas 2026 tasarım denetimi: müşteri panelinde yanıtsız kalan üç soru
 * eklendi (teslim süresi, üyesiz sipariş, taksit/kapıda ödeme). Hepsi yayındaki
 * metinlerin kısa hâli: süre lib/shipping'den, üyesiz sipariş ve takip
 * kargo-ve-iade sayfasından, ödeme `odemeCevabi` ile aynı gerçeklerden.
 */
export function sssTamami(kartAcik: boolean): SssSorusu[] {
  return [
    ...SSS_TAMAMI_SABIT,
    {
      soru: 'Siparişim ne zaman gelir?',
      cevap: `${TESLIM_CUMLESI} Tahmini teslim tarihini ürün sayfasında ve sepetinizde görürsünüz. ${GONDERIM_BOLGESI}.`,
    },
    {
      soru: 'Üye olmadan sipariş verebilir miyim?',
      cevap:
        'Evet. Ödeme sayfasında bilgilerinizi yazmanız yeterlidir. Siparişinizi de üye olmadan, Kargo Takip sayfasından sipariş numaranız ve e-posta adresinizle izleyebilirsiniz.',
    },
    { soru: 'Nasıl ödeme yapabilirim?', cevap: odemeCevabi(kartAcik) },
    {
      soru: 'Taksit ya da kapıda ödeme var mı?',
      cevap: kartAcik
        ? 'Şu an yok. Kartla tek çekim ya da havale/EFT ile ödeyebilirsiniz.'
        : 'Şu an yok. Ödemeler havale/EFT ile alınıyor.',
    },
  ]
}
