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
      {/* Seçiciler torun seçicisidir ([&_h2]) — içerik hem doğrudan JSX olarak
          hem de tek bir sarmalayıcı div içinde (site_content'ten gelen HTML)
          basılabiliyor; ikisi de aynı tipografiyi almalı. Tablo ve h3 kuralları
          Faz 12 hukuki metinleriyle geldi. */}
      <div className="max-w-[68ch] space-y-6 text-[13px] lg:text-[14px] font-body text-ink-soft leading-relaxed [&_h2]:font-heading [&_h2]:text-[22px] [&_h2]:lg:text-[26px] [&_h2]:font-medium [&_h2]:text-ink [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:pt-8 [&_h2]:border-t [&_h2]:border-line [&_h2:first-child]:mt-0 [&_h2:first-child]:pt-0 [&_h2:first-child]:border-t-0 [&>div>h2:first-child]:mt-0 [&>div>h2:first-child]:pt-0 [&>div>h2:first-child]:border-t-0 [&_h3]:font-heading [&_h3]:text-[16px] [&_h3]:lg:text-[18px] [&_h3]:font-medium [&_h3]:text-ink [&_h3]:mt-7 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_p]:mb-0 [&_p+p]:mt-4 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-ink [&_strong]:font-medium [&_hr]:border-line [&_hr]:mt-10 [&_code]:text-[12px] [&_code]:text-ink [&_table]:w-full [&_table]:my-4 [&_table]:text-[12px] [&_table]:border-collapse [&_th]:border [&_th]:border-line [&_th]:bg-surface-muted [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-ink [&_th]:align-top [&_td]:border [&_td]:border-line [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-top">
        {children}
      </div>
    </div>
  )
}
