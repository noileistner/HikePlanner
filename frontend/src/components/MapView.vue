<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import L from 'leaflet'
import { icon } from '@fortawesome/fontawesome-svg-core'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { dijkstra, type Graph } from '../utils/dijkstra'
import { fetchWalkingGraph, findNearestNode, type OsmNode } from '../utils/osmGraph'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
const markers: L.Marker[] = []
let routeLine: L.Polyline | null = null

function createMarkerIcon() {
  const iconHtml = icon(faLocationDot, {
    classes: ['fa-2x'],
    styles: { color: '#ffc608' },
  }).html.join('')

  return L.divIcon({
    html: iconHtml,
    className: 'fa-marker-icon',
    iconSize: [34, 42],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  })
}

async function updateRoute() {
  if (markers.length < 2) {
    if (routeLine) {
      map?.removeLayer(routeLine)
      routeLine = null
    }
    return
  }

  const bounds = L.latLngBounds(markers.map((m) => m.getLatLng())).pad(0.2)
  const { graph, nodes }: { graph: Graph; nodes: Record<string, OsmNode> } =
    await fetchWalkingGraph(bounds)

  let fullPath: L.LatLng[] = []

  for (let i = 0; i < markers.length - 1; i++) {
    const startNode = findNearestNode(markers[i].getLatLng(), nodes)
    const endNode = findNearestNode(markers[i + 1].getLatLng(), nodes)
    if (!startNode || !endNode) continue

    const pathIds = dijkstra(graph, startNode, endNode)
    const segment = pathIds.map((id) => L.latLng(nodes[id].lat, nodes[id].lon))
    fullPath = fullPath.concat(segment)
  }

  if (routeLine) map?.removeLayer(routeLine)
  routeLine = L.polyline(fullPath, { color: '#aa3bff', weight: 4 }).addTo(map!)
}

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView([41.2351, 1.8119], 13)

  const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  })

  const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap',
    maxZoom: 17,
  })

  const satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
      maxZoom: 19,
    }
  )

  streets.addTo(map)

  const baseLayers = {
    'Streets': streets,
    'Terrain': terrain,
    'Satellite': satellite,
  }

  const layersControl = L.control.layers(baseLayers).addTo(map)
  const controlContainer = layersControl.getContainer()
  if (controlContainer) {
    const heading = document.createElement('div')
    heading.innerText = 'Layers'
    heading.style.fontWeight = 'bold'
    heading.style.padding = '4px 10px'
    heading.style.borderBottom = '1px solid #ccc'
    controlContainer.insertBefore(heading, controlContainer.firstChild)
  }

  map.on('click', async (e: L.LeafletMouseEvent) => {
    const marker = L.marker(e.latlng, { icon: createMarkerIcon() }).addTo(map!)

    marker.on('contextmenu', (event: L.LeafletMouseEvent) => {
      L.DomEvent.preventDefault(event.originalEvent)
      map!.removeLayer(marker)
      const index = markers.indexOf(marker)
      if (index > -1) markers.splice(index, 1)
      updateRoute()
    })

    markers.push(marker)
    await updateRoute()
  })
})

onBeforeUnmount(() => {
  map?.remove()
})
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>

<style>
.fa-marker-icon svg {
  width: 34px;
  height: 42px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
}
</style>