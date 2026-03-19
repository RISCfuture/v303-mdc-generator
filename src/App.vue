<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLoadingBarProvider,
  darkTheme,
} from 'naive-ui'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { lightThemeOverrides, darkThemeOverrides } from '@/theme'

// Use dark theme preference from system with reactive updates
const prefersDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)
const theme = computed(() => (prefersDark.value ? darkTheme : undefined))
const themeOverrides = computed(() =>
  prefersDark.value ? darkThemeOverrides : lightThemeOverrides,
)

// Listen for system theme changes
let mediaQuery: MediaQueryList | undefined
const handleThemeChange = (e: MediaQueryListEvent) => {
  prefersDark.value = e.matches
}

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', handleThemeChange)
})

onUnmounted(() => {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', handleThemeChange)
  }
})
</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="themeOverrides">
    <NLoadingBarProvider>
      <NMessageProvider>
        <NDialogProvider>
          <div class="app-container">
            <RouterView />
          </div>
        </NDialogProvider>
      </NMessageProvider>
    </NLoadingBarProvider>
  </NConfigProvider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
  color: #000;
  transition:
    background-color 0.3s,
    color 0.3s;
}

@media (prefers-color-scheme: dark) {
  html,
  body {
    background-color: #050530;
    color: rgb(255 255 255 / 82%);
  }
}

#app {
  min-height: 100vh;
}

.app-container {
  padding: 16px;
  min-height: 100vh;
}
</style>
