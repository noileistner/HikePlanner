import L from 'leaflet'
import type { Graph } from './dijkstra'

export interface OsmNode {
  lat: number
  lon: number
}

function haversine(a: L.LatLng, b: L.LatLng): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

async function queryOverpass(query: string): Promise<any> {
  let lastError: unknown = null

  for (const url of OVERPASS_MIRRORS) {
    try {
      console.log(`[Overpass] Trying ${url}...`)
      console.time(`[Overpass] fetch (${url})`)

      const response = await fetch(url, { method: 'POST', body: query })

      console.timeEnd(`[Overpass] fetch (${url})`)

      if (!response.ok) {
        console.warn(`[Overpass] ${url} returned ${response.status}, trying next mirror...`)
        lastError = new Error(`Overpass API error: ${response.status}`)
        continue
      }

      return await response.json()
    } catch (err) {
      console.warn(`[Overpass] ${url} failed:`, err)
      lastError = err
    }
  }

  throw lastError ?? new Error('All Overpass mirrors failed')
}

export async function fetchWalkingGraph(
  bounds: L.LatLngBounds
): Promise<{ graph: Graph; nodes: Record<string, OsmNode> }> {
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()

  const query = `
    [out:json][timeout:25];
    (
      way["highway"~"path|footway|track|bridleway|steps|pedestrian|unclassified|residential|tertiary|secondary"]
        (${sw.lat},${sw.lng},${ne.lat},${ne.lng});
    );
    out body;
    >;
    out skel qt;
  `

  console.log(`[Overpass] Fetching graph for bounds:`, sw, ne)
  const data = await queryOverpass(query)

  const nodes: Record<string, OsmNode> = {}
  const graph: Graph = {}

  for (const el of data.elements) {
    if (el.type === 'node') {
      nodes[el.id] = { lat: el.lat, lon: el.lon }
      graph[el.id] = []
    }
  }

  for (const el of data.elements) {
    if (el.type === 'way' && Array.isArray(el.nodes)) {
      for (let i = 0; i < el.nodes.length - 1; i++) {
        const aId = String(el.nodes[i])
        const bId = String(el.nodes[i + 1])
        const a = nodes[aId]
        const b = nodes[bId]
        if (!a || !b) continue

        const dist = haversine(L.latLng(a.lat, a.lon), L.latLng(b.lat, b.lon))
        graph[aId].push({ to: bId, weight: dist })
        graph[bId].push({ to: aId, weight: dist })
      }
    }
  }

  console.log(`[Overpass] Graph built: ${Object.keys(nodes).length} nodes`)
  return { graph, nodes }
}

export function findNearestNode(
  latlng: L.LatLng,
  nodes: Record<string, OsmNode>
): string | null {
  let closest: string | null = null
  let minDist = Infinity

  for (const id in nodes) {
    const n = nodes[id]
    const dist = haversine(latlng, L.latLng(n.lat, n.lon))
    if (dist < minDist) {
      minDist = dist
      closest = id
    }
  }

  return closest
}