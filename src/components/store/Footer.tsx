import Link from 'next/link'

const categories = [
  { href: '/urunler?kategori=kolye', label: 'Kolye' },
  { href: '/urunler?kategori=kupe', label: 'Küpe' },
  { href: '/urunler?kategori=yuzuk', label: 'Yüzük' },
  { href: '/urunler?kategori=bileklik', label: 'Bileklik' },
  { href: '/urunler?kategori=setler', label: 'Setler' },
]

const helpLinks = [
  { href: '/kargo', label: 'Kargo Bilgileri' },
  { href: '/iade', label: 'İade & Değişim' },
  { href: '/sss', label: 'Sıkça Sorulan Sorular' },
  { href: '/kvkk', label: 'KVKK Aydınlatma' },
  { href: '/gizlilik', label: 'Gizlilik Politikası' },
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
              Premium Türk takı markası. Her parça, zarafeti ve kaliteyi bir arada sunar.
              Orijinal sertifikalı ürünlerle stilinize değer katın.
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
              <li>info@nbsteelora.com</li>
              <li>+90 (555) 000 00 00</li>
              <li>İstanbul, Türkiye</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Alt Şerit */}
      <div className="border-t border-champagne-mid/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-body text-champagne-mid/50 tracking-wider">
            © 2025 NB Steelora. Tüm hakları saklıdır.
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
