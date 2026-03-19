/**
 * Assertion helper utilities
 *
 * Common assertion patterns to simplify test code and improve readability
 */

import { expect } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

/**
 * Asserts that a component emitted a specific event
 *
 * @param wrapper - The component wrapper
 * @param eventName - The name of the event
 *
 * @example
 * expectEmitted(wrapper, 'update:modelValue')
 */
export function expectEmitted(
  wrapper: VueWrapper<ComponentPublicInstance>,
  eventName: string,
): void {
  expect(wrapper.emitted(eventName)).toBeTruthy()
}

/**
 * Asserts that a component did not emit a specific event
 *
 * @param wrapper - The component wrapper
 * @param eventName - The name of the event
 *
 * @example
 * expectNotEmitted(wrapper, 'submit')
 */
export function expectNotEmitted(
  wrapper: VueWrapper<ComponentPublicInstance>,
  eventName: string,
): void {
  expect(wrapper.emitted(eventName)).toBeFalsy()
}

/**
 * Asserts that a component emitted an event with specific arguments
 *
 * @param wrapper - The component wrapper
 * @param eventName - The name of the event
 * @param expectedArgs - The expected arguments
 * @param emissionIndex - Which emission to check (default: 0, the first emission)
 *
 * @example
 * expectEmittedWith(wrapper, 'update:modelValue', ['new value'])
 * expectEmittedWith(wrapper, 'change', ['field', 'value'], 1) // Check second emission
 */
export function expectEmittedWith(
  wrapper: VueWrapper<ComponentPublicInstance>,
  eventName: string,
  expectedArgs: unknown[],
  emissionIndex = 0,
): void {
  const emitted = wrapper.emitted(eventName)
  expect(emitted).toBeTruthy()
  expect(emitted?.[emissionIndex]).toEqual(expectedArgs)
}

/**
 * Asserts that a component emitted an event a specific number of times
 *
 * @param wrapper - The component wrapper
 * @param eventName - The name of the event
 * @param count - The expected number of emissions
 *
 * @example
 * expectEmittedTimes(wrapper, 'click', 3)
 */
export function expectEmittedTimes(
  wrapper: VueWrapper<ComponentPublicInstance>,
  eventName: string,
  count: number,
): void {
  const emitted = wrapper.emitted(eventName)
  expect(emitted).toBeTruthy()
  expect(emitted).toHaveLength(count)
}

/**
 * Asserts that a value is within a certain range (useful for numeric calculations)
 *
 * @param actual - The actual value
 * @param expected - The expected value
 * @param precision - Number of decimal places (default: 5)
 *
 * @example
 * expectCloseTo(31.5057667, 31.50577, 4)
 */
export function expectCloseTo(actual: number, expected: number, precision = 5): void {
  expect(actual).toBeCloseTo(expected, precision)
}

/**
 * Asserts that an object has specific properties with expected values
 *
 * @param obj - The object to check
 * @param expectedProps - An object with the expected property values
 *
 * @example
 * expectObjectToContain(mission, { name: 'Test', squadron: 'v93' })
 */
export function expectObjectToContain(
  obj: Record<string, unknown>,
  expectedProps: Record<string, unknown>,
): void {
  expect(obj).toMatchObject(expectedProps)
}

/**
 * Asserts that an array contains elements matching the expected values
 *
 * @param arr - The array to check
 * @param expectedElements - The expected elements
 *
 * @example
 * expectArrayToContain(['a', 'b', 'c'], ['a', 'c'])
 */
export function expectArrayToContain<T>(arr: T[], expectedElements: T[]): void {
  expectedElements.forEach((element) => {
    expect(arr).toContain(element)
  })
}

/**
 * Asserts that an array has a specific length
 *
 * @param arr - The array to check
 * @param expectedLength - The expected length
 *
 * @example
 * expectArrayLength(waypoints, 5)
 */
export function expectArrayLength(arr: unknown[], expectedLength: number): void {
  expect(arr).toHaveLength(expectedLength)
}

/**
 * Asserts that a component's HTML contains specific text
 *
 * @param wrapper - The component wrapper
 * @param text - The text to search for
 *
 * @example
 * expectToContainText(wrapper, 'Airport')
 */
export function expectToContainText(
  wrapper: VueWrapper<ComponentPublicInstance>,
  text: string,
): void {
  expect(wrapper.text()).toContain(text)
}

/**
 * Asserts that a component's HTML does not contain specific text
 *
 * @param wrapper - The component wrapper
 * @param text - The text that should not be present
 *
 * @example
 * expectNotToContainText(wrapper, 'Error')
 */
export function expectNotToContainText(
  wrapper: VueWrapper<ComponentPublicInstance>,
  text: string,
): void {
  expect(wrapper.text()).not.toContain(text)
}

/**
 * Asserts that a DOM element exists in the wrapper
 *
 * @param wrapper - The component wrapper
 * @param selector - CSS selector for the element
 *
 * @example
 * expectElementExists(wrapper, '.waypoint-item')
 */
export function expectElementExists(
  wrapper: VueWrapper<ComponentPublicInstance>,
  selector: string,
): void {
  expect(wrapper.find(selector).exists()).toBe(true)
}

/**
 * Asserts that a DOM element does not exist in the wrapper
 *
 * @param wrapper - The component wrapper
 * @param selector - CSS selector for the element
 *
 * @example
 * expectElementNotExists(wrapper, '.error-message')
 */
export function expectElementNotExists(
  wrapper: VueWrapper<ComponentPublicInstance>,
  selector: string,
): void {
  expect(wrapper.find(selector).exists()).toBe(false)
}

/**
 * Asserts that multiple elements exist matching a selector
 *
 * @param wrapper - The component wrapper
 * @param selector - CSS selector for the elements
 * @param count - Expected number of matching elements
 *
 * @example
 * expectElementCount(wrapper, '.waypoint-card', 3)
 */
export function expectElementCount(
  wrapper: VueWrapper<ComponentPublicInstance>,
  selector: string,
  count: number,
): void {
  expect(wrapper.findAll(selector)).toHaveLength(count)
}

/**
 * Asserts that a prop has a specific value
 *
 * @param wrapper - The component wrapper
 * @param propName - The name of the prop
 * @param expectedValue - The expected value
 *
 * @example
 * expectPropToBe(wrapper, 'theater', 'Caucasus')
 */
export function expectPropToBe(
  wrapper: VueWrapper<ComponentPublicInstance>,
  propName: string,
  expectedValue: unknown,
): void {
  expect(wrapper.props(propName)).toBe(expectedValue)
}

/**
 * Asserts that a prop matches an object structure
 *
 * @param wrapper - The component wrapper
 * @param propName - The name of the prop
 * @param expectedValue - The expected object structure
 *
 * @example
 * expectPropToMatch(wrapper, 'mission', { name: 'Test', squadron: 'v93' })
 */
export function expectPropToMatch(
  wrapper: VueWrapper<ComponentPublicInstance>,
  propName: string,
  expectedValue: Record<string, unknown>,
): void {
  expect(wrapper.props(propName)).toMatchObject(expectedValue)
}

/**
 * Asserts that a function was called with specific arguments
 *
 * @param mockFn - The mock function
 * @param expectedArgs - The expected arguments
 * @param callIndex - Which call to check (default: 0, the first call)
 *
 * @example
 * expectCalledWith(mockFunction, ['arg1', 'arg2'])
 */
export function expectCalledWith(
  mockFn: { mock: { calls: unknown[][] }; [key: string]: unknown },
  expectedArgs: unknown[],
  callIndex = 0,
): void {
  expect(mockFn).toHaveBeenCalled()
  expect(mockFn.mock.calls[callIndex]).toEqual(expectedArgs)
}

/**
 * Asserts that a value is defined (not null or undefined)
 *
 * @param value - The value to check
 *
 * @example
 * expectDefined(mission)
 */
export function expectDefined(value: unknown): void {
  expect(value).toBeDefined()
  expect(value).not.toBeNull()
}

/**
 * Asserts that a value is null or undefined
 *
 * @param value - The value to check
 *
 * @example
 * expectNullish(optionalField)
 */
export function expectNullish(value: unknown): void {
  expect(value == null).toBe(true)
}
