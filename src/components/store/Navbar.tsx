'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Search, Heart, User, ShoppingBag, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import CartDrawer from './CartDrawer'

const navLinks = [
  { href: '/urunler?kategori=kolye', label: 'Kolye' },
  { href: '/urunler?kategori=kupe', label: 'Küpe' },
  { href: '/urunler?kategori=yuzuk', label: 'Yüzük' },
  { href: '/urunler?kategori=bileklik', label: 'Bileklik' },
  { href: '/urunler?kategori=setler', label: 'Setler' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const totalItems = useCart((s) => s.totalItems())

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full bg-champagne border-b border-champagne-mid transition-shadow duration-300',
        scrolled && 'shadow-md'
      )}
    >
      {/* Duyuru Şeridi */}
      <div className="bg-dark text-center py-2 px-4">
        <p className="text-gold text-[10px] tracking-[0.2em] uppercase font-body">
          Tüm siparişlerde ücretsiz kargo • Premium Çelik Takılar
        </p>
      </div>

      <nav className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Sol: Hamburger (mobil) + Nav Linkleri (desktop) */}
          <div className="flex items-center gap-8">
            <button
              className="lg:hidden text-text-primary"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menü"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[11px] uppercase tracking-[0.15em] font-body text-text-secondary hover:text-gold transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Orta: Logo */}
          <Link href="/" className="flex flex-col items-center">
            <span className="font-heading text-[22px] font-light tracking-[0.15em] text-dark">
              NB STEELORA
            </span>
            <span className="text-[8px] uppercase tracking-[0.25em] text-gold font-body">
              Fine Jewellery
            </span>
          </Link>

          {/* Sağ: İkonlar */}
          <div className="flex items-center gap-4">
            <button className="hidden sm:block text-text-secondary hover:text-gold transition-colors" aria-label="Ara">
              <Search size={18} />
            </button>
            <button className="hidden sm:block text-text-secondary hover:text-gold transition-colors" aria-label="Favoriler">
              <Heart size={18} />
            </button>
            <button className="hidden sm:block text-text-secondary hover:text-gold transition-colors" aria-label="Hesap">
              <User size={18} />
            </button>
            <button
              className="relative text-text-secondary hover:text-gold transition-colors"
              aria-label="Sepet"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gold text-white text-[8px] rounded-full flex items-center justify-center font-body">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobil Menü */}
      {mobileOpen && (
        <div className="lg:hidden bg-champagne border-t border-champagne-mid">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-[12px] uppercase tracking-[0.15em] font-body text-text-secondary hover:text-gold transition-colors py-2"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-4 pt-3 border-t border-champagne-mid">
              <button className="text-text-secondary hover:text-gold transition-colors" aria-label="Ara">
                <Search size={18} />
              </button>
              <button className="text-text-secondary hover:text-gold transition-colors" aria-label="Favoriler">
                <Heart size={18} />
              </button>
              <button className="text-text-secondary hover:text-gold transition-colors" aria-label="Hesap">
                <User size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  )
}
