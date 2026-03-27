import Link from 'next/link'

const categories = [
  { name: 'Kolye', slug: 'kolye' },
  { name: 'Küpe', slug: 'kupe' },
  { name: 'Yüzük', slug: 'yuzuk' },
  { name: 'Bileklik', slug: 'bileklik' },
  { name: 'Setler', slug: 'setler' },
]

export default function CategoryGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
      <h2 className="font-heading text-[32px] text-center text-text-primary mb-12">
        Kategoriler
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/urunler?kategori=${cat.slug}`}
            className="group"
          >
            <div className="aspect-square bg-champagne-dark relative overflow-hidden transition-transform duration-500 group-hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-t from-dark/40 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-text-muted/30 text-[10px] font-body tracking-wider uppercase">
                  {cat.name} Görseli
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-heading text-[18px] text-champagne text-center">
                  {cat.name}
                </h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
