import { useState } from 'react'
import type { CalendlyMeeting } from '@/lib/api'

export interface DemoChartPoint {
  label: string
  value: number
}

export interface DemoView {
  id: string
  name: string
  folderId: string
  connectionId: string
  pinned: boolean
  mockValue: string
  chartPoints?: DemoChartPoint[]
  chartTotal?: number
  mockMeetings?: CalendlyMeeting[]
}

const TODAY = '2026-04-08'

const INITIAL_VIEWS: DemoView[] = [
  {
    id: 'view-1',
    name: 'Monthly Revenue',
    folderId: 'folder-1',
    connectionId: 'conn-1',
    pinned: true,
    mockValue: '4820000',
    chartTotal: 4820000,
    chartPoints: [
      { label: 'Mon', value: 580000 },
      { label: 'Tue', value: 720000 },
      { label: 'Wed', value: 610000 },
      { label: 'Thu', value: 890000 },
      { label: 'Fri', value: 1040000 },
      { label: 'Sat', value: 480000 },
      { label: 'Sun', value: 500000 },
    ],
  },
  {
    id: 'view-2',
    name: 'Active Subscriptions',
    folderId: 'folder-1',
    connectionId: 'conn-1',
    pinned: false,
    mockValue: '1340',
  },
  {
    id: 'view-3',
    name: 'Weekly Active Users',
    folderId: 'folder-3',
    connectionId: 'conn-3',
    pinned: true,
    mockValue: '8712',
  },
  {
    id: 'view-4',
    name: 'Projects Created',
    folderId: 'folder-3',
    connectionId: 'conn-3',
    pinned: false,
    mockValue: '43',
  },
  {
    id: 'view-5',
    name: "Today's Calls",
    folderId: 'folder-3',
    connectionId: 'conn-6',
    pinned: true,
    mockValue: '3',
    mockMeetings: [
      {
        startTime: `${TODAY}T09:00:00Z`,
        endTime: `${TODAY}T09:30:00Z`,
        name: 'Onboarding Call',
        bookingUri: '#',
        invitees: [{ name: 'Alice Johnson', email: 'alice@example.com' }],
      },
      {
        startTime: `${TODAY}T11:00:00Z`,
        endTime: `${TODAY}T11:45:00Z`,
        name: 'Product Demo',
        bookingUri: '#',
        invitees: [{ name: 'Bob Smith', email: 'bob@example.com' }],
      },
      {
        startTime: `${TODAY}T14:30:00Z`,
        endTime: `${TODAY}T15:00:00Z`,
        name: 'Strategy Review',
        bookingUri: '#',
        invitees: [{ name: 'Carol White', email: 'carol@example.com' }],
      },
    ],
  },
  {
    id: 'view-6',
    name: 'Open Issues',
    folderId: 'folder-2',
    connectionId: 'conn-8',
    pinned: false,
    mockValue: '14',
  },
  {
    id: 'view-7',
    name: 'Stars',
    folderId: 'folder-2',
    connectionId: 'conn-7',
    pinned: false,
    mockValue: '3201',
  },
]

export function useDemoViews() {
  const [views, setViews] = useState<DemoView[]>(INITIAL_VIEWS)

  function createView(view: Omit<DemoView, 'id' | 'pinned'>) {
    const newView: DemoView = { ...view, id: `view-${Date.now()}`, pinned: false }
    setViews(prev => [...prev, newView])
  }

  function deleteView(id: string) {
    setViews(prev => prev.filter(v => v.id !== id))
  }

  function pinView(id: string) {
    setViews(prev => prev.map(v => (v.id === id ? { ...v, pinned: !v.pinned } : v)))
  }

  function getPinnedViews() {
    return views.filter(v => v.pinned)
  }

  return { views, createView, deleteView, pinView, getPinnedViews }
}
