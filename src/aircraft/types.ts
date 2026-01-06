/**
 * Aircraft Performance Calculator Type Definitions
 *
 * Core interfaces and types for the extensible aircraft calculator architecture.
 * This module defines the common interfaces that all aircraft-specific calculators
 * must implement, enabling a plugin-like architecture where new aircraft can be
 * added without modifying existing code.
 *
 * @module aircraft/types
 */

import type { Airframe } from '@/types'

// ============================================================================
// Capability System
// ============================================================================

/**
 * Capabilities that an aircraft calculator may or may not support.
 * Used for runtime feature detection and UI composition.
 */
export type CalculatorCapability =
  | 'speeds' // Rotation and refusal speed calculations
  | 'takeoffDistance' // Takeoff distance calculation
  | 'bingo' // Bingo fuel calculation (e.g., F-16)
  | 'criticalField' // Critical field length for engine-out scenarios (e.g., A-10)
  | 'dragIndex' // Drag index from loadout (e.g., F-16)

// ============================================================================
// Common Result Types
// ============================================================================

/**
 * Result from speed calculations (rotation and refusal speeds)
 */
export interface SpeedCalculationResult {
  /** Rotation speed in KIAS */
  rotationSpeed: number
  /** Refusal speed in KIAS */
  refusalSpeed: number
  /** Applied corrections and notes about the calculation */
  notes: string[]
}

/**
 * Result from takeoff distance calculations
 */
export interface TakeoffDistanceResult {
  /** Base takeoff distance in feet (before corrections) */
  baseDistance: number
  /** Final takeoff distance in feet (after all corrections) */
  takeoffDistance: number
  /** Applied corrections breakdown (aircraft-specific) */
  corrections: Record<string, number>
  /** Notes about the calculation */
  notes: string[]
}

/**
 * Result from critical field length calculations (A-10 specific)
 */
export interface CriticalFieldLengthResult {
  /** Base critical field length in feet (before corrections) */
  baseLength: number
  /** Final critical field length in feet (after all corrections) */
  criticalFieldLength: number
  /** Applied corrections breakdown */
  corrections: Record<string, number>
  /** Notes about the calculation */
  notes: string[]
}

/**
 * Parameters for bingo fuel calculation
 */
export interface BingoParams {
  /** Number of pilots in the flight */
  numberOfPilots: number
  /** Recovery airport location (home plate) */
  recoveryLocation: { latitude: number; longitude: number } | null
  /** Target location (first waypoint marked as target) */
  targetLocation: { latitude: number; longitude: number } | null
  /** Alternate airport location (optional) */
  alternateLocation: { latitude: number; longitude: number } | null
}

// ============================================================================
// Core Calculator Interface
// ============================================================================

/**
 * Base aircraft calculator interface.
 *
 * All aircraft-specific calculators must implement this interface.
 * The generic parameters allow each aircraft to define its own
 * environment parameters and configuration types.
 *
 * @typeParam TSpeedParams - Parameters for speed calculations
 * @typeParam TSpeedConfig - Configuration for speed calculations
 * @typeParam TTakeoffParams - Parameters for takeoff distance calculations
 * @typeParam TTakeoffConfig - Configuration for takeoff distance calculations
 */
export interface AircraftCalculator<
  TSpeedParams = unknown,
  TSpeedConfig = unknown,
  TTakeoffParams = unknown,
  TTakeoffConfig = unknown,
> {
  /** Aircraft identifier (must match an Airframe type) */
  readonly airframe: Airframe

  /** Display name for UI (e.g., "F-16C", "A-10C") */
  readonly displayName: string

  /** List of supported capabilities */
  readonly capabilities: readonly CalculatorCapability[]

  /**
   * Check if this calculator supports a specific capability
   * @param capability - The capability to check
   * @returns true if the capability is supported
   */
  hasCapability(capability: CalculatorCapability): boolean

  /**
   * Get the default configuration for speed calculations
   * @returns Default speed calculation configuration
   */
  getDefaultSpeedConfig(): TSpeedConfig

  /**
   * Get the default configuration for takeoff distance calculations
   * @returns Default takeoff distance configuration
   */
  getDefaultTakeoffConfig(): TTakeoffConfig

  /**
   * Calculate rotation and refusal speeds
   * @param params - Environment parameters
   * @param config - Calculator configuration
   * @returns Speed calculation results
   */
  calculateSpeeds(params: TSpeedParams, config: TSpeedConfig): SpeedCalculationResult

  /**
   * Calculate takeoff distance
   * @param params - Environment parameters
   * @param config - Calculator configuration
   * @returns Takeoff distance calculation results
   */
  calculateTakeoffDistance(params: TTakeoffParams, config: TTakeoffConfig): TakeoffDistanceResult

  /**
   * Get the crosswind limit for given configuration
   * @param config - Calculator configuration
   * @returns Maximum crosswind limit in knots, or null if no limit
   */
  getCrosswindLimit(config: TTakeoffConfig): number | null

  /**
   * Check if a crosswind component exceeds limitations
   * @param crosswindKnots - Crosswind component in knots (absolute value used)
   * @param config - Calculator configuration
   * @returns true if crosswind exceeds the limit
   */
  exceedsCrosswindLimit(crosswindKnots: number, config: TTakeoffConfig): boolean
}

// ============================================================================
// Extended Capability Interfaces
// ============================================================================

/**
 * Extended calculator interface for aircraft with bingo fuel capability (e.g., F-16)
 */
export interface BingoCapableCalculator<TBingoConfig = unknown> {
  /**
   * Calculate bingo fuel
   * @param params - Bingo calculation parameters
   * @param config - Bingo calculator configuration
   * @returns Bingo fuel in pounds
   */
  calculateBingo(params: BingoParams, config: TBingoConfig): number

  /**
   * Get default bingo calculator configuration
   */
  getDefaultBingoConfig(): TBingoConfig
}

/**
 * Extended calculator interface for aircraft with critical field length (e.g., A-10)
 */
export interface CriticalFieldCapableCalculator<TParams = unknown, TConfig = unknown> {
  /**
   * Calculate critical field length (engine-out scenario)
   * @param params - Environment parameters
   * @param config - Calculator configuration
   * @returns Critical field length calculation results
   */
  calculateCriticalFieldLength(params: TParams, config: TConfig): CriticalFieldLengthResult
}

/**
 * Extended calculator interface for aircraft with drag index calculation (e.g., F-16)
 */
export interface DragIndexCapableCalculator {
  /**
   * Calculate total drag index from a loadout
   * @param stores - Array of store items with CLSIDs
   * @returns Total drag index
   */
  calculateDragIndex(stores: Array<{ clsid: string; category?: string }>): number

  /**
   * Get drag index for a single store
   * @param clsid - Store CLSID
   * @param category - Optional category for fallback
   * @returns Drag index for the store
   */
  getDragIndex(clsid: string, category?: string): number
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a calculator supports bingo calculation
 */
export function isBingoCapable(
  calculator: AircraftCalculator,
): calculator is AircraftCalculator & BingoCapableCalculator {
  return calculator.hasCapability('bingo')
}

/**
 * Type guard to check if a calculator supports critical field length
 */
export function isCriticalFieldCapable(
  calculator: AircraftCalculator,
): calculator is AircraftCalculator & CriticalFieldCapableCalculator {
  return calculator.hasCapability('criticalField')
}

/**
 * Type guard to check if a calculator supports drag index
 */
export function isDragIndexCapable(
  calculator: AircraftCalculator,
): calculator is AircraftCalculator & DragIndexCapableCalculator {
  return calculator.hasCapability('dragIndex')
}
