'use client'

import {
  CardsThree,
  ChartLineUp,
  ChatsTeardrop,
  SquaresFour,
} from '@phosphor-icons/react'

const NAV_ICON_SIZE = 16
const NAV_ICON_WEIGHT = 'regular' as const

export function OverviewNavIcon() {
  return <SquaresFour size={NAV_ICON_SIZE} weight={NAV_ICON_WEIGHT} aria-hidden />
}

export function ConnectionsNavIcon() {
  return <CardsThree size={NAV_ICON_SIZE} weight={NAV_ICON_WEIGHT} aria-hidden />
}

export function TimelineNavIcon() {
  return <ChartLineUp size={NAV_ICON_SIZE} weight={NAV_ICON_WEIGHT} aria-hidden />
}

export function AskAgentNavIcon() {
  return <ChatsTeardrop size={NAV_ICON_SIZE} weight={NAV_ICON_WEIGHT} aria-hidden />
}
