import L from 'leaflet'
import { haversine } from './geo'

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY

export interface ElevationPoint {
  distance: number   // cumulative distance from route start, in meters
  elevation: number  // meters
}

export interface RouteResult {
  path: L.LatLng[]
  distance: number          // meters, this segment only
  elevation: ElevationPoint[]
}

export async function fetchRoute(a: L.LatLng, b: L.LatLng): Promise<RouteResult> {
  const url = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson'

  console.log(`[ORS] Requesting hiking route...`)
  console.time('[ORS] fetch')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [a.lng, a.lat],
        [b.lng, b.lat],
      ],
      elevation: true,
    }),
  })

  console.timeEnd('[ORS] fetch')

  if (!response.ok) {
    const errText = await response.text()
    console.error(`[ORS] Error ${response.status}:`, errText)
    throw new Error(`ORS error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.features?.length) {
    console.warn('[ORS] No route found')
    return { path: [], distance: 0, elevation: [] }
  }

  const feature = data.features[0]
  // Each coordinate is [lng, lat, elevation]
  const coords = feature.geometry.coordinates as [number, number, number][]
  const distance = feature.properties.summary.distance as number

  const path: L.LatLng[] = coords.map(([lng, lat]) => L.latLng(lat, lng))

  // Build cumulative-distance elevation profile
  const elevation: ElevationPoint[] = []
  let cumulative = 0
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) {
      cumulative += haversine(path[i - 1], path[i])
    }
    elevation.push({ distance: cumulative, elevation: coords[i][2] })
  }

  return { path, distance, elevation }
}