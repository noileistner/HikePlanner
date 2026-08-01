<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import MapView from './components/MapView.vue'
import MyRoutesView from './components/MyRoutesView.vue'

const currentView = ref<'map' | 'routes'>('map')
</script>

<template>
  <div class="app-layout">
    <AppHeader @navigate="currentView = $event" />
    <main class="app-main">
      <MapView v-show="currentView === 'map'" />
      <MyRoutesView v-if="currentView === 'routes'" />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-main {
  flex: 1;
  overflow: auto;
}
</style>