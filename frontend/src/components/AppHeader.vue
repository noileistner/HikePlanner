<script setup lang="ts">
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <h1>HikePlanner</h1>
    </div>
    <nav class="nav-bar">
      <a href="#">Map</a>
      <a href="#">My Routes</a>
      <a href="#">About</a>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: #2f5233;
  color: white;
  width: 100%;
  box-sizing: border-box;
}

.header-left h1 {
  margin: 0;
  color: white;
  font-size: 1.8rem;
}

.header-left {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
  opacity: 0.85;
}

.nav-bar {
  display: flex;
  gap: 1.5rem;
}

.nav-bar a {
  color: white;
  text-decoration: none;
  font-weight: 500;
}

.nav-bar a:hover {
  text-decoration: underline;
}
</style>