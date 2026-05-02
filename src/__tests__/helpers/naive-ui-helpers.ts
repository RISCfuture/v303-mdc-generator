/**
 * Test helpers for interacting with Naive UI components in Vue Test Utils
 *
 * Naive UI components don't work well with findComponent() because they return
 * empty wrappers. These helpers provide utilities to test components that use
 * Naive UI by working with the component's internal state and methods.
 */

import type { VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

/**
 * Simulates a user selecting a value in an NSelect component by calling
 * the component's change handler directly.
 *
 * @param wrapper - The mounted component wrapper
 * @param handlerName - The name of the handler method (e.g., 'handleAirportChange')
 * @param value - The value to select
 *
 * @example
 * const wrapper = mount(MyComponent)
 * await selectNSelectValue(wrapper, 'handleAirportChange', 'Kutaisi')
 * expect(wrapper.emitted('update:airportId')).toBeTruthy()
 */
export async function selectNSelectValue(
  wrapper: VueWrapper<ComponentPublicInstance>,
  handlerName: string,
  value: unknown,
): Promise<void> {
  const vm = wrapper.vm as ComponentPublicInstance & Record<string, unknown>
  if (typeof vm[handlerName] !== 'function') {
    throw new Error(
      `Handler "${handlerName}" not found on component. ` +
        `Make sure the component exposes this method for testing.`,
    )
  }

  ;(vm[handlerName] as (value: unknown) => void)(value)
  await wrapper.vm.$nextTick()
}

/**
 * Gets the current value of an NInput by accessing the component's internal state.
 *
 * @param wrapper - The mounted component wrapper
 * @param refOrStateName - The name of the ref or state property
 * @returns The current value
 *
 * @example
 * const wrapper = mount(MyComponent)
 * const pilotName = getNInputValue(wrapper, 'pilotName')
 */
export function getNInputValue(
  wrapper: VueWrapper<ComponentPublicInstance>,
  refOrStateName: string,
): unknown {
  const vm = wrapper.vm as ComponentPublicInstance & Record<string, unknown>
  // Try direct property access
  if (vm[refOrStateName] !== undefined) {
    const value: unknown = vm[refOrStateName]
    // Handle Vue refs
    if (typeof value === 'object' && value !== null && 'value' in value) {
      return value.value
    }
    return value
  }

  return undefined
}

/**
 * Simulates user input in an NInput component by calling the update handler.
 *
 * @param wrapper - The mounted component wrapper
 * @param updateEventName - The name of the update event (e.g., 'update:pilotName')
 * @param value - The value to input
 *
 * @example
 * const wrapper = mount(MyComponent)
 * await setNInputValue(wrapper, 'update:pilotName', 'John Doe')
 * expect(wrapper.emitted('update:pilotName')?.[0]).toEqual(['John Doe'])
 */
export async function setNInputValue(
  wrapper: VueWrapper<ComponentPublicInstance>,
  updateEventName: string,
  value: unknown,
): Promise<void> {
  const vm = wrapper.vm as ComponentPublicInstance & Record<string, unknown>
  // Find the handler by convention (update:foo -> handleFooUpdate or onUpdateFoo)
  const propName = updateEventName.replace('update:', '')
  const handlerNames = [
    `handle${capitalize(propName)}Update`,
    `onUpdate${capitalize(propName)}`,
    `handle${capitalize(propName)}Change`,
    `onChange${capitalize(propName)}`,
  ]

  const handler = handlerNames.find((name) => typeof vm[name] === 'function')

  if (handler) {
    ;(vm[handler] as (value: unknown) => void)(value)
  } else {
    // Fallback: just check if the component would emit
    console.warn(
      `No handler found for ${updateEventName}. ` +
        `Tried: ${handlerNames.join(', ')}. ` +
        `You may need to test the event emission directly.`,
    )
  }

  await wrapper.vm.$nextTick()
}

/**
 * Clicks an NButton by finding it via text content and triggering the click event.
 *
 * @param wrapper - The mounted component wrapper
 * @param buttonText - The text content of the button
 *
 * @example
 * const wrapper = mount(MyComponent)
 * await clickNButton(wrapper, 'Add Waypoint')
 * expect(wrapper.emitted('add-waypoint')).toBeTruthy()
 */
export async function clickNButton(
  wrapper: VueWrapper<ComponentPublicInstance>,
  buttonText: string,
): Promise<void> {
  const button = wrapper.findAll('button').find((b) => b.text().includes(buttonText))

  if (!button) {
    throw new Error(
      `Button with text "${buttonText}" not found. ` +
        `Available buttons: ${wrapper
          .findAll('button')
          .map((b) => b.text())
          .join(', ')}`,
    )
  }

  await button.trigger('click')
  await wrapper.vm.$nextTick()
}

/**
 * Switches to a specific tab in an NTabs component.
 *
 * @param wrapper - The mounted component wrapper
 * @param tabStateName - The name of the state property that controls which tab is active
 * @param tabValue - The value to switch to
 *
 * @example
 * const wrapper = mount(MyComponent)
 * await switchNTab(wrapper, 'activeTab', 'radio-1')
 */
export async function switchNTab(
  wrapper: VueWrapper<ComponentPublicInstance>,
  tabStateName: string,
  tabValue: string | number,
): Promise<void> {
  const vm = wrapper.vm as ComponentPublicInstance & Record<string, unknown>
  if (vm[tabStateName] !== undefined) {
    const state = vm[tabStateName] as { value?: string | number } | string | number
    // Handle Vue refs
    if (typeof state === 'object' && state !== null && 'value' in state) {
      state.value = tabValue
    } else {
      vm[tabStateName] = tabValue
    }
  }

  await wrapper.vm.$nextTick()
}

/**
 * Gets options from an NSelect component by accessing the component's computed properties.
 *
 * @param wrapper - The mounted component wrapper
 * @param optionsPropertyName - The name of the property that contains the options
 * @returns The options array
 *
 * @example
 * const wrapper = mount(MyComponent)
 * const airfieldOptions = getNSelectOptions(wrapper, 'airfieldOptions')
 * expect(airfieldOptions.length).toBe(2)
 */
export function getNSelectOptions<T = unknown>(
  wrapper: VueWrapper<ComponentPublicInstance>,
  optionsPropertyName: string,
): T[] {
  const vm = wrapper.vm as ComponentPublicInstance & Record<string, unknown>
  const options = vm[optionsPropertyName] as { value?: T[] } | T[] | undefined

  // Handle Vue refs
  if (
    options &&
    typeof options === 'object' &&
    'value' in options &&
    Array.isArray(options.value)
  ) {
    return options.value
  }

  if (Array.isArray(options)) {
    return options
  }

  return []
}

/**
 * Verifies that a component's HTML contains certain Naive UI component indicators.
 * This is useful when you can't interact with the component but want to verify it exists.
 *
 * @param wrapper - The mounted component wrapper
 * @param componentIndicator - A string that appears in the HTML when the component is present
 * @returns True if the indicator is found
 *
 * @example
 * const wrapper = mount(MyComponent)
 * expect(hasNaiveUIComponent(wrapper, 'n-select')).toBe(true)
 */
export function hasNaiveUIComponent(
  wrapper: VueWrapper<ComponentPublicInstance>,
  componentIndicator: string,
): boolean {
  const html = wrapper.html().toLowerCase()
  return html.includes(componentIndicator.toLowerCase())
}

// Helper function to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
