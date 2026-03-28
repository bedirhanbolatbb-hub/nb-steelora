export default function LegalPageLayout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
      <h1 className="font-heading text-[36px] font-light text-text-primary mb-2">
        {title}
      </h1>
      <div className="w-16 h-px bg-gold mb-10" />
      <div className="space-y-6 text-[13px] font-body text-text-secondary leading-relaxed [&>h2]:font-heading [&>h2]:text-[24px] [&>h2]:font-light [&>h2]:text-text-primary [&>h2]:mt-10 [&>h2]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2 [&>p]:mb-0">
        {children}
      </div>
    </div>
  )
}
