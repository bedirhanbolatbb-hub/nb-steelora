import Link from 'next/link'

const categories = [
  { href: '/urunler?kategori=kolye', label: 'Kolye' },
  { href: '/urunler?kategori=kupe', label: 'Küpe' },
  { href: '/urunler?kategori=yuzuk', label: 'Yüzük' },
  { href: '/urunler?kategori=bileklik', label: 'Bileklik' },
  { href: '/urunler?kategori=setler', label: 'Setler' },
]

const helpLinks = [
  { href: '/kargo-ve-iade', label: 'Kargo ve İade' },
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/iletisim', label: 'İletişim' },
  { href: '/kvkk', label: 'KVKK Aydınlatma' },
  { href: '/gizlilik-politikasi', label: 'Gizlilik Politikası' },
  { href: '/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi' },
]

export default function Footer() {
  return (
    <footer className="bg-dark-mid text-champagne-mid">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Marka */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <span className="font-heading text-[20px] font-light tracking-[0.15em] text-champagne">
                NB STEELORA
              </span>
              <br />
              <span className="text-[8px] uppercase tracking-[0.25em] text-gold font-body">
                Fine Jewellery
              </span>
            </Link>
            <p className="text-[12px] leading-relaxed text-champagne-mid/70 font-body mt-4">
              Premium çelik takı markası. Her parça, zarafeti ve kaliteyi bir arada sunar.
              Stilinize değer katın.
            </p>
          </div>

          {/* Kategoriler */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-gold font-body mb-5">
              Kategoriler
            </h4>
            <ul className="space-y-3">
              {categories.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="text-[12px] font-body text-champagne-mid/70 hover:text-gold transition-colors"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Yardım */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-gold font-body mb-5">
              Yardım
            </h4>
            <ul className="space-y-3">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[12px] font-body text-champagne-mid/70 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-gold font-body mb-5">
              İletişim
            </h4>
            <ul className="space-y-3 text-[12px] font-body text-champagne-mid/70">
              <li>
                <a href="mailto:info@nbsteelora.com" className="hover:text-gold transition-colors">
                  info@nbsteelora.com
                </a>
              </li>
              <li>Mezitli / Mersin / Türkiye</li>
              <li>
                <a
                  href="https://wa.me/905536552020"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-gold transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp ile Yazın
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Alt Şerit */}
      <div className="border-t border-champagne-mid/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-body text-champagne-mid/50 tracking-wider">
            © 2026 NB Steelora®. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-champagne-mid/50 hover:text-gold transition-colors" aria-label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="#" className="text-champagne-mid/50 hover:text-gold transition-colors" aria-label="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="#" className="text-champagne-mid/50 hover:text-gold transition-colors" aria-label="X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46L20 4"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
