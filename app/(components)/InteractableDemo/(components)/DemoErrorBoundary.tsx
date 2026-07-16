'use client'

/**
 * Error boundary for the demo. Catches render-time throws from any
 * shared component the demo mounts (most of which assume a real
 * `<DashboardProvider>` is in scope), suppresses the crash, and
 * surfaces a friendly notice instead.
 *
 * Why this exists: shared view cards (`<LiveValueWidget>`,
 * `<SentryIssuesWidget>`, `<FunnelWidget>`, …) include a
 * "Reconnect" affordance that opens `<ReassignConnectionDialog>`,
 * whose body calls `useDashboard()`. There's no `DashboardProvider`
 * inside the demo (the demo is its own self-contained tree), so the
 * hook throws "useDashboard must be used within DashboardProvider"
 * and the entire demo unmounts.
 *
 * Wrapping the demo's page area in this boundary means:
 *   1. The throw is caught — the demo doesn't crash.
 *   2. `onError` fires `showNotice('not available in demo')`, which
 *      paints the existing `<DemoNotice>` overlay above the demo
 *      card.
 *   3. The subtree auto-resets on the next microtask so the user
 *      can keep poking around — any local state in the failing card
 *      (e.g. an open dialog flag) is wiped by the unmount/remount,
 *      so the same click doesn't re-trigger the throw.
 *
 * Catches errors during RENDER, lifecycle methods, and constructors
 * of any child. Does NOT catch event-handler throws (React error
 * boundaries can't — those have to be try/catch'd at the handler
 * level). That's fine for the demo: the failures we care about
 * (hook-out-of-provider, missing context) all happen during render.
 *
 * NOT placed around `<DemoSidebar>` or `<DemoNotice>` — those are
 * demo-native components with no real-product dependencies, so a
 * throw in them is a real bug we want to see, not silently swallow.
 */

import { Component, type ReactNode } from 'react'

interface DemoErrorBoundaryProps {
  /**
   * Fired once per caught error. Wired to
   * `useDemoContext().showNotice(...)` from `<DemoContent>`. The
   * boundary itself stays presentation-free — the notice overlay
   * already exists at the demo's root, this just triggers it.
   */
  onError: (error: Error) => void
  children: ReactNode
}

interface DemoErrorBoundaryState {
  /**
   * Render-suppression flag. While true the boundary returns `null`
   * for ONE render cycle, which lets React unmount the failing
   * subtree cleanly. Flipped back to false on the next microtask
   * inside `componentDidCatch`, so the next render re-mounts the
   * children with fresh local state — including the state that
   * caused the throw in the first place (e.g. `reassignOpen=true`
   * → after remount → `reassignOpen=false`, no re-throw).
   */
  hasError: boolean
}

export class DemoErrorBoundary extends Component<
  DemoErrorBoundaryProps,
  DemoErrorBoundaryState
> {
  state: DemoErrorBoundaryState = { hasError: false }

  /**
   * React calls this synchronously during the render that threw,
   * before unmounting the subtree. We use it only to flip the flag
   * so `render()` returns null on the next pass. No side effects
   * here — those go in `componentDidCatch`.
   */
  static getDerivedStateFromError(): DemoErrorBoundaryState {
    return { hasError: true }
  }

  /**
   * Fires after the failed render. By the time this runs, React
   * has already unmounted the subtree and replaced it with our
   * null render. We:
   *   1. Forward the error to the parent so it can pop the demo
   *      notice (`showNotice('not available in demo')`).
   *   2. Queue a microtask that flips `hasError` back to false,
   *      causing the next render to re-mount the children fresh.
   *      `queueMicrotask` instead of `setState` directly because
   *      React forbids setState calls during commit phase that
   *      would cause infinite loops — the microtask defers the
   *      flip past commit, into the next event-loop tick.
   */
  componentDidCatch(error: Error): void {
    this.props.onError(error)
    queueMicrotask(() => this.setState({ hasError: false }))
  }

  render(): ReactNode {
    if (this.state.hasError) return null
    return this.props.children
  }
}
