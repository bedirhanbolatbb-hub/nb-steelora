/**
 * Belge sayfası şablonu v2 ("Sessiz Atölye") — kargo/iade, KVKK, gizlilik,
 * mesafeli satış ve diğer metin sayfaları bu tek şablonla giydirilir.
 * İçerik metinleri değişmez; yalnız tipografi ve ölçü.
 */
export default function LegalPageLayout({
  title,
  eyebrow = 'Bilgi',
  children,
}: {
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-14 lg:py-20">
      <header className="max-w-[68ch] border-b border-line pb-8 mb-10">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-heading text-[38px] lg:text-[48px] font-medium text-ink leading-tight mt-2">
          {title}
        </h1>
      </header>
      <div className="max-w-[68ch] space-y-6 text-[13px] lg:text-[14px] font-body text-ink-soft leading-relaxed [&>h2]:font-heading [&>h2]:text-[22px] [&>h2]:lg:text-[26px] [&>h2]:font-medium [&>h2]:text-ink [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:pt-8 [&>h2]:border-t [&>h2]:border-line [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2 [&>p]:mb-0">
        {children}
      </div>
    </div>
  )
}
