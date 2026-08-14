import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import BlogClient, { type YaziSatiri } from './BlogClient'

export const metadata: Metadata = { title: 'Blog' }
export const dynamic = 'force-dynamic'

export default async function PanelBlogPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, content, cover_image, published, published_at, read_time')
    .order('published_at', { ascending: false })

  const yazilar: YaziSatiri[] = (data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? '',
    content: p.content ?? '',
    coverImage: p.cover_image ?? '',
    published: Boolean(p.published),
    publishedAt: p.published_at,
    readTime: Number(p.read_time || 4),
  }))

  return <BlogClient yazilar={yazilar} />
}
