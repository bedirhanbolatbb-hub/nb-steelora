import Image from 'next/image'
import { isRemoteMedia } from '@/lib/images'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import type { Metadata } from 'next'
import JsonLd from '@/components/seo/JsonLd'
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo'
import ProductGrid from '@/components/store/ProductGrid'
import { yaziKategorisi, railUrunleri } from '@/lib/blog/kategori'

/**
 * Yazı sayfaları artık istek anında render ediliyor: ölçüm (blog/layout.tsx)
 * istek başlıklarını okuduğu için sayfa önceden üretilemez. Önceki 1 saatlik
 * ISR ve generateStaticParams bu yüzden kaldırıldı — aksi hâlde önbellekten
 * dönen isteklerde blog trafiği ölçüme hiç girmezdi. Sorgu tek satırlık ve
 * vitrinin geri kalanı da (store) grubunda aynı şekilde dinamik.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('meta_title, meta_description, title, excerpt')
    .eq('slug', slug)
    .single()
  if (!data) return {}
  return {
    title: data.meta_title || `${data.title} | NB Steelora Blog`,
    description: data.meta_description || data.excerpt || '',
    alternates: { canonical: `/blog/${slug}` },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!post) notFound()

  const { data: related } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, published_at, read_time')
    .eq('published', true)
    .neq('slug', slug)
    .order('published_at', { ascending: false })
    .limit(3)

  // Arama trafiğini ürüne çeviren bağ: yazının konusuna en yakın kategoriden
  // üç ürün. Eşleşme çıkmazsa çok satanlarla doldurulur (bkz. lib/blog/kategori).
  const konu = yaziKategorisi(`${post.title} ${post.excerpt ?? ''} ${post.content ?? ''}`)
  const railUrunler = await railUrunleri(konu?.kategori ?? null, 3)
  const kesfetYolu = konu ? `/urunler?kategori=${encodeURIComponent(konu.kategori)}` : '/urunler'

  return (
    <>
      {/* Article + BreadcrumbList — boş alan basılmaz (bkz. lib/seo.ts) */}
      <JsonLd
        data={articleJsonLd({
          slug,
          title: post.title,
          description: post.excerpt || '',
          image: post.cover_image || null,
          publishedAt: post.published_at || null,
          updatedAt: post.updated_at || null,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: `/blog/${slug}` },
        ])}
      />
      <main>
        {post.cover_image && (
          <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-8">
            <div className="relative aspect-[16/9] sm:aspect-[2/1] w-full overflow-hidden rounded-[4px] bg-surface-muted">
              <Image
                src={post.cover_image}
                unoptimized={isRemoteMedia(post.cover_image)}
                alt={post.title}
                fill
                sizes="(max-width: 1024px) 100vw, 900px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        )}

        <div className="max-w-[68ch] mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[10px] font-body text-muted uppercase tracking-wider mb-8 flex-wrap">
            <Link href="/" className="hover:text-accent-deep transition-colors">
              Ana Sayfa
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-accent-deep transition-colors">
              Blog
            </Link>
            <span>/</span>
            <span className="text-ink truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4 flex-wrap text-[10px] font-body text-muted uppercase tracking-[0.12em]">
              {post.published_at && (
                <span>
                  {new Date(post.published_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
              <span className="text-line">·</span>
              <span>{post.read_time} dk okuma</span>
            </div>
            <h1 className="font-heading text-[36px] sm:text-[46px] font-medium text-ink leading-[1.1]">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-[14px] font-body text-ink-soft mt-4 leading-relaxed border-l-2 border-accent-line pl-4">
                {post.excerpt}
              </p>
            )}
          </div>

          {/* Content */}
          <div
            className="prose-blog"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Yazı sonu — vitrine dönüş (yazının konusuna göre süzülmüş) */}
          <div className="mt-12 pt-8 border-t border-line text-center">
            <p className="text-[12px] font-body text-ink-soft mb-4">
              Okuduklarını takıya dönüştür.
            </p>
            <Link
              href={kesfetYolu}
              className="inline-flex items-center justify-center bg-ink text-bg text-[11px] uppercase tracking-[0.15em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
            >
              {konu ? `${konu.etiket} Koleksiyonunu Keşfet` : 'Koleksiyonu Keşfet'}
            </Link>
          </div>
        </div>

        {/* Ürün rail'i — mevcut kart bileşeniyle, vitrindekiyle aynı dil */}
        {railUrunler.length > 0 && (
          <section className="border-t border-line py-14">
            <div className="max-w-7xl mx-auto px-4 lg:px-8">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-3" data-reveal>
                <div>
                  <p className="eyebrow">Bu yazıdan ilham</p>
                  <h2 className="font-heading text-[28px] lg:text-[32px] font-medium text-ink mt-2">
                    {konu ? `${konu.etiket} Önerileri` : 'Çok Satanlar'}
                  </h2>
                </div>
                <Link
                  href={kesfetYolu}
                  className="text-[11px] uppercase tracking-[0.15em] font-body text-accent-deep hover:text-ink transition-colors"
                >
                  Tümünü gör
                </Link>
              </div>
              <ProductGrid products={railUrunler} columns={3} />
            </div>
          </section>
        )}

        {/* Related posts */}
        {related && related.length > 0 && (
          <section className="bg-surface-muted border-t border-line py-14">
            <div className="max-w-7xl mx-auto px-4 lg:px-8">
              <div className="mb-8" data-reveal>
                <p className="eyebrow">Devamı</p>
                <h2 className="font-heading text-[28px] lg:text-[32px] font-medium text-ink mt-2">
                  Diğer Yazılar
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
                {related.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/blog/${p.slug}`}
                    className="group bg-surface border border-line rounded-[4px] overflow-hidden hover:border-accent-line/50 transition-colors"
                    data-reveal
                    style={{ '--reveal-delay': `${i * 50}ms` } as React.CSSProperties}
                  >
                    <div className="relative aspect-[3/2] bg-surface-muted overflow-hidden">
                      {p.cover_image ? (
                        <Image
                          src={p.cover_image}
                          unoptimized={isRemoteMedia(p.cover_image)}
                          alt={p.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-heading text-[30px] text-line">NB</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading text-[17px] font-semibold text-ink group-hover:text-accent-deep transition-colors leading-snug">
                        {p.title}
                      </h3>
                      <span className="text-[10px] font-body text-muted uppercase tracking-[0.12em] mt-1.5 block">
                        {p.read_time} dk okuma
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  )
}
