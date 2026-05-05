import {SectionHeader} from "@/app/hub/(components)/SectionHeader";

interface WindowWrapperProps {
  icon?: React.ReactNode
  title: React.ReactNode
  rightSlot?: React.ReactNode
  children: React.ReactNode
  overlay?: React.ReactNode
  className?: string
}

const WindowWrapper = ({
  icon,
  title,
  rightSlot,
  children,
  overlay,
  className,
}: WindowWrapperProps) => {
  return (
    <div className={`relative flex flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card ${className ?? ''}`}>
      {/* `bg-main` was previously the SectionHeader default; pass it
          explicitly now that the component no longer hardcodes a bg. */}
      <SectionHeader icon={icon} title={title} rightSlot={rightSlot} className="bg-main" />
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      {overlay}
    </div>
  )
}

export default WindowWrapper
