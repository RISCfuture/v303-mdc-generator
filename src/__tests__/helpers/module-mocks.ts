/**
 * Module mock configurations
 *
 * Reusable mock setups for commonly mocked modules
 */

import { vi } from 'vitest'
import { createMockAirfields } from './mock-factories'
import type { Airfield } from '@/types/airfield'

/**
 * Mocks the @/data/airfields module with default or custom airfield data
 *
 * @param airfields - Optional array of airfields to return (defaults to mock airfields)
 * @returns The mocked getAirfieldsForTheater function
 *
 * @example
 * // In test setup
 * vi.mock('@/data/airfields', () => ({
 *   getAirfieldsForTheater: vi.fn(),
 * }))
 *
 * // In beforeEach
 * beforeEach(() => {
 *   mockAirfieldsModule()
 * })
 */
export async function mockAirfieldsModule(airfields?: Airfield[]) {
  const airfieldsModule = await import('@/data/airfields')
  const mockAirfields = airfields || createMockAirfields()

  vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue(mockAirfields)

  return airfieldsModule.getAirfieldsForTheater
}

/**
 * Creates a mock for naive-ui useMessage composable
 *
 * @returns Mock message functions
 *
 * @example
 * vi.mock('naive-ui', () => ({
 *   useMessage: mockNaiveUIMessage,
 * }))
 */
export function mockNaiveUIMessage() {
  return () => ({
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  })
}

/**
 * Creates a mock for the md-editor-v3 component
 *
 * @returns Mock component definition
 *
 * @example
 * vi.mock('md-editor-v3', () => ({
 *   MdEditor: mockMdEditor(),
 * }))
 */
export function mockMdEditor() {
  return {
    name: 'MdEditor',
    template: '<div class="md-editor-mock"><slot /></div>',
    props: [
      'modelValue',
      'language',
      'theme',
      'preview',
      'toolbars',
      'placeholder',
      'showCodeRowNumber',
    ],
    emits: ['onChange', 'onUploadImg'],
  }
}

/**
 * Creates a mock for the crew database
 *
 * @param customCrew - Optional custom crew data
 * @returns Mock crew database
 *
 * @example
 * vi.mock('@/data/crew', () => ({
 *   crewDatabase: mockCrewDatabase(),
 * }))
 */
export function mockCrewDatabase(customCrew?: Array<Record<string, unknown>>) {
  return (
    customCrew || [
      {
        pilot: 'John Doe',
        callsign: ['VIPER', 'SNAKE'],
        link16Prefix: 'VR',
        stn: 12345,
        mode3: 1234,
        aaTacan: 5,
        freq: '251.000',
        laserCode: 1688,
        tailNumber: '86-0267',
      },
      {
        pilot: 'Jane Smith',
        callsign: ['FALCON', 'HAWK'],
        link16Prefix: 'FN',
        stn: 23456,
        mode3: 2345,
        aaTacan: 6,
        freq: '252.000',
        laserCode: 1677,
        tailNumber: '86-0268',
      },
    ]
  )
}

/**
 * Creates mocks for F-16 rotation calculator utilities
 *
 * @param customReturnValues - Custom return values for calculations
 * @returns Object with mocked functions
 *
 * @example
 * const mocks = mockF16Calculator()
 * // Later in test:
 * expect(mocks.calculateSpeeds).toHaveBeenCalledWith(...)
 */
export async function mockF16Calculator(customReturnValues?: {
  speeds?: { rotationSpeed: number; refusalSpeed: number }
  headwind?: number
  crosswind?: number
}) {
  const f16Calculator = await import('@/aircraft/F-16C_50')

  const calculateSpeedsMock = vi.spyOn(f16Calculator, 'calculateSpeeds').mockReturnValue(
    customReturnValues?.speeds || {
      rotationSpeed: 165,
      refusalSpeed: 145,
    },
  )

  const calculateHeadwindMock = vi
    .spyOn(f16Calculator, 'calculateHeadwindComponent')
    .mockReturnValue(customReturnValues?.headwind || 10)

  const calculateCrosswindMock = vi
    .spyOn(f16Calculator, 'calculateCrosswindComponent')
    .mockReturnValue(customReturnValues?.crosswind || 5)

  return {
    calculateSpeeds: calculateSpeedsMock,
    calculateHeadwindComponent: calculateHeadwindMock,
    calculateCrosswindComponent: calculateCrosswindMock,
  }
}

/**
 * Creates mocks for A-10 rotation calculator utilities
 *
 * @param customReturnValues - Custom return values for calculations
 * @returns Object with mocked functions
 *
 * @example
 * const mocks = mockA10Calculator()
 * // Later in test:
 * expect(mocks.calculateSpeeds).toHaveBeenCalledWith(...)
 */
export async function mockA10Calculator(customReturnValues?: {
  speeds?: { rotationSpeed: number; refusalSpeed: number }
  headwind?: number
  crosswind?: number
}) {
  const a10Calculator = await import('@/aircraft/A-10A')

  const calculateSpeedsMock = vi.spyOn(a10Calculator, 'calculateSpeeds').mockReturnValue(
    customReturnValues?.speeds || {
      rotationSpeed: 125,
      refusalSpeed: 105,
    },
  )

  const calculateHeadwindMock = vi
    .spyOn(a10Calculator, 'calculateHeadwindComponent')
    .mockReturnValue(customReturnValues?.headwind || 10)

  const calculateCrosswindMock = vi
    .spyOn(a10Calculator, 'calculateCrosswindComponent')
    .mockReturnValue(customReturnValues?.crosswind || 5)

  return {
    calculateSpeeds: calculateSpeedsMock,
    calculateHeadwindComponent: calculateHeadwindMock,
    calculateCrosswindComponent: calculateCrosswindMock,
  }
}

/**
 * Creates a mock for the imageStorage service
 *
 * @param customReturnValues - Custom return values for storage operations
 * @returns Object with mocked functions
 *
 * @example
 * const mocks = mockImageStorage()
 * // Later in test:
 * expect(mocks.saveImage).toHaveBeenCalled()
 */
export async function mockImageStorage(customReturnValues?: {
  saveImage?: Record<string, unknown>
  compressImage?: Blob
}) {
  const imageStorage = await import('@/services/imageStorage')

  const saveImageMock = vi.spyOn(imageStorage.imageStorage, 'saveImage').mockResolvedValue(
    customReturnValues?.saveImage || {
      id: 'img-123',
      data: 'data:image/png;base64,abc123',
      missionId: 'test-mission',
      createdAt: Date.now(),
      size: 1024,
    },
  )

  const compressImageMock = vi
    .spyOn(imageStorage.imageStorage, 'compressImage')
    .mockResolvedValue(
      customReturnValues?.compressImage || new Blob(['compressed'], { type: 'image/png' }),
    )

  return {
    saveImage: saveImageMock,
    compressImage: compressImageMock,
    MAX_IMAGE_SIZE: imageStorage.MAX_IMAGE_SIZE,
  }
}

/**
 * Creates a mock for the waypoint calculations composable
 *
 * @param customReturnValue - Custom return value for parseTOT
 * @returns Object with mocked functions
 *
 * @example
 * vi.mock('@/composables/useWaypointCalculations', async () => {
 *   const actual = await vi.importActual('@/composables/useWaypointCalculations')
 *   return {
 *     ...actual,
 *     parseTOT: mockWaypointCalculations().parseTOT,
 *   }
 * })
 */
export function mockWaypointCalculations(customReturnValue?: (tot: string) => number | null) {
  const defaultParseTOT = vi.fn((tot: string) => {
    if (!tot) return null
    const cleanTot = tot.toUpperCase().replace(/[^0-9:]/g, '')
    const match = cleanTot.match(/^(\d{1,2}):?(\d{2})$/)
    if (!match) return null
    const hours = parseInt(match[1])
    const minutes = parseInt(match[2])
    if (hours >= 24 || minutes >= 60) return null
    return hours * 60 + minutes
  })

  return {
    parseTOT: customReturnValue ? vi.fn(customReturnValue) : defaultParseTOT,
  }
}

/**
 * Creates a mock for the storage monitor composable
 *
 * @param overrides - Custom values to override defaults
 * @returns Mock composable return value
 *
 * @example
 * vi.mock('@/composables/useStorageMonitor')
 *
 * beforeEach(() => {
 *   const mockMonitor = mockStorageMonitor({ shouldShowWarning: true })
 *   vi.spyOn(useStorageMonitorModule, 'useStorageMonitor').mockReturnValue(mockMonitor)
 * })
 */
export async function mockStorageMonitor(overrides: Record<string, unknown> = {}) {
  const { createMockStorageMonitor } = await import('./mock-factories')
  return createMockStorageMonitor(overrides)
}
