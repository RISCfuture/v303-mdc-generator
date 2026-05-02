import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMissionsStore } from '@/stores/missions'
import { setupTestEnvironment, setupLocalStorage } from '@/__tests__/helpers'

global.localStorage = setupLocalStorage()

describe('Missions Store', () => {
  setupTestEnvironment({ pinia: true, localStorage: true })

  it('should create a new mission', () => {
    const store = useMissionsStore()

    const mission = store.createMission('v93', 'Afghanistan')

    expect(mission).toBeDefined()
    expect(mission.name).toBe('Untitled Mission')
    expect(mission.squadron).toBe('v93')
    expect(mission.theater).toBe('Afghanistan')
    expect(mission.id).toBeDefined()
    expect(mission.createdAt).toBeDefined()
    expect(store.missions).toHaveLength(1)
  })

  it('should retrieve a mission by id', () => {
    const store = useMissionsStore()

    const mission = store.createMission('v93', 'Afghanistan')

    const retrieved = store.getMission(mission.id)
    expect(retrieved).toEqual(mission)
  })

  it('should return undefined for non-existent mission', () => {
    const store = useMissionsStore()
    const retrieved = store.getMission('non-existent-id')
    expect(retrieved).toBeUndefined()
  })

  it('should update a mission', () => {
    const store = useMissionsStore()

    const mission = store.createMission('v93', 'Afghanistan')
    const originalUpdatedAt = mission.updatedAt

    store.updateMission(mission.id, { name: 'Updated Mission' })

    const updated = store.getMission(mission.id)
    expect(updated?.name).toBe('Updated Mission')
    // updatedAt should be greater than or equal to original (could be same if too fast)
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(originalUpdatedAt).getTime(),
    )
  })

  it('should delete a mission', async () => {
    const store = useMissionsStore()

    const mission = store.createMission('v93', 'Afghanistan')

    expect(store.missions).toHaveLength(1)

    await store.deleteMission(mission.id)

    expect(store.missions).toHaveLength(0)
    expect(store.getMission(mission.id)).toBeUndefined()
  })

  it('should duplicate a mission', () => {
    const store = useMissionsStore()

    const mission = store.createMission('v93', 'Afghanistan')
    // Update the name so the duplicate check is meaningful
    store.updateMission(mission.id, { name: 'Original Mission' })

    const duplicate = store.duplicateMission(mission.id)

    expect(duplicate).toBeDefined()
    expect(duplicate?.name).toBe('Original Mission (Copy)')
    expect(duplicate?.id).not.toBe(mission.id)
    expect(store.missions).toHaveLength(2)
  })

  it('should persist missions to localStorage', () => {
    const store = useMissionsStore()

    store.createMission('v93', 'Afghanistan')

    const stored = localStorage.getItem('v303-missions')
    expect(stored).toBeDefined()

    const parsed = JSON.parse(stored!)
    // Storage format v2 has a version property and missions array
    expect(parsed.version).toBe(2)
    expect(parsed.missions).toHaveLength(1)
    expect(parsed.missions[0].n).toBe('Untitled Mission') // 'n' is the serialized key for 'name'
  })

  it('should load missions from localStorage on initialization', () => {
    // Create a mission and save to localStorage
    const store1 = useMissionsStore()
    const mission = store1.createMission('v93', 'Afghanistan')
    store1.updateMission(mission.id, { name: 'Persisted Mission' })

    // Create a new store instance (simulating page reload)
    setActivePinia(createPinia())
    const store2 = useMissionsStore()

    expect(store2.missions).toHaveLength(1)
    expect(store2.missions[0]?.name).toBe('Persisted Mission')
    expect(store2.missions[0]?.id).toBe(mission.id)
  })

  it('should initialize with default values for new missions', () => {
    const store = useMissionsStore()

    // Use Nevada which has no default airfield
    const mission = store.createMission('v93', 'Nevada')

    // Check default values
    expect(mission.crew).toEqual([])
    expect(mission.waypoints).toEqual([])
    // Loadout should have all stations initialized to EMPTY (F-16C has 12 stations: 1-12)
    expect(mission.loadout).toHaveLength(12)
    expect(mission.loadout.every((s) => s.item === 'EMPTY')).toBe(true)
    expect(mission.ecmCmds.cmdsPrograms).toHaveLength(1) // Default is 1 program
    expect(mission.ecmCmds.chaffBingo).toBe(10)
    expect(mission.ecmCmds.flareBingo).toBe(10)
    // v93 squadron uses F-16C - check internal fuel capacity from airframe data
    expect(mission.fuel.takeoff).toBe(7163)
    expect(mission.fuel.joker).toBe(3000)
    expect(mission.fuel.bingo).toBe(2000)
    expect(mission.radioPresets).toBeDefined()
    expect(mission.radioPresets.length).toBeGreaterThan(0)
    expect(mission.radioPresets[0]).toBeDefined()
    expect(mission.radioPresets[0].length).toBeGreaterThan(0)
  })

  it('should auto-create steerpoint 1 from default airfield when creating mission', () => {
    const store = useMissionsStore()

    // Afghanistan has a default airfield of Kandahar
    const mission = store.createMission('v93', 'Afghanistan')

    // Should have departure and recovery set
    expect(mission.departureRecovery.departureAirportId).toBe('Kandahar')
    expect(mission.departureRecovery.recoveryAirportId).toBe('Kandahar')

    // Should have auto-created steerpoint 1
    expect(mission.waypoints).toHaveLength(1)
    expect(mission.waypoints[0].sequence).toBe(1)
    expect(mission.waypoints[0].name).toBe('Kandahar')
    expect(mission.waypoints[0].type).toBe('PARK')
    expect(mission.waypoints[0].latitude).toBeDefined()
    expect(mission.waypoints[0].longitude).toBeDefined()
    expect(mission.waypoints[0].elevation).toBeDefined()
    expect(mission.waypoints[0].altitude).toBe(mission.waypoints[0].elevation)
  })

  it('should not auto-create steerpoint 1 when theater has no default airfield', () => {
    const store = useMissionsStore()

    // Nevada has no default airfield
    const mission = store.createMission('v93', 'Nevada')

    // Should not have departure and recovery set
    expect(mission.departureRecovery.departureAirportId).toBeUndefined()
    expect(mission.departureRecovery.recoveryAirportId).toBeUndefined()

    // Should not have auto-created waypoints
    expect(mission.waypoints).toHaveLength(0)
  })

  it('should preserve mission id when updating', () => {
    const store = useMissionsStore()

    const mission = store.createMission('v93', 'Afghanistan')

    const originalId = mission.id

    store.updateMission(mission.id, { name: 'Updated Mission' })

    const updated = store.getMission(originalId)
    expect(updated?.id).toBe(originalId)
  })

  it('should update nested fields correctly', () => {
    const store = useMissionsStore()

    const mission = store.createMission('v93', 'Afghanistan')

    store.updateMission(mission.id, {
      fuel: { takeoff: 15000, joker: 5000, bingo: 3500 },
    })

    const updated = store.getMission(mission.id)
    expect(updated?.fuel.takeoff).toBe(15000)
    expect(updated?.fuel.joker).toBe(5000)
    expect(updated?.fuel.bingo).toBe(3500)
  })
})
