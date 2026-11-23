import Image from 'next/image'
import { isRemoteMedia } from '@/lib/images'
import Link from 'next/link'
import BolumBasligi from '@/components/home/BolumBasligi'

/** Blog önizleme — son 3 yazı homeData katmanından gelir (Faz 9A). */
export default function BlogPreview({ posts }: { posts: any[] }) {
  if (posts.length === 0) return null

  return (
    // 24 Kas 2026 tasarım denetimi: telefonda üç tam genişlik kapak 1.227 px
    // tutuyordu. Telefonda küçük görselli üç satır; geniş ekranda üç sütun.
    <section className="mt-12 border-y border-line bg-surface-muted lg:mt-20">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
        <BolumBasligi baslik="Takı Rehberi" href="/blog" etiket="Tüm yazılar" />

        <ul className="divide-y divide-line sm:grid sm:grid-cols-3 sm:gap-5 sm:divide-y-0 lg:gap-6">
          {posts.map((post, i) => (
            <li
              key={post.id}
              data-reveal
              style={{ '--reveal-delay': `${i * 60}ms` } as React.CSSProperties}
            >
              <Link
                prefetch={false}
                href={`/blog/${post.slug}`}
                className="group flex items-center gap-4 py-3 sm:block sm:py-0"
              >
                <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[4px] bg-surface sm:aspect-[3/2] sm:h-auto sm:w-full">
                  {post.cover_image && (
                    <Image
                      src={post.cover_image}
                      unoptimized={isRemoteMedia(post.cover_image)}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 88px, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  )}
                </div>
                <div className="min-w-0 sm:mt-3">
                  <p className="font-body text-[12px] text-muted">{post.read_time} dk okuma</p>
                  <h3 className="mt-1 font-heading text-[17px] font-medium leading-snug text-ink transition-colors group-hover:text-accent-deep sm:text-[20px]">
                    {post.title}
                  </h3>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
