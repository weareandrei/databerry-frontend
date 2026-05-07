'use client'

/**
 * Single source of truth for the interactable demo on the landing
 * page. Keeps all demo state — projects, folders, views, pinned set,
 * connections, the current page, the global date pill, the chat log,
 * and the "demo doesn't support X" notice — in one provider so demo
 * components prop-drill from here rather than reaching for the real
 * `useDashboard()` / Redux.
 *
 * Why one big provider (not three smaller hooks like before)?
 *   - Cross-cutting mutations need it. Deleting a project must
 *     cascade to its folders + views + pin set; renaming a folder
 *     should keep child folders consistent. With three independent
 *     hooks, those side-effects had nowhere clean to live.
 *   - The demo lives inside *one* `<DemoProvider>` mount on the
 *     landing page. There's no "lazy load" or split-screen scenario
 *     where one slice of demo state would benefit from being
 *     separate. So one provider keeps things simple.
 *
 * Real components must NOT import from this file — the boundary is
 * one-way: demo can import shared tile primitives, but real-mode
 * code (`hub/...`) is provider-free.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  INITIAL_CONNECTIONS,
  INITIAL_FOLDERS,
  INITIAL_PROJECTS,
  type DemoConnection,
  type DemoFolder,
  type DemoProject,
} from '../demoMocks'
import { INITIAL_VIEWS, type DemoView } from './demoSeedViews'

// ─── Types re-exported for callers ────────────────────────────────────────

export type {
  DemoProject,
  DemoFolder,
  DemoConnection,
  DemoView,
}

// Distributive `Omit` for discriminated unions — applies `Omit<…, K>`
// to each constituent of the union before re-uniting. Without this,
// `Omit<DemoView, 'id'>` collapses to a single non-discriminated type
// that drops every kind-specific field (`mockValue`, `chartPoints`,
// `steps`, etc.) because they're not common to every variant.
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never

export type DemoPage = 'home' | 'project' | 'connections' | 'settings' | 'agent-chat'

export interface DemoChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type DateMode = 'daily' | 'weekly' | 'monthly'

export interface DemoGlobalDate {
  mode: DateMode
  /** ISO yyyy-mm-dd. */
  from: string
  /** ISO yyyy-mm-dd. */
  to: string
}

// ─── Initial mock global date — last 7 days ending "today" ───────────────

const TODAY_ISO = '2026-04-08'
const WEEK_AGO_ISO = '2026-04-02'

const INITIAL_DATE: DemoGlobalDate = {
  mode: 'daily',
  from: WEEK_AGO_ISO,
  to: TODAY_ISO,
}

// ─── Context shape ────────────────────────────────────────────────────────

interface DemoContextValue {
  // Navigation
  pageOpen: DemoPage
  currentProjectId: string | null
  goToPage: (page: DemoPage, projectId?: string | null) => void

  // Global date pill (mock)
  globalDate: DemoGlobalDate
  setGlobalDateMode: (mode: DateMode) => void
  setGlobalDateRange: (from: string, to: string) => void

  // Entities
  projects: DemoProject[]
  folders: DemoFolder[]
  views: DemoView[]
  connections: DemoConnection[]
  pinnedViewIds: string[]

  // Mutations — projects
  createProject: (name: string) => string
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void

  // Mutations — folders
  createFolder: (name: string, projectId: string, parentId?: string | null) => string
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void

  // Mutations — views
  // `DistributiveOmit` distributes over the discriminated union so
  // each kind's specific payload (mockValue / chartTotal / steps /
  // etc.) survives the omit. Plain `Omit<DemoView, 'id'>` collapses
  // to a wide intersection that drops every kind-specific field.
  createView: (input: DistributiveOmit<DemoView, 'id'>) => string
  renameView: (id: string, name: string) => void
  deleteView: (id: string) => void
  togglePin: (viewId: string) => void

  // Mutations — connections
  createConnection: (type: string, name: string, projectId?: string | null) => string
  deleteConnection: (id: string) => void

  // Chat
  chat: DemoChatMessage[]
  sendChatMessage: (content: string) => void
  clearChat: () => void

  // Notice
  notice: string | null
  showNotice: (message: string) => void
  dismissNotice: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

// ─── ID helper — `${prefix}-${nanoSec}` is unique enough for the demo ─

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

// ─── Provider ─────────────────────────────────────────────────────────────

export function DemoProvider({ children }: { children: React.ReactNode }) {
  // Navigation
  const [pageOpen, setPageOpen] = useState<DemoPage>('home')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)

  // Date pill
  const [globalDate, setGlobalDate] = useState<DemoGlobalDate>(INITIAL_DATE)

  // Entities
  const [projects, setProjects] = useState<DemoProject[]>(INITIAL_PROJECTS)
  const [folders, setFolders] = useState<DemoFolder[]>(INITIAL_FOLDERS)
  const [views, setViews] = useState<DemoView[]>(INITIAL_VIEWS)
  const [connections, setConnections] = useState<DemoConnection[]>(INITIAL_CONNECTIONS)

  // Chat
  const [chat, setChat] = useState<DemoChatMessage[]>([])

  // Notice
  const [notice, setNotice] = useState<string | null>(null)

  // ─── Navigation ────────────────────────────────────────────────────────
  const goToPage = useCallback((page: DemoPage, projectId: string | null = null) => {
    setPageOpen(page)
    setCurrentProjectId(page === 'project' ? projectId : null)
  }, [])

  // ─── Date ──────────────────────────────────────────────────────────────
  const setGlobalDateMode = useCallback((mode: DateMode) => {
    setGlobalDate(d => ({ ...d, mode }))
  }, [])
  const setGlobalDateRange = useCallback((from: string, to: string) => {
    setGlobalDate(d => ({ ...d, from, to }))
  }, [])

  // ─── Project mutations ─────────────────────────────────────────────────
  const createProject = useCallback((name: string): string => {
    const id = uid('proj')
    setProjects(prev => [...prev, { id, name, websiteUrl: null }])
    return id
  }, [])
  const renameProject = useCallback((id: string, name: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))
  }, [])
  const deleteProject = useCallback((id: string) => {
    // Cascade: drop the project's folders + views first, then the project.
    setFolders(prev => prev.filter(f => f.projectId !== id))
    setViews(prev => prev.filter(v => v.projectId !== id))
    setProjects(prev => prev.filter(p => p.id !== id))
    // If the user was viewing this project, route home.
    setCurrentProjectId(curr => curr === id ? null : curr)
    setPageOpen(p => (currentProjectId === id ? 'home' : p))
  }, [currentProjectId])

  // ─── Folder mutations ──────────────────────────────────────────────────
  const createFolder = useCallback(
    (name: string, projectId: string, parentId: string | null = null): string => {
      const id = uid('fld')
      setFolders(prev => [...prev, { id, name, projectId, parentId }])
      return id
    },
    [],
  )
  const renameFolder = useCallback((id: string, name: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f))
  }, [])
  const deleteFolder = useCallback((id: string) => {
    // Cascade: collect this folder + all descendants, drop their views too.
    setFolders(prev => {
      const ids = collectFolderIds(id, prev)
      // Drop views housed in those folders.
      setViews(vs => vs.filter(v => !v.folderId || !ids.has(v.folderId)))
      return prev.filter(f => !ids.has(f.id))
    })
  }, [])

  // ─── View mutations ────────────────────────────────────────────────────
  // Each mutation that uses spread on a `DemoView` casts the result
  // through `unknown` to coerce back to the discriminated union —
  // see `togglePin` below for the rationale.
  const createView = useCallback(
    (input: DistributiveOmit<DemoView, 'id'>): string => {
      const id = uid('view')
      const newView = { id, ...input } as unknown as DemoView
      setViews(prev => [...prev, newView])
      return id
    },
    [],
  )
  const renameView = useCallback((id: string, name: string) => {
    setViews(prev =>
      prev.map(v =>
        v.id === id ? ({ ...v, name } as unknown as DemoView) : v,
      ),
    )
  }, [])
  const deleteView = useCallback((id: string) => {
    setViews(prev => prev.filter(v => v.id !== id))
  }, [])
  const togglePin = useCallback((viewId: string) => {
    // Discriminated-union ergonomics: spread (`{...v, pinned: !pinned}`)
    // widens TypeScript's inferred element type because the compiler
    // can't see the spread is identity-except-`pinned`. The double cast
    // (`as unknown as DemoView`) is the safest way to coerce — going
    // through `unknown` bypasses TS's "are these compatible?" check
    // while still producing the right runtime value.
    setViews(prev =>
      prev.map(v =>
        v.id === viewId
          ? ({ ...v, pinned: !v.pinned } as unknown as DemoView)
          : v,
      ),
    )
  }, [])

  // ─── Connection mutations ──────────────────────────────────────────────
  const createConnection = useCallback(
    (type: string, name: string, projectId: string | null = null): string => {
      const id = uid('conn')
      setConnections(prev => [...prev, { id, name, type, projectId }])
      return id
    },
    [],
  )
  const deleteConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id))
  }, [])

  // ─── Chat — resolved to a preconfigured Q&A list ──────────────────────
  const sendChatMessage = useCallback((content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    const userMsg: DemoChatMessage = { id: uid('msg'), role: 'user', content: trimmed }
    setChat(prev => [...prev, userMsg])
    // Mock latency so the typing indicator gets a moment.
    setTimeout(() => {
      const reply = answerFor(trimmed)
      const assistantMsg: DemoChatMessage = { id: uid('msg'), role: 'assistant', content: reply }
      setChat(prev => [...prev, assistantMsg])
    }, 600)
  }, [])
  const clearChat = useCallback(() => setChat([]), [])

  // ─── Notice ────────────────────────────────────────────────────────────
  const showNotice = useCallback((message: string) => setNotice(message), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  // ─── Derived state ─────────────────────────────────────────────────────
  const pinnedViewIds = useMemo(
    () => views.filter(v => v.pinned).map(v => v.id),
    [views],
  )

  const value: DemoContextValue = {
    pageOpen,
    currentProjectId,
    goToPage,
    globalDate,
    setGlobalDateMode,
    setGlobalDateRange,
    projects,
    folders,
    views,
    connections,
    pinnedViewIds,
    createProject,
    renameProject,
    deleteProject,
    createFolder,
    renameFolder,
    deleteFolder,
    createView,
    renameView,
    deleteView,
    togglePin,
    createConnection,
    deleteConnection,
    chat,
    sendChatMessage,
    clearChat,
    notice,
    showNotice,
    dismissNotice,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemoContext(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemoContext must be used within DemoProvider')
  return ctx
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function collectFolderIds(rootId: string, all: DemoFolder[]): Set<string> {
  const ids = new Set<string>([rootId])
  // Iterate until no new descendants are added (handles nested folders).
  let added = true
  while (added) {
    added = false
    for (const f of all) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        added = true
      }
    }
  }
  return ids
}

// ─── Preconfigured Q&A — caller will fill in the list ────────────────────
//
// The user said "you'll provide the Q&A list later". Until then, the
// list is empty: typing anything yields the fallback. The plumbing
// (typing → user bubble → 600 ms → assistant reply) works either way,
// and adding pairs is just dropping `{ q, a }` entries here.
//
// Match is case-insensitive, exact (after `.trim()`). A fuzzier match
// (substring etc.) would surprise users when their typo "matches"
// something unrelated — exact string is simpler + more predictable.

export interface DemoQA {
  q: string
  a: string
}

export const PRECONFIGURED_QA: DemoQA[] = [
  // TODO — author Q&A pairs here.
]

function answerFor(content: string): string {
  const match = PRECONFIGURED_QA.find(
    pair => pair.q.toLowerCase() === content.toLowerCase().trim(),
  )
  if (match) return match.a
  return "Sorry — this is a demo. Try one of the preconfigured questions below."
}
