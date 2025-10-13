import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAirportSelection } from '@/composables/useAirportSelection'
import * as airfieldsModule from '@/data/airfields'
import { createMockAirfields } from '@/__tests__/helpers'

vi.mock('@/data/airfields', () => ({
  getAirfieldsForTheater: vi.fn(),
}))

describe('useAirportSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue(createMockAirfields())
  })

  describe('Initialization', () => {
    it('should initialize with null values', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      expect(airport.selectedAirfieldName.value).toBeNull()
      expect(airport.selectedRunwayName.value).toBeNull()
      expect(airport.fieldElevation.value).toBeNull()
    })

    it('should load airfields for the specified theater', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      // Access computed property to trigger the getter
      expect(airport.airfields.value).toBeDefined()
      expect(airfieldsModule.getAirfieldsForTheater).toHaveBeenCalledWith('Caucasus')
    })

    it('should initialize with provided values', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.initialize('Kutaisi', '08', 148)

      expect(airport.selectedAirfieldName.value).toBe('Kutaisi')
      expect(airport.selectedRunwayName.value).toBe('08')
      expect(airport.fieldElevation.value).toBe(148)
    })

    it('should initialize with undefined values as null', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.initialize(undefined, undefined, undefined)

      expect(airport.selectedAirfieldName.value).toBeNull()
      expect(airport.selectedRunwayName.value).toBeNull()
      expect(airport.fieldElevation.value).toBeNull()
    })
  })

  describe('Airfield options', () => {
    it('should generate airfield options from loaded airfields', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      expect(airport.airfieldOptions.value).toEqual([
        { label: 'Kutaisi', value: 'Kutaisi' },
        { label: 'Batumi', value: 'Batumi' },
      ])
    })

    it('should handle empty airfield list', () => {
      vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue([])
      const theater = ref('UnknownTheater')
      const airport = useAirportSelection(theater)

      expect(airport.airfieldOptions.value).toHaveLength(0)
    })
  })

  describe('Airport selection', () => {
    it('should set airport by name', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')

      expect(airport.selectedAirfieldName.value).toBe('Kutaisi')
    })

    it('should clear runway when airport is changed', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      // Set initial airport and runway
      airport.initialize('Kutaisi', '08', 148)
      expect(airport.selectedRunwayName.value).toBe('08')

      // Change airport - runway should be cleared
      airport.setAirport('Batumi')

      expect(airport.selectedAirfieldName.value).toBe('Batumi')
      expect(airport.selectedRunwayName.value).toBeNull()
    })

    it('should handle null airport selection', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')
      airport.setAirport(null)

      expect(airport.selectedAirfieldName.value).toBeNull()
      expect(airport.selectedRunwayName.value).toBeNull()
    })
  })

  describe('Selected airfield', () => {
    it('should compute selected airfield correctly', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')

      expect(airport.selectedAirfield.value?.name).toBe('Kutaisi')
      expect(airport.selectedAirfield.value?.position.elevation).toBe(148)
    })

    it('should return null when no airport is selected', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      expect(airport.selectedAirfield.value).toBeNull()
    })

    it('should return null for invalid airport name', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('NonexistentAirport')

      expect(airport.selectedAirfield.value).toBeNull()
    })
  })

  describe('Runway options', () => {
    it('should generate runway options based on selected airport', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')

      expect(airport.runwayOptions.value).toEqual([
        { label: '08', value: '08' },
        { label: '26', value: '26' },
      ])
    })

    it('should have empty runway options when no airport is selected', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      expect(airport.runwayOptions.value).toHaveLength(0)
    })

    it('should update runway options when airport changes', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')
      expect(airport.runwayOptions.value[0].label).toBe('08')

      airport.setAirport('Batumi')
      expect(airport.runwayOptions.value[0].label).toBe('13')
    })
  })

  describe('Runway selection', () => {
    it('should set runway by name', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')
      airport.setRunway('08')

      expect(airport.selectedRunwayName.value).toBe('08')
    })

    it('should handle null runway selection', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')
      airport.setRunway('08')
      airport.setRunway(null)

      expect(airport.selectedRunwayName.value).toBeNull()
    })
  })

  describe('Selected runway', () => {
    it('should compute selected runway correctly', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')
      airport.setRunway('26')

      expect(airport.selectedRunway.value?.name).toBe('26')
      expect(airport.selectedRunway.value?.heading).toBe(260)
    })

    it('should return null when no runway is selected', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')

      expect(airport.selectedRunway.value).toBeNull()
    })

    it('should return null when no airport is selected', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setRunway('08')

      expect(airport.selectedRunway.value).toBeNull()
    })

    it('should return null for invalid runway name', () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')
      airport.setRunway('99')

      expect(airport.selectedRunway.value).toBeNull()
    })
  })

  describe('Field elevation', () => {
    it('should auto-fill field elevation when airport is selected', async () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')
      await nextTick()

      expect(airport.fieldElevation.value).toBe(148)
    })

    it('should update field elevation when airport changes', async () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')
      await nextTick()
      expect(airport.fieldElevation.value).toBe(148)

      airport.setAirport('Batumi')
      await nextTick()
      expect(airport.fieldElevation.value).toBe(33)
    })

    it('should clear field elevation when airport is deselected', async () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      airport.setAirport('Kutaisi')
      await nextTick()
      expect(airport.fieldElevation.value).toBe(148)

      airport.setAirport(null)
      await nextTick()
      expect(airport.fieldElevation.value).toBeNull()
    })

    it('should handle airport without elevation data', async () => {
      const airfieldWithoutElevation = [
        {
          name: 'TestAirport',
          position: {
            latitude: 0,
            longitude: 0,
          },
          runways: [{ name: '09', heading: 90, length: 2000 }],
        },
      ]
      vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue(airfieldWithoutElevation)

      const theater = ref('TestTheater')
      const airport = useAirportSelection(theater)

      airport.setAirport('TestAirport')
      await nextTick()

      expect(airport.fieldElevation.value).toBeNull()
    })
  })

  describe('Theater changes', () => {
    it('should reload airfields when theater changes', async () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      // Access computed property to trigger the getter
      expect(airport.airfields.value).toBeDefined()
      expect(airfieldsModule.getAirfieldsForTheater).toHaveBeenCalledWith('Caucasus')
      expect(airfieldsModule.getAirfieldsForTheater).toHaveBeenCalledTimes(1)

      theater.value = 'nevada'
      await nextTick()

      // Access computed property again to trigger the getter with new theater
      expect(airport.airfields.value).toBeDefined()
      expect(airfieldsModule.getAirfieldsForTheater).toHaveBeenCalledWith('nevada')
      expect(airfieldsModule.getAirfieldsForTheater).toHaveBeenCalledTimes(2)
    })
  })

  describe('Cascading changes', () => {
    it('should clear runway when changing from one airport to another with a runway selected', async () => {
      const theater = ref('Caucasus')
      const airport = useAirportSelection(theater)

      // Set up initial state with airport and runway
      airport.setAirport('Kutaisi')
      airport.setRunway('08')
      await nextTick()

      expect(airport.selectedAirfieldName.value).toBe('Kutaisi')
      expect(airport.selectedRunwayName.value).toBe('08')
      expect(airport.fieldElevation.value).toBe(148)

      // Change airport - runway should be cleared
      airport.setAirport('Batumi')
      await nextTick()

      expect(airport.selectedAirfieldName.value).toBe('Batumi')
      expect(airport.selectedRunwayName.value).toBeNull()
      expect(airport.fieldElevation.value).toBe(33)
    })
  })
})
