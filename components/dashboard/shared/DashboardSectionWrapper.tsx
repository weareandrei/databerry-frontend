interface DashboardSectionWrapperProps {
  icon?: React.ReactNode
  title: React.ReactNode
  rightSlot?: React.ReactNode
  children: React.ReactNode
  overlay?: React.ReactNode
  className?: string
}

export function DashboardSectionWrapper({
  icon,
  title,
  rightSlot,
  children,
  overlay,
  className,
}: DashboardSectionWrapperProps) {
  return (
    <div className={`relative flex flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card ${className ?? ''}`}>
      {/* Header — slightly tinted so it reads as a distinct zone */}
      <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-stroke bg-main text-grey-darkest">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0">{icon}</span>}
          <div className="min-w-0 flex-1">{title}</div>
        </div>
        {rightSlot && <div className="shrink-0 ml-3">{rightSlot}</div>}
      </div>
      {/* Body — scrollable, not relative so absolute children anchor to the card */}
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      {/* Overlay — anchored to the card, not the scrolling body */}
      {overlay}
    </div>
  )
}
