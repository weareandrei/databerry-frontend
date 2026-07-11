import { ArrowLeft, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SectionHeaderProps {
  title: React.ReactNode
  subtitle?: string
  // Left area: decorative icon (static panels) OR back navigation (modals/steps)
  icon?: React.ReactNode
  onBack?: () => void
  // Right area: arbitrary slot (e.g. DateRangePicker) OR close button
  rightSlot?: React.ReactNode
  onClose?: () => void
  className?: string
}

function RoundButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      size="icon"
      variant="outline"
      onClick={onClick}
      className="rounded-full bg-white border-stroke shrink-0 shadow-pill"
    >
      {children}
    </Button>
  )
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  onBack,
  rightSlot,
  onClose,
  className = '',
}: SectionHeaderProps) {
  const leftContent = onBack ? (
    <RoundButton onClick={onBack}>
      <ArrowLeft size={14} weight="bold" className="text-foreground" />
    </RoundButton>
  ) : icon ? (
    <span className="shrink-0">{icon}</span>
  ) : null

  const rightContent = onClose ? (
    <RoundButton onClick={onClose}>
      <X size={14} weight="bold" className="text-foreground" />
    </RoundButton>
  ) : (
    (rightSlot ?? null)
  )

  const titleNode =
    typeof title === 'string' ? (
      <p className="text-sm font-semibold text-foreground leading-tight truncate">{title}</p>
    ) : (
      title
    )

  return (
    <div
      className={cn(
        // No background by default — caller decides via `className`. Lets a
        // single SectionHeader component back both the cream-on-cream
        // "section card" look (callers pass `bg-surface`) and the white
        // sticky-on-white look used by the home dashboard's project
        // cards (callers pass `bg-white`). Avoids a `variant` prop or
        // forking the component.
        'shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-stroke text-foreground',
        className,
      )}
    >
      {leftContent}
      <div className="flex-1 min-w-0">
        {titleNode}
        {subtitle && <p className="text-xs text-subtle leading-tight mt-0.5">{subtitle}</p>}
      </div>
      {rightContent && <div className="shrink-0">{rightContent}</div>}
    </div>
  )
}
