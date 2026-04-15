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
          <a href="#main-content" class="skip-to-content">Skip to main content</a>
          <div class="app-container">
            <main id="main-content">
              <RouterView />
            </main>
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

.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  z-index: 9999;
  padding: 8px 16px;
  background-color: #0a0a5a;
  color: #fff;
  text-decoration: none;
  border-radius: 0 0 4px;
}

.skip-to-content:focus-visible {
  top: 0;
  outline: 2px solid #fff;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
</style>
