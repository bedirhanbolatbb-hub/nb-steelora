const STEPS = ['Bilgiler', 'Ödeme', 'Onay'] as const

/**
 * Ödeme akışının salt görsel adım çizgisi: Bilgiler → Ödeme → Onay.
 *
 * Tıklanabilir değildir ve hiçbir yönlendirme yapmaz; yalnız kullanıcının
 * akışın neresinde olduğunu işaretler. Sıralı bir liste olarak basılır,
 * aktif adım aria-current="step" ile duyurulur.
 */
export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Ödeme adımları" className="flex items-center gap-2 sm:gap-3 mb-8 sm:mb-10">
      {STEPS.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current

        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span
              aria-current={active ? 'step' : undefined}
              className="flex items-center gap-2 min-w-0"
            >
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-body font-medium ${
                  active
                    ? 'bg-ink text-bg'
                    : done
                      ? 'bg-accent-soft text-accent-deep border border-accent/40'
                      : 'border border-line text-muted'
                }`}
              >
                {done ? '✓' : step}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] uppercase tracking-[0.15em] font-body truncate ${
                  active ? 'text-ink font-medium' : done ? 'text-ink-soft' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </span>
            {step < STEPS.length && (
              <span aria-hidden className={`h-px w-4 sm:w-10 ${done ? 'bg-accent/50' : 'bg-line'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
