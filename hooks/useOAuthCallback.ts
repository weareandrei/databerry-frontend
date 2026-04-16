'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useDashboard } from '@/contexts/DashboardContext'

export function useOAuthCallback(provider: string) {
  const { connections } = useDashboard()
  const searchParams = useSearchParams()

  useEffect(() => {
    const status = searchParams.get(provider)
    if (status === 'connected') {
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} connected successfully!`)
      connections.loadConnections()
      window.history.replaceState({}, '', '/hub/connections')
    } else if (status === 'error') {
      toast.error(`Failed to connect ${provider}. Please try again.`)
      window.history.replaceState({}, '', '/hub/connections')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
