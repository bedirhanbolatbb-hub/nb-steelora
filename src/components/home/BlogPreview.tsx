import Image from 'next/image'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'

/** Blog önizleme (YENİ bant) — son 3 yayında yazı, kapaklı kart. */
export default async function BlogPreview() {
  let posts: any[] = []
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, read_time, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(3)
    posts = data || []
  } catch {
    return null
  }

  if (posts.length === 0) return null

  return (
    <section className="bg-surface-muted border-y border-line">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-16 lg:py-20">
        <div className="mb-8 flex items-end justify-between" data-reveal>
          <div>
            <p className="eyebrow">Günlük</p>
            <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-ink mt-2">
              Takı Rehberi
            </h2>
          </div>
          <Link
            href="/blog"
            className="hidden sm:block text-[11px] uppercase tracking-[0.16em] font-body font-medium text-ink border-b border-accent pb-0.5 hover:text-accent-deep transition-colors"
          >
            Tüm Yazılar →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
          {posts.map((post, i) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group block"
              data-reveal
              style={{ '--reveal-delay': `${i * 60}ms` } as React.CSSProperties}
            >
              <div className="relative aspect-[3/2] overflow-hidden rounded-[4px] bg-surface">
                {post.cover_image ? (
                  <Image
                    src={post.cover_image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-heading text-[30px] text-line">
                    NB
                  </span>
                )}
              </div>
              <p className="mt-3 text-[10px] font-body uppercase tracking-[0.14em] text-muted">
                {post.read_time} dk okuma
              </p>
              <h3 className="mt-1 font-heading text-[18px] font-medium text-ink leading-snug group-hover:text-accent-deep transition-colors">
                {post.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
