export interface GraphEdge {
  to: string
  weight: number
}

export interface Graph {
  [nodeId: string]: GraphEdge[]
}

export function dijkstra(graph: Graph, start: string, end: string): string[] {
  const distances: Record<string, number> = {}
  const prev: Record<string, string | null> = {}
  const visited = new Set<string>()
  const unvisited = new Set(Object.keys(graph))

  for (const node of unvisited) {
    distances[node] = Infinity
    prev[node] = null
  }
  distances[start] = 0

  while (unvisited.size > 0) {
    let current: string | null = null
    let smallest = Infinity
    for (const node of unvisited) {
      if (distances[node] < smallest) {
        smallest = distances[node]
        current = node
      }
    }

    if (current === null || current === end) break
    unvisited.delete(current)
    visited.add(current)

    for (const edge of graph[current] || []) {
      if (visited.has(edge.to)) continue
      const alt = distances[current] + edge.weight
      if (alt < distances[edge.to]) {
        distances[edge.to] = alt
        prev[edge.to] = current
      }
    }
  }

  const path: string[] = []
  let node: string | null = end
  while (node) {
    path.unshift(node)
    node = prev[node]
  }

  return path[0] === start ? path : [] // empty = no route found
}