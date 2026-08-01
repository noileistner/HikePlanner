<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import L from 'leaflet'
import { icon } from '@fortawesome/fontawesome-svg-core'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { fetchRoute, type ElevationPoint } from '../utils/openrouteservice'
import { useRoutes } from '../composables/useRoutes'
import type { SavedRoute } from '../types/route'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
const markers: L.Marker[] = []
let routeLine: L.Polyline | null = null

const { addRoute } = useRoutes()

// Reactive mirrors of non-reactive Leaflet state, so the template can react to them
const markerCount = ref(0)
const currentPath = ref<L.LatLng[]>([])
const currentDistance = ref(0)
const currentElevation = ref<ElevationPoint[]>([])

const showSaveModal = ref(false)
const routeName = ref('')

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
  markerCount.value = markers.length

  if (markers.length < 2) {
    if (routeLine) {
      map?.removeLayer(routeLine)
      routeLine = null
    }
    currentPath.value = []
    currentDistance.value = 0
    currentElevation.value = []
    return
  }

  let fullPath: L.LatLng[] = []
  let totalDistance = 0
  let fullElevation: ElevationPoint[] = []
  let distanceOffset = 0

  for (let i = 0; i < markers.length - 1; i++) {
    const a = markers[i].getLatLng()
    const b = markers[i + 1].getLatLng()

    try {
      const result = await fetchRoute(a, b)
      if (result.path.length === 0) continue

      fullPath = fullPath.concat(result.path)
      totalDistance += result.distance

      // Shift this segment's elevation distances so they continue
      // from where the previous segment left off
      const shifted = result.elevation.map((p) => ({
        distance: p.distance + distanceOffset,
        elevation: p.elevation,
      }))
      fullElevation = fullElevation.concat(shifted)
      distanceOffset += result.distance
    } catch (err) {
      console.error(`[Route] Segment ${i + 1} failed:`, err)
    }
  }

  if (routeLine) map?.removeLayer(routeLine)
  routeLine = L.polyline(fullPath, { color: '#aa3bff', weight: 4 }).addTo(map!)

  currentPath.value = fullPath
  currentDistance.value = totalDistance
  currentElevation.value = fullElevation
}

function openSaveModal() {
  showSaveModal.value = true
}

function cancelSave() {
  showSaveModal.value = false
  routeName.value = ''
}

function confirmSave() {
  if (!routeName.value.trim()) return

  const route: SavedRoute = {
    id: crypto.randomUUID(),
    name: routeName.value.trim(),
    waypoints: markers.map((m) => m.getLatLng()),
    path: currentPath.value,
    distance: currentDistance.value,
    elevation: currentElevation.value,
    createdAt: new Date(),
  }

  addRoute(route)
  showSaveModal.value = false
  routeName.value = ''
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

  const baseLayers = { 'Streets': streets, 'Terrain': terrain, 'Satellite': satellite }
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
  <div class="map-view-root">
    <div ref="mapContainer" class="map-container"></div>

    <button
      v-if="markerCount >= 2"
      class="save-route-btn"
      @click="openSaveModal"
    >
      Save Route
    </button>

    <div v-if="showSaveModal" class="modal-overlay" @click.self="cancelSave">
      <div class="modal">
        <h2>Name your route</h2>
        <input
          v-model="routeName"
          type="text"
          placeholder="e.g. Montserrat Loop"
          @keyup.enter="confirmSave"
          autofocus
        />
        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelSave">Cancel</button>
          <button class="btn-confirm" @click="confirmSave" :disabled="!routeName.trim()">
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-view-root {
  width: 100%;
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
}

.save-route-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  padding: 12px 20px;
  background-color: #2f5233;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.save-route-btn:hover {
  background-color: #244027;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: white;
  padding: 24px;
  border-radius: 10px;
  width: 320px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.modal input {
  width: 100%;
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-actions button {
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel {
  background: #eee;
  color: #333;
}

.btn-confirm {
  background: #2f5233;
  color: white;
}

.btn-confirm:disabled {
  background: #a9b8ab;
  cursor: not-allowed;
}
</style>

<style>
.fa-marker-icon svg {
  width: 34px;
  height: 42px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
}
</style>