import { reactive } from 'vue'
import type { SavedRoute } from '../types/route'

const savedRoutes = reactive<SavedRoute[]>([])

export function useRoutes() {
  function addRoute(route: SavedRoute) {
    savedRoutes.push(route)
  }

  function removeRoute(id: string) {
    const index = savedRoutes.findIndex((r) => r.id === id)
    if (index > -1) savedRoutes.splice(index, 1)
  }

  return { savedRoutes, addRoute, removeRoute }
}