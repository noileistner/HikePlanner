import type L from 'leaflet'
import type { ElevationPoint } from '../utils/openrouteservice'

export interface SavedRoute {
  id: string
  name: string
  waypoints: L.LatLng[]
  path: L.LatLng[]
  distance: number             // total meters, all segments
  elevation: ElevationPoint[]  // cumulative distance across the whole route
  createdAt: Date
}