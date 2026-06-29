import { useSyncExternalStore } from 'react'

/**
 * Tiny module-level store tracking whether our API server is reachable.
 *
 * `apiFetch` reports into this on every request: a network-level failure
 * (the `fetch` promise rejects — connection refused, DNS, timeout, server
 * down) or a gateway 5xx (502/503/504) marks the server UNREACHABLE; any
 * real HTTP response (a 2xx, or even a 4xx the server itself returned)
 * proves the server answered and marks it REACHABLE again.
 *
 * `<ServerStatusGate>` subscribes via `useServerReachable` and shows a
 * full-screen "server is down" notice while unreachable.
 *
 * Why a standalone store (not Redux / context): `apiFetch` is a plain async
 * function with no React or Redux access, and this mirrors the existing
 * module-level bus pattern in `useAccount`. `useSyncExternalStore` gives
 * React a tear-free subscription with an SSR-safe default of "reachable".
 */

let reachable = true
const listeners = new Set<() => void>()

function setReachable(next: boolean): void {
  if (reachable === next) return
  reachable = next
  for (const listener of listeners) listener()
}

/** Called by `apiFetch` whenever the server answered (any HTTP status). */
export function reportServerReachable(): void {
  setReachable(true)
}

/** Called by `apiFetch` on a network-level failure / gateway 5xx. */
export function reportServerUnreachable(): void {
  setReachable(false)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): boolean {
  return reachable
}

// SSR always renders "reachable": the server-down screen is a client-only,
// post-fetch concern, so we never ship it in the SSR HTML (which would
// otherwise cause a hydration mismatch on first paint).
function getServerSnapshot(): boolean {
  return true
}

/** `true` while the API server is reachable, `false` once it looks down. */
export function useServerReachable(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
