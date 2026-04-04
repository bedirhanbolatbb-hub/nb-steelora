import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import type { Metadata } from 'next'

export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('published', true)
  return (data || []).map((p) => ({ slug: p.slug }))
}

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || '',
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: 'NB Steelora' },
    publisher: {
      '@type': 'Organization',
      name: 'NB Steelora',
      logo: { '@type': 'ImageObject', url: '/logo.png' },
    },
    ...(post.cover_image && { image: post.cover_image }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        {post.cover_image && (
          <div className="relative h-64 w-full overflow-hidden bg-champagne-dark">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[10px] font-body text-text-muted uppercase tracking-wider mb-8 flex-wrap">
            <Link href="/" className="hover:text-gold transition-colors">
              Ana Sayfa
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-gold transition-colors">
              Blog
            </Link>
            <span>/</span>
            <span className="text-text-primary truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {post.published_at && (
                <span className="text-[10px] font-body text-text-muted uppercase tracking-wider">
                  {new Date(post.published_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
              <span className="text-champagne-mid">·</span>
              <span className="text-[10px] font-body text-text-muted uppercase tracking-wider">
                {post.read_time} dk okuma
              </span>
            </div>
            <h1 className="font-heading text-[36px] sm:text-[42px] font-light text-text-primary leading-tight">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-[14px] font-body text-text-secondary mt-4 leading-relaxed border-l-2 border-gold pl-4 italic">
                {post.excerpt}
              </p>
            )}
          </div>

          {/* Content */}
          <div
            className="prose-blog"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Related posts */}
        {related && related.length > 0 && (
          <section className="bg-champagne-dark py-12">
            <div className="max-w-7xl mx-auto px-4 lg:px-8">
              <h2 className="font-heading text-[24px] text-text-primary mb-8 text-center">
                Diğer Yazılar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    href={`/blog/${p.slug}`}
                    className="group bg-white border border-champagne-mid hover:-translate-y-1 transition-transform duration-300 overflow-hidden"
                  >
                    <div className="relative h-40 bg-champagne-dark overflow-hidden">
                      {p.cover_image ? (
                        <Image
                          src={p.cover_image}
                          alt={p.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-heading text-[30px] text-champagne-mid">NB</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading text-[16px] text-text-primary group-hover:text-gold transition-colors leading-snug">
                        {p.title}
                      </h3>
                      <span className="text-[10px] font-body text-text-muted mt-1 block">
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
