import Link from 'next/link'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/service'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog | NB Steelora',
  description: 'Takı dünyasından ipuçları, bakım rehberleri ve ilhamlar. Paslanmaz çelik takılar hakkında bilmeniz gereken her şey.',
}

export const revalidate = 3600

export default async function BlogPage() {
  const supabase = createServiceClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, published_at, read_time')
    .eq('published', true)
    .order('published_at', { ascending: false })

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="font-heading text-[40px] font-light text-text-primary">Blog</h1>
        <p className="text-[12px] font-body text-text-muted mt-2 tracking-[0.15em] uppercase">
          Takı dünyasından ipuçları ve ilhamlar
        </p>
      </div>

      {(!posts || posts.length === 0) ? (
        <p className="text-center text-text-muted font-body">Henüz yayınlanmış yazı yok.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-white border border-champagne-mid hover:-translate-y-1 transition-transform duration-300 overflow-hidden"
            >
              <div className="relative h-52 bg-champagne-dark overflow-hidden">
                {post.cover_image ? (
                  <Image
                    src={post.cover_image}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-heading text-[40px] text-champagne-mid">NB</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
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
                <h2 className="font-heading text-[18px] text-text-primary leading-snug group-hover:text-gold transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-[12px] font-body text-text-secondary mt-2 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                <span className="inline-block mt-4 text-[11px] font-body text-gold uppercase tracking-wider">
                  Devamını Oku →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
