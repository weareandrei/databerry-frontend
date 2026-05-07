import { useState, useEffect } from 'react'

/**
 * Returns `true` when the viewport is below the Tailwind `md`
 * breakpoint (default 768 px). SSR-safe — returns `false` on first
 * render, then settles to the actual value on the next paint via
 * a `useEffect` measurement. Re-measures on window resize.
 *
 * Use sparingly. Prefer `md:hidden` / `hidden md:flex` Tailwind
 * gates when the difference is purely visual — JS-driven branching
 * causes a one-frame flicker on first paint and has worse LCP. Use
 * this hook only when *behaviour* (not just style) needs to fork
 * — e.g. routing decisions like "tap a project: navigate vs.
 * scroll".
 */
export function useMobileBreakpoint(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}

/**
 * Alias of `useMobileBreakpoint()` with the breakpoint baked in.
 * Reads more naturally at call sites where the boolean's purpose
 * (mobile vs. desktop) matters more than the underlying threshold.
 */
export const useIsMobile = (): boolean => useMobileBreakpoint(768)
