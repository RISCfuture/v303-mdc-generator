import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import StorageWarning from '@/components/common/StorageWarning.vue'
import * as useStorageMonitorModule from '@/composables/useStorageMonitor'
import { createMockStorageMonitor } from '@/__tests__/helpers'

// Mock the useStorageMonitor composable
vi.mock('@/composables/useStorageMonitor')

describe('StorageWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visibility logic', () => {
    it('should not render when shouldShowWarning is false', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => false),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      expect(wrapper.find('.storage-warning').exists()).toBe(false)
    })

    it('should render when shouldShowWarning is true', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'warning'),
        warningMessage: computed(() => 'Storage is running low'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      expect(wrapper.find('.storage-warning').exists()).toBe(true)
    })

    it('should hide when dismissed', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'warning'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      expect(wrapper.find('.storage-warning').exists()).toBe(true)

      await wrapper.vm.handleDismiss()

      expect(wrapper.find('.storage-warning').exists()).toBe(false)
    })
  })

  describe('Alert type mapping based on warning level', () => {
    it('should map critical level to error alert type', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'critical'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      expect(wrapper.vm.alertType).toBe('error')
      expect(wrapper.vm.alertTitle).toBe('Storage Almost Full')
    })

    it('should map full level to error alert type', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'full'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      expect(wrapper.vm.alertType).toBe('error')
      expect(wrapper.vm.alertTitle).toBe('Storage Full')
    })

    it('should map warning level to warning alert type', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'warning'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      expect(wrapper.vm.alertType).toBe('warning')
      expect(wrapper.vm.alertTitle).toBe('Storage Running Low')
    })

    it('should map ok level to info alert type', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'ok'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      expect(wrapper.vm.alertType).toBe('info')
      expect(wrapper.vm.alertTitle).toBe('Storage Notice')
    })
  })

  describe('Details toggle behavior', () => {
    it('should initially hide details', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'warning'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      expect(wrapper.vm.showDetails).toBe(false)
    })

    it('should toggle details when clicking Show/Hide button', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'warning'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      const button = wrapper.findAll('button').find((b) => b.text().includes('Show'))
      expect(button).toBeTruthy()

      await button?.trigger('click')
      expect(wrapper.vm.showDetails).toBe(true)

      const hideButton = wrapper.findAll('button').find((b) => b.text().includes('Hide'))
      expect(hideButton).toBeTruthy()

      await hideButton?.trigger('click')
      expect(wrapper.vm.showDetails).toBe(false)
    })
  })

  describe('Manage Missions button conditional rendering', () => {
    it('should show Manage Missions button for critical and full levels', async () => {
      const criticalMock = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'critical'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(criticalMock)

      const criticalWrapper = mount(StorageWarning)
      const criticalButton = criticalWrapper
        .findAll('button')
        .find((b) => b.text().includes('Manage Missions'))
      expect(criticalButton).toBeTruthy()

      const fullMock = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'full'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(fullMock)

      const fullWrapper = mount(StorageWarning)
      const fullButton = fullWrapper
        .findAll('button')
        .find((b) => b.text().includes('Manage Missions'))
      expect(fullButton).toBeTruthy()
    })

    it('should not show Manage Missions button for warning level', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'warning'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      const manageButton = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Manage Missions'))
      expect(manageButton).toBeFalsy()
    })

    it('should emit manage-storage when Manage Missions button is clicked', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'critical'),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      const manageButton = wrapper
        .findAll('button')
        .find((b) => b.text().includes('Manage Missions'))
      await manageButton?.trigger('click')

      expect(wrapper.emitted('manage-storage')).toBeTruthy()
    })
  })

  describe('Dismissal state management', () => {
    it('should reset isDismissed when warning level changes', async () => {
      const warningLevelRef = ref('warning' as 'warning' | 'critical')
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => warningLevelRef.value),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      // Dismiss the warning
      await wrapper.vm.handleDismiss()
      expect(wrapper.vm.isDismissed).toBe(true)

      // Change warning level to escalate severity
      warningLevelRef.value = 'critical'
      await wrapper.vm.$nextTick()

      // Should reset dismissal so user sees the more urgent warning
      expect(wrapper.vm.isDismissed).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle null stats gracefully', async () => {
      const mockMonitor = await createMockStorageMonitor({
        shouldShowWarning: computed(() => true),
        warningLevel: computed(() => 'warning'),
        stats: ref(null),
      })
      vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)

      const wrapper = mount(StorageWarning)

      expect(wrapper.exists()).toBe(true)
    })
  })
})
