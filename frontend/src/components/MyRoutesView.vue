<script setup lang="ts">
import { ref } from 'vue'
import { useRoutes } from '../composables/useRoutes'
import type { SavedRoute } from '../types/route'
import RouteDetailModal from './RouteDetailModal.vue'

const { savedRoutes, removeRoute } = useRoutes()

const selectedRoute = ref<SavedRoute | null>(null)

function openDetail(route: SavedRoute) {
  selectedRoute.value = route
}

function closeDetail() {
  selectedRoute.value = null
}

function handleRemove(id: string, event: Event) {
  event.stopPropagation() // don't trigger openDetail when clicking Remove
  removeRoute(id)
}

// Converts a route's lat/lng path into an SVG polyline `points` string,
// scaled and flipped to fit a small square preview box.
function routeToSvgPoints(route: SavedRoute, size = 100, padding = 10): string {
  const points = route.path.length > 0 ? route.path : route.waypoints
  if (points.length === 0) return ''

  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latRange = maxLat - minLat || 1
  const lngRange = maxLng - minLng || 1

  // Use the same scale for both axes so the shape isn't stretched
  const scale = (size - padding * 2) / Math.max(latRange, lngRange)

  return points
    .map((p) => {
      const x = padding + (p.lng - minLng) * scale
      // Flip Y — latitude increases upward, but SVG y increases downward
      const y = padding + (maxLat - p.lat) * scale
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
</script>

<template>
  <div class="routes-list">
    <h2>My Routes</h2>

    <p v-if="savedRoutes.length === 0" class="empty-state">
      No routes saved yet — create one on the map first.
    </p>

    <div
      v-for="route in savedRoutes"
      :key="route.id"
      class="route-card"
      @click="openDetail(route)"
    >
      <div class="route-info">
        <h3>{{ route.name }}</h3>

        <p class="route-meta">
          {{ route.waypoints.length }} waypoint{{ route.waypoints.length !== 1 ? 's' : '' }}
          · {{ (route.distance / 1000).toFixed(2) }} km
        </p>

        <div class="coords">
          <p><strong>Start:</strong> {{ route.waypoints[0].lat.toFixed(5) }}, {{ route.waypoints[0].lng.toFixed(5) }}</p>
          <p>
            <strong>End:</strong>
            {{ route.waypoints[route.waypoints.length - 1].lat.toFixed(5) }},
            {{ route.waypoints[route.waypoints.length - 1].lng.toFixed(5) }}
          </p>
        </div>

        <button class="remove-btn" @click="handleRemove(route.id, $event)">Remove</button>
      </div>

      <div class="route-shape">
        <svg viewBox="0 0 100 100" width="100" height="100">
          <polyline
            :points="routeToSvgPoints(route)"
            fill="none"
            stroke="#aa3bff"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <RouteDetailModal
      v-if="selectedRoute"
      :route="selectedRoute"
      @close="closeDetail"
    />
  </div>
</template>

<style scoped>
.routes-list {
  padding: 24px;
  max-width: 700px;
  margin: 0 auto;
}

.empty-state {
  color: #777;
  font-style: italic;
}

.route-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.route-info {
  flex: 1;
  min-width: 0; /* prevents flex item from overflowing on long text */
}

.route-info h3 {
  margin: 0;
}

.route-meta {
  color: #777;
  font-size: 14px;
  margin: 4px 0 12px;
}

.coords p {
  font-size: 14px;
  margin: 2px 0;
  font-family: monospace;
}

.remove-btn {
  margin-top: 12px;
  background: none;
  border: 1px solid #cc4444;
  color: #cc4444;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 13px;
}

.remove-btn:hover {
  background: #cc4444;
  color: white;
}

.route-shape {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  background: #f7f6f2;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.route-card {
  cursor: pointer;
}

.route-card:hover {
  border-color: #aa3bff;
}
</style>