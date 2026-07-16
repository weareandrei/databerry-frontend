import {
  filterNonOverviewPins,
  projectDisplayLabel,
} from '@/app/hub/project/(components)/projectViewUtils'
import type { Project } from '@/types/project'
import type { Widget } from '@/types/widget'

export interface HomeProjectSection {
  project: Project
  pins: Widget[]
}

export function getHomeProjectSections(
  projects: Project[],
  allPins: Widget[],
  filteredPins: Widget[],
  isSearching: boolean,
  normalizedQuery: string,
): HomeProjectSection[] {
  const sections: HomeProjectSection[] = []

  for (const project of projects) {
    if (project.id.startsWith('temp-')) continue

    const allProjectPins = allPins.filter(p => p.projectId === project.id)
    const filteredProjectPins = filteredPins.filter(p => p.projectId === project.id)
    const nonOverviewFilteredPins = filterNonOverviewPins(filteredProjectPins)

    if (!isSearching) {
      sections.push({ project, pins: filterNonOverviewPins(allProjectPins) })
      continue
    }

    const label = projectDisplayLabel(project).toLowerCase()
    const name = project.name.toLowerCase()
    const labelMatch =
      label.includes(normalizedQuery) || name.includes(normalizedQuery)

    if (labelMatch) {
      sections.push({ project, pins: filterNonOverviewPins(allProjectPins) })
    } else if (filteredProjectPins.length > 0) {
      sections.push({ project, pins: nonOverviewFilteredPins })
    }
  }

  return sections
}
