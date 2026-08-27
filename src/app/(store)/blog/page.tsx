import Link from 'next/link'
import { isRemoteMedia } from '@/lib/images'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/service'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // absolute: kök layout'un '%s | NB Steelora' şablonu marka adını bir kez daha
  // ekliyordu — başlık "Blog | NB Steelora | NB Steelora" çıkıyordu.
  title: { absolute: 'Blog | NB Steelora' },
  description: 'Takı dünyasından ipuçları, bakım rehberleri ve ilhamlar. Paslanmaz çelik takılar hakkında bilmeniz gereken her şey.',
  alternates: { canonical: '/blog' },
}

export const revalidate = 0

export default async function BlogPage() {
  const supabase = createServiceClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, published_at, read_time')
    .eq('published', true)
    .order('published_at', { ascending: false })

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
      <div className="mb-10" data-reveal>
        <p className="eyebrow">Günlük</p>
        <h1 className="font-heading text-[38px] lg:text-[48px] font-medium text-ink mt-2">
          Blog
        </h1>
        <p className="text-[13px] font-body text-ink-soft mt-2">
          Takı dünyasından ipuçları, bakım rehberleri ve ilhamlar.
        </p>
      </div>

      {(!posts || posts.length === 0) ? (
        <p className="text-muted font-body text-[13px]">Henüz yayınlanmış yazı yok.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {posts.map((post, i) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col bg-surface border border-line rounded-[4px] overflow-hidden hover:border-accent-line/50 transition-colors"
              data-reveal
              style={{ '--reveal-delay': `${(i % 3) * 50}ms` } as React.CSSProperties}
            >
              <div className="relative aspect-[3/2] bg-surface-muted overflow-hidden">
                {post.cover_image ? (
                  <Image
                    src={post.cover_image}
                    unoptimized={isRemoteMedia(post.cover_image)}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-heading text-[36px] text-line">NB</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 p-5">
                <div className="flex items-center gap-2 text-[10px] font-body text-muted uppercase tracking-[0.12em]">
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
                <h2 className="font-heading text-[19px] font-semibold text-ink leading-snug mt-2 group-hover:text-accent-deep transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-[12px] font-body text-ink-soft mt-2 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                <span className="mt-4 pt-1 text-[11px] uppercase tracking-[0.15em] font-body font-medium text-ink border-b border-accent-line pb-0.5 self-start">
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
