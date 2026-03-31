/**
 * Aircraft Calculator Registry
 *
 * Central registry for aircraft-specific performance calculators and UI components.
 * Uses lazy instantiation via factory functions to avoid circular dependencies
 * and reduce initial load time.
 *
 * @module aircraft/registry
 */

import type { Component, AsyncComponentLoader } from 'vue'
import type { Airframe } from '@/types'
import type { AircraftCalculator, CalculatorCapability } from './types'

/**
 * Factory function type for creating calculator instances
 */
type CalculatorFactory = () => AircraftCalculator

/**
 * UI component types that can be registered per aircraft
 */
export type AircraftComponentType =
  | 'speedCalculatorForm'
  | 'takeoffDistanceDisplay'
  | 'ecmCmds'
  | 'waypointCcipFields'

/**
 * Component loader type (for async components)
 */
type ComponentLoader = AsyncComponentLoader<Component>

/**
 * Aircraft calculator registry singleton.
 *
 * Design notes:
 * - Uses lazy loading via factory functions to avoid circular dependencies
 * - Caches instances after first creation for performance
 * - Provides type-safe access to calculators
 * - Enables runtime capability checking
 */
class AircraftCalculatorRegistry {
  /** Factory functions for creating calculators */
  private factories = new Map<Airframe, CalculatorFactory>()

  /** Cached calculator instances */
  private instances = new Map<Airframe, AircraftCalculator>()

  /** UI component loaders per airframe and component type */
  private componentLoaders = new Map<Airframe, Map<AircraftComponentType, ComponentLoader>>()

  /**
   * Register a calculator factory for an airframe.
   *
   * @param airframe - The airframe identifier
   * @param factory - Factory function to create the calculator
   */
  register(airframe: Airframe, factory: CalculatorFactory): void {
    this.factories.set(airframe, factory)
    // Clear cached instance if re-registering (useful for testing)
    this.instances.delete(airframe)
  }

  /**
   * Get calculator for an airframe (lazy instantiation).
   *
   * @param airframe - The airframe identifier
   * @returns The calculator instance, or undefined if not registered
   */
  get(airframe: Airframe): AircraftCalculator | undefined {
    // Return cached instance if available
    if (this.instances.has(airframe)) {
      return this.instances.get(airframe)
    }

    // Create and cache new instance
    const factory = this.factories.get(airframe)
    if (factory) {
      const instance = factory()
      this.instances.set(airframe, instance)
      return instance
    }

    return undefined
  }

  /**
   * Check if an airframe has a specific capability.
   *
   * @param airframe - The airframe identifier
   * @param capability - The capability to check
   * @returns true if the airframe supports the capability
   */
  hasCapability(airframe: Airframe, capability: CalculatorCapability): boolean {
    const calculator = this.get(airframe)
    return calculator?.hasCapability(capability) ?? false
  }

  /**
   * Get all registered airframes.
   *
   * @returns Array of registered airframe identifiers
   */
  getRegisteredAirframes(): Airframe[] {
    return Array.from(this.factories.keys())
  }

  /**
   * Get all airframes that support a specific capability.
   *
   * @param capability - The capability to filter by
   * @returns Array of airframe identifiers supporting the capability
   */
  getAirframesWithCapability(capability: CalculatorCapability): Airframe[] {
    const result: Airframe[] = []
    for (const airframe of this.factories.keys()) {
      if (this.hasCapability(airframe, capability)) {
        result.push(airframe)
      }
    }
    return result
  }

  /**
   * Check if a calculator is registered for this airframe.
   *
   * @param airframe - The airframe identifier
   * @returns true if a calculator is registered
   */
  isSupported(airframe: Airframe): boolean {
    return this.factories.has(airframe)
  }

  // ============================================================================
  // Component Registration
  // ============================================================================

  /**
   * Register a UI component loader for an airframe.
   *
   * @param airframe - The airframe identifier (DCS clsid)
   * @param componentType - The type of component
   * @param loader - Async component loader function
   */
  registerComponent(
    airframe: Airframe,
    componentType: AircraftComponentType,
    loader: ComponentLoader,
  ): void {
    if (!this.componentLoaders.has(airframe)) {
      this.componentLoaders.set(airframe, new Map())
    }
    const loaders = this.componentLoaders.get(airframe)
    loaders?.set(componentType, loader)
  }

  /**
   * Get a component loader for an airframe.
   *
   * @param airframe - The airframe identifier (DCS clsid)
   * @param componentType - The type of component
   * @returns The component loader, or undefined if not registered
   */
  getComponentLoader(
    airframe: Airframe,
    componentType: AircraftComponentType,
  ): ComponentLoader | undefined {
    return this.componentLoaders.get(airframe)?.get(componentType)
  }

  /**
   * Check if a component is registered for an airframe.
   *
   * @param airframe - The airframe identifier (DCS clsid)
   * @param componentType - The type of component
   * @returns true if the component is registered
   */
  hasComponent(airframe: Airframe, componentType: AircraftComponentType): boolean {
    return this.componentLoaders.get(airframe)?.has(componentType) ?? false
  }

  /**
   * Clear all cached instances (useful for testing).
   */
  clearCache(): void {
    this.instances.clear()
  }

  /**
   * Clear all registrations and cache (useful for testing).
   */
  reset(): void {
    this.factories.clear()
    this.instances.clear()
    this.componentLoaders.clear()
  }
}

/**
 * Global registry instance.
 * Use this singleton to register and retrieve aircraft calculators.
 */
export const calculatorRegistry = new AircraftCalculatorRegistry()

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get a calculator for an airframe.
 *
 * @param airframe - The airframe identifier
 * @returns The calculator instance, or undefined if not registered
 */
export function getAircraftCalculator(airframe: Airframe): AircraftCalculator | undefined {
  return calculatorRegistry.get(airframe)
}

/**
 * Check if an airframe has a calculator capability.
 *
 * @param airframe - The airframe identifier
 * @param capability - The capability to check
 * @returns true if the airframe supports the capability
 */
export function hasCalculatorCapability(
  airframe: Airframe,
  capability: CalculatorCapability,
): boolean {
  return calculatorRegistry.hasCapability(airframe, capability)
}

/**
 * Check if an airframe has a registered calculator.
 *
 * @param airframe - The airframe identifier (DCS clsid)
 * @returns true if a calculator is registered
 */
export function isCalculatorSupported(airframe: Airframe): boolean {
  return calculatorRegistry.isSupported(airframe)
}

/**
 * Get a component loader for an airframe.
 *
 * @param airframe - The airframe identifier (DCS clsid)
 * @param componentType - The type of component
 * @returns The component loader, or undefined if not registered
 */
export function getAircraftComponentLoader(
  airframe: Airframe,
  componentType: AircraftComponentType,
): ComponentLoader | undefined {
  return calculatorRegistry.getComponentLoader(airframe, componentType)
}
