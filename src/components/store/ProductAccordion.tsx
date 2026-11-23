'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Section = {
  title: string
  content: React.ReactNode
}

export default function ProductAccordion({ sections }: { sections: Section[] }) {
  const [open, setOpen] = useState<string | null>(sections[0]?.title ?? null)

  return (
    <div className="mt-8 border-t border-line">
      {sections.map((section) => {
        const isOpen = open === section.title
        return (
          <div key={section.title} className="border-b border-line">
            <button
              onClick={() => setOpen(isOpen ? null : section.title)}
              aria-expanded={isOpen}
              className="group flex min-h-[56px] w-full items-center justify-between gap-4 py-3 text-left"
            >
              {/* 24 Kas 2026 tasarım denetimi: 11 px büyük harf yerine 15 px
                  cümle düzeni — başlıklar okunan cümleler, etiket değil. */}
              <span className="font-body text-[15px] font-medium text-ink transition-colors group-hover:text-accent-deep">
                {section.title}
              </span>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`shrink-0 text-ink-soft transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {/* İçerik her zaman DOM'da: yükseklik yerine grid satırı anime edilir,
                böylece layout sıçraması olmaz ve JS'siz de okunabilir kalır. */}
            {/* Denetim (Faz 11B): kapalı panel aria-hidden'dı ama içindeki
                bağlantılar Tab ile odak alabiliyordu (yükseklik 0, görünmez).
                inert odağı ve tıklamayı birlikte kapatır. */}
            <div className="accordion-panel" data-open={isOpen} aria-hidden={!isOpen} inert={!isOpen}>
              <div>
                <div className="pb-5 font-body text-[14px] leading-[1.65] text-ink-soft">
                  {section.content}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
