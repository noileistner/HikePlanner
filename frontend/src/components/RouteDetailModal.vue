<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import L from 'leaflet'
import type { SavedRoute } from '../types/route'

const props = defineProps<{ route: SavedRoute }>()
const emit = defineEmits<{ close: [] }>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null

const distanceKm = computed(() => (props.route.distance / 1000).toFixed(2))

const elevationStats = computed(() => {
  const points = props.route.elevation
  if (points.length === 0) return { gain: 0, loss: 0, min: 0, max: 0 }

  let gain = 0
  let loss = 0
  let min = points[0].elevation
  let max = points[0].elevation

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevation - points[i - 1].elevation
    if (diff > 0) gain += diff
    else loss += Math.abs(diff)
    min = Math.min(min, points[i].elevation)
    max = Math.max(max, points[i].elevation)
  }

  return { gain: Math.round(gain), loss: Math.round(loss), min: Math.round(min), max: Math.round(max) }
})

// Build an SVG path string for the elevation profile chart
const elevationChartPath = computed(() => {
  const points = props.route.elevation
  if (points.length === 0) return ''

  const width = 500
  const height = 150
  const padding = 20

  const maxDist = points[points.length - 1].distance || 1
  const elevations = points.map((p) => p.elevation)
  const minEl = Math.min(...elevations)
  const maxEl = Math.max(...elevations)
  const elRange = maxEl - minEl || 1

  const coords = points.map((p) => {
    const x = padding + (p.distance / maxDist) * (width - padding * 2)
    const y = height - padding - ((p.elevation - minEl) / elRange) * (height - padding * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return coords.join(' ')
})

onMounted(() => {
  if (!mapContainer.value || props.route.path.length === 0) return

  map = L.map(mapContainer.value, { zoomControl: true })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  const line = L.polyline(props.route.path, { color: '#aa3bff', weight: 4 }).addTo(map)
  map.fitBounds(line.getBounds(), { padding: [20, 20] })

  L.circleMarker(props.route.waypoints[0], { radius: 6, color: '#2f5233', fillOpacity: 1 })
    .addTo(map)
    .bindTooltip('Start')

  L.circleMarker(props.route.waypoints[props.route.waypoints.length - 1], {
    radius: 6,
    color: '#cc4444',
    fillOpacity: 1,
  })
    .addTo(map)
    .bindTooltip('End')
})

onBeforeUnmount(() => {
  map?.remove()
})
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="detail-modal">
      <div class="detail-header">
        <h2>{{ route.name }}</h2>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>

      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">{{ distanceKm }} km</span>
          <span class="stat-label">Distance</span>
        </div>
        <div class="stat">
          <span class="stat-value">+{{ elevationStats.gain }} m</span>
          <span class="stat-label">Elevation gain</span>
        </div>
        <div class="stat">
          <span class="stat-value">-{{ elevationStats.loss }} m</span>
          <span class="stat-label">Elevation loss</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ elevationStats.max }} m</span>
          <span class="stat-label">Highest point</span>
        </div>
      </div>

      <div ref="mapContainer" class="detail-map"></div>

      <div class="elevation-chart-wrapper">
        <h3>Elevation profile</h3>
        <svg
          v-if="route.elevation.length > 0"
          viewBox="0 0 500 150"
          class="elevation-chart"
          preserveAspectRatio="none"
        >
          <polyline
            :points="elevationChartPath"
            fill="none"
            stroke="#aa3bff"
            stroke-width="2"
          />
        </svg>
        <p v-else class="no-elevation">No elevation data available for this route.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
}

.detail-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #777;
  line-height: 1;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f7f6f2;
  border-radius: 8px;
  padding: 10px 4px;
}

.stat-value {
  font-weight: 600;
  font-size: 16px;
  color: #2f5233;
}

.stat-label {
  font-size: 11px;
  color: #777;
  margin-top: 2px;
  text-align: center;
}

.detail-map {
  width: 100%;
  height: 260px;
  border-radius: 8px;
  margin-bottom: 20px;
  z-index: 1;
}

.elevation-chart-wrapper h3 {
  font-size: 15px;
  margin: 0 0 8px;
}

.elevation-chart {
  width: 100%;
  height: 150px;
  background: #f7f6f2;
  border-radius: 8px;
}

.no-elevation {
  color: #777;
  font-size: 14px;
  font-style: italic;
}
</style>