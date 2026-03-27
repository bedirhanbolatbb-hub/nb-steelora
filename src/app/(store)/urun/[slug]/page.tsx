export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
      <h1 className="font-heading text-[36px] text-text-primary mb-8">Ürün: {slug}</h1>
      <p className="text-text-muted font-body text-sm">Ürün detayları yakında burada gösterilecek.</p>
    </div>
  )
}
