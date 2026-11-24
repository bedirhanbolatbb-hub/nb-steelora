import Link from 'next/link'
import { MARKA_ALT_SATIR_BUYUK } from '@/lib/metin/marka'
import { CATEGORIES } from '@/lib/catalog/categories'
import type { CollectionCard } from '@/lib/collections'
import { WHATSAPP_URL } from '@/lib/contact'
import CerezTercihleriDugmesi from './CerezTercihleriDugmesi'
import OdemeLogolari from './OdemeLogolari'
import HesapBaglantilari from './HesapBaglantilari'
import { kunyeSatirlari } from '@/lib/layoutData'

// Menüyle birebir aynı liste — tek kaynak src/lib/catalog/categories.ts
const categories = CATEGORIES.map((c) => ({ href: `/kategori/${c.slug}`, label: c.title }))

// 24 Kas 2026 tasarım denetimi: "Yardım" başlığı altında on bir bağlantı
// vardı; yardım ile yasal metinler karışıktı. İki ayrı grup.
const helpLinks = [
  { href: '/kargo-takip', label: 'Sipariş Takibi' },
  { href: '/kargo-ve-iade', label: 'Kargo, İade ve Değişim' },
  { href: '/sss', label: 'Sık Sorulan Sorular' },
  { href: '/blog', label: 'Takı Rehberi' },
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/iletisim', label: 'İletişim' },
]

const legalLinks = [
  { href: '/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi' },
  { href: '/on-bilgilendirme-formu', label: 'Ön Bilgilendirme Formu' },
  { href: '/cayma-formu', label: 'Örnek Cayma Formu' },
  { href: '/kvkk', label: 'KVKK Aydınlatma' },
  { href: '/gizlilik-politikasi', label: 'Gizlilik Politikası' },
  { href: '/cerez-politikasi', label: 'Çerez Politikası' },
]

const accountLinks = {
  loggedIn: [{ href: '/hesabim', label: 'Hesabım' }],
  loggedOut: [
    { href: '/giris', label: 'Giriş Yap' },
    { href: '/kayit', label: 'Üye Ol' },
  ],
}

/**
 * Faz 11A — footer bağlantılarında `prefetch={false}`.
 *
 * Footer her sayfanın altında ve içinde onlarca bağlantı var; hepsi görünür
 * alana girdiği anda Next router her biri için ayrı bir RSC isteği açıyordu.
 * Bunlar kimsenin tıklamadığı sayfalar için ücretsiz kargo etiketinden ETBİS
 * satırına kadar sunucu çalıştırıyor. Tıklandığında zaten anında yükleniyor;
 * öncesinde ısıtmanın karşılığı yok.
 *
 * Ana menü ve ürün kartları DOKUNULMADI: onlar gerçekten tıklanan yollar,
 * orada prefetch hızın kendisi.
 */
/** Ticaret Bakanlığı ETBİS kamuya açık site kaydı — nbsteelora.com. */
const ETBIS_DOGRULAMA =
  'https://etbis.ticaret.gov.tr/tr/SiteSorgulamaSonuc?siteId=ca30e2bd-074e-48c3-a7d4-5162d95579bd'

export default function Footer({
  collections,
  content,
}: {
  // Koleksiyonlar üst menüye eklenmiyor (menü dolu); giriş noktası footer.
  // Veri layout'un süreç içi önbelleğinden gelir (Faz 9A).
  collections: CollectionCard[]
  // Sosyal adresler site_content'ten; boş anahtar ikon basmaz.
  content: Record<string, string>
}) {
  const kunye = kunyeSatirlari(content)
  const sosyal = [
    {
      label: 'Instagram',
      href: (content.instagram_url || '').trim(),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
      ),
    },
    {
      label: 'Facebook',
      href: (content.facebook_url || '').trim(),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
      ),
    },
    {
      label: 'X',
      href: (content.x_url || '').trim(),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46L20 4"/></svg>
      ),
    },
    {
      label: 'TikTok',
      href: (content.tiktok_url || '').trim(),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z"/></svg>
      ),
    },
  ].filter((s) => s.href)

  return (
    <footer className="bg-ink-deep text-line">
      {/* Ortada marka bloğu — Sessiz Atölye kapanışı */}
      <div className="border-b border-line/10">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-12 text-center">
          <Link prefetch={false} href="/" className="inline-block">
            <span className="font-heading text-[26px] font-light tracking-[0.2em] text-bg block">
              NB STEELORA
            </span>
            <span className="mt-1.5 block whitespace-nowrap font-body text-[10px] tracking-[0.34em] text-accent">
              {MARKA_ALT_SATIR_BUYUK}
            </span>
          </Link>
          <p className="text-[14px] leading-relaxed text-line/75 font-body mt-4 max-w-md mx-auto">
            316L çelik ve kaplama takı markası. Her ürünün malzemesi kendi sayfasında yazar.
          </p>
        </div>
      </div>

      {/* 24 Kas 2026 tasarım denetimi: alt bilgi telefonda ~1.300 px'ti; bağlantılar
          12 px yazı ve 30 px satırdı. Telefonda önce iletişim, sonra üç açılır
          grup (yerel <details>, betik yok); geniş ekranda dört sütun. Yazı 14 px,
          satırlar 44 px. */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-14">
        <div className="md:grid md:grid-cols-4 md:gap-10">
          {/* İletişim — telefonda en üstte */}
          <div className="md:order-last">
            <h4 className="mb-3 font-body text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
              İletişim
            </h4>
            <ul className="font-body text-[14px] text-line/80">
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 text-bg transition-colors hover:text-accent"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  WhatsApp&apos;tan yazın
                </a>
              </li>
              <li>
                {/* Telefon her sayfanın altında ve TIKLANABİLİR olmalı: Merchant
                    Center "yanlış beyan" denetiminde işletmeye ulaşmanın en az
                    iki yolu her sayfada aranıyor (5 Eyl 2026). */}
                <a href="tel:+905051984646" className="inline-flex min-h-[44px] items-center transition-colors hover:text-accent">
                  0505 198 46 46
                </a>
              </li>
              <li>
                <a href="mailto:info@nbsteelora.com" className="inline-flex min-h-[44px] items-center transition-colors hover:text-accent">
                  info@nbsteelora.com
                </a>
              </li>
              <li className="py-2 leading-relaxed">{(content.veri_sorumlusu_adres || '').trim() || 'Mezitli / Mersin / Türkiye'}</li>
              <li className="py-1 text-line/60">Pazartesi–Cuma, 09.00–18.00</li>
            </ul>
          </div>

          {/* Telefon: açılır gruplar */}
          <div className="mt-6 border-t border-line/10 md:hidden">
            {[
              {
                baslik: 'Alışveriş',
                baglantilar: [
                  { href: '/urunler', label: 'Tüm Ürünler' },
                  ...categories,
                  ...collections.map((k) => ({ href: `/koleksiyon/${k.slug}`, label: k.name })),
                ],
                hesap: false,
              },
              { baslik: 'Yardım', baglantilar: helpLinks, hesap: true },
              { baslik: 'Yasal metinler', baglantilar: legalLinks, hesap: false },
            ].map((grup) => (
              <details key={grup.baslik} className="group border-b border-line/10">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between font-body text-[15px] font-medium text-bg [&::-webkit-details-marker]:hidden">
                  {grup.baslik}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-line/60 transition-transform duration-200 group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
                </summary>
                <ul className="pb-3">
                  {grup.baglantilar.map((b) => (
                    <li key={b.href}>
                      <Link
                        href={b.href}
                        prefetch={false}
                        className="flex min-h-[44px] items-center font-body text-[14px] text-line/80 transition-colors hover:text-accent"
                      >
                        {b.label}
                      </Link>
                    </li>
                  ))}
                  {grup.hesap && (
                    <HesapBaglantilari
                      girisli={accountLinks.loggedIn}
                      girissiz={accountLinks.loggedOut}
                      className="flex min-h-[44px] items-center font-body text-[14px] text-line/80 transition-colors hover:text-accent"
                    />
                  )}
                </ul>
              </details>
            ))}
          </div>

          {/* Geniş ekran: sütunlar */}
          <div className="hidden md:block">
            <h4 className="mb-4 font-body text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
              Alışveriş
            </h4>
            <ul className="space-y-2.5">
              {[{ href: '/urunler', label: 'Tüm Ürünler' }, ...categories].map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    prefetch={false}
                    className="font-body text-[14px] text-line/80 transition-colors hover:text-accent"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Koleksiyonlar — adlar admin verisinden gelir */}
            {collections.length > 0 && (
              <>
                <h4 className="mb-4 mt-8 font-body text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                  Koleksiyonlar
                </h4>
                <ul className="space-y-2.5">
                  {collections.map((collection) => (
                    <li key={collection.slug}>
                      <Link
                        href={`/koleksiyon/${collection.slug}`}
                        prefetch={false}
                        className="font-body text-[14px] text-line/80 transition-colors hover:text-accent"
                      >
                        {collection.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="hidden md:block">
            <h4 className="mb-4 font-body text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
              Yardım
            </h4>
            <ul className="space-y-2.5">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="font-body text-[14px] text-line/80 transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <HesapBaglantilari
                girisli={accountLinks.loggedIn}
                girissiz={accountLinks.loggedOut}
                className="font-body text-[14px] text-line/80 transition-colors hover:text-accent"
              />
            </ul>
          </div>

          <div className="hidden md:block">
            <h4 className="mb-4 font-body text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
              Yasal metinler
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="font-body text-[14px] text-line/80 transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Alt Şerit */}
      <div className="border-t border-line/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col items-center gap-4">
          {/* Kart logoları — Tosla sanal POS şartı (13 Kas 2026); ayrıntı bileşende. */}
          <OdemeLogolari />
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
          <p className="text-center font-body text-[12px] leading-relaxed text-line/65 sm:text-left">
            {/* Satıcı künyesi — E-Ticaret Kanunu gereği; boş alanlar basılmaz. */}
            {kunye.length > 0 && (
              <>
                {kunye.join(' · ')}
                <br />
              </>
            )}
            {content.veri_sorumlusu_etbis ? (
              <>
                {content.veri_sorumlusu_etbis.startsWith('http') ? (
                  <a
                    href={content.veri_sorumlusu_etbis}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block py-2.5 -my-2.5 underline underline-offset-2 hover:text-accent transition-colors"
                  >
                    ETBİS kayıt doğrulama
                  </a>
                ) : (
                  /* Numara yazmak yetmiyor: kaydın DOĞRULANABİLİR olması gerekiyor.
                     Bağlantı Ticaret Bakanlığı'nın kamuya açık site sorgusuna gider. */
                  <a
                    href={ETBIS_DOGRULAMA}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block py-2.5 -my-2.5 underline underline-offset-2 hover:text-accent transition-colors"
                  >
                    ETBİS: {content.veri_sorumlusu_etbis} — kaydı doğrula
                  </a>
                )}
                {' · '}
              </>
            ) : null}
            © 2026 NB Steelora®. Tüm hakları saklıdır.
            {' · '}
            {/* Rıza her zaman geri alınabilir olmalı (KVKK) — bandı yeniden açar. */}
            <CerezTercihleriDugmesi />
          </p>
          {/* Sosyal ikonlar site_content'ten beslenir; yalnız DOLU adresler
              basılır (panel → Site Metinleri). */}
          {sosyal.length > 0 && (
            <div className="flex items-center gap-3">
              {sosyal.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-m-2 flex h-11 w-11 items-center justify-center text-line/75 hover:text-accent transition-colors"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </footer>
  )
}
