# Test Helpers

This directory contains reusable test utilities to reduce boilerplate and improve test readability.

## Overview

The test helpers are organized into five main categories:

1. **Mock Factories** - Create test data with sensible defaults
2. **Test Setup** - Common setup utilities for beforeEach hooks
3. **Assertion Helpers** - Simplified assertion patterns
4. **Module Mocks** - Reusable module mock configurations
5. **Naive UI Helpers** - Utilities for testing Naive UI components

## Usage

Import helpers from the central index:

```typescript
import { createMockWaypoint, expectEmitted, setupPinia } from '@/__tests__/helpers'
```

## Mock Factories (`mock-factories.ts`)

Factory functions create test objects with sensible defaults and allow selective overrides.

### Available Factories

#### Core Data

- `createMockMission(overrides?)` - Creates a Mission object
- `createMockWaypoint(overrides?)` - Creates a Waypoint
- `createMockCrewMember(overrides?)` - Creates a CrewMember
- `createMockLoadoutStation(overrides?)` - Creates a LoadoutStation

#### Airfield Data

- `createMockAirfield(overrides?)` - Creates an Airfield
- `createMockAirfields()` - Creates an array of two mock airfields (Kutaisi & Batumi)
- `createMockPosition(overrides?)` - Creates a Position
- `createMockRunway(overrides?)` - Creates a Runway
- `createMockTACAN(overrides?)` - Creates a TACAN

#### Other

- `createMockECMCMDSProfiles(overrides?)` - Creates ECM/CMDS profiles
- `createMockPackageMember(overrides?)` - Creates a PackageMember
- `createMockSupportAsset(overrides?)` - Creates a SupportAsset
- `createMockStorageMonitor(overrides?)` - Creates a mock storage monitor composable

### Examples

```typescript
// Basic usage with defaults
const waypoint = createMockWaypoint()

// Override specific fields
const customWaypoint = createMockWaypoint({
  name: 'TGT',
  sequence: 3,
  altitude: 20000,
})

// Create mission with custom theater
const mission = createMockMission({
  theater: 'Syria',
  airframe: 'A-10C_2',
})

// Get standard mock airfields
const airfields = createMockAirfields()
```

## Test Setup (`test-setup.ts`)

Common setup operations for test suites.

### Available Functions

#### Individual Setup

- `setupPinia()` - Creates and activates a Pinia instance
- `setupLocalStorage()` - Returns a localStorage mock
- `setupMatchMedia(isDarkMode?)` - Mocks window.matchMedia
- `setupCommonMocks(options?)` - Combines common beforeEach operations

#### Declarative Setup

- `setupTestEnvironment(options?)` - Creates a beforeEach hook with specified setup

### Examples

```typescript
// Manual setup
beforeEach(() => {
  vi.clearAllMocks()
  setupPinia()
})

// Combined setup
beforeEach(() => {
  setupCommonMocks({
    setupPiniaStore: true,
    setupLocalStorageMock: true,
  })
})

// Declarative setup (recommended)
describe('MyComponent', () => {
  setupTestEnvironment({ pinia: true, localStorage: true })

  it('should work', () => {
    // Pinia and localStorage are already set up
  })
})
```

## Assertion Helpers (`assertion-helpers.ts`)

Simplified assertion patterns for common test scenarios.

### Event Assertions

- `expectEmitted(wrapper, eventName)` - Assert event was emitted
- `expectNotEmitted(wrapper, eventName)` - Assert event was NOT emitted
- `expectEmittedWith(wrapper, eventName, args, index?)` - Assert event with specific args
- `expectEmittedTimes(wrapper, eventName, count)` - Assert emission count

### Value Assertions

- `expectCloseTo(actual, expected, precision?)` - Assert numeric closeness
- `expectDefined(value)` - Assert not null/undefined
- `expectNullish(value)` - Assert null or undefined

### Object/Array Assertions

- `expectObjectToContain(obj, expectedProps)` - Assert object has properties
- `expectArrayToContain(arr, expectedElements)` - Assert array contains elements
- `expectArrayLength(arr, length)` - Assert array length

### Component Assertions

- `expectToContainText(wrapper, text)` - Assert component contains text
- `expectNotToContainText(wrapper, text)` - Assert component doesn't contain text
- `expectElementExists(wrapper, selector)` - Assert element exists
- `expectElementNotExists(wrapper, selector)` - Assert element doesn't exist
- `expectElementCount(wrapper, selector, count)` - Assert element count
- `expectPropToBe(wrapper, propName, value)` - Assert prop value
- `expectPropToMatch(wrapper, propName, object)` - Assert prop matches object

### Mock Assertions

- `expectCalledWith(mockFn, args, index?)` - Assert mock called with args

### Examples

```typescript
// Before: verbose
expect(wrapper.emitted('update:modelValue')).toBeTruthy()
expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['value'])

// After: concise
expectEmittedWith(wrapper, 'update:modelValue', ['value'])

// Multiple assertions
expectEmitted(wrapper, 'submit')
expectNotEmitted(wrapper, 'cancel')
expectEmittedTimes(wrapper, 'change', 3)
```

## Module Mocks (`module-mocks.ts`)

Reusable configurations for commonly mocked modules.

### Available Mocks

- `mockAirfieldsModule(airfields?)` - Mocks @/data/airfields
- `mockNaiveUIMessage()` - Mocks naive-ui useMessage
- `mockMdEditor()` - Mocks md-editor-v3 component
- `mockCrewDatabase(customCrew?)` - Mocks @/data/crew
- `mockF16Calculator(customReturnValues?)` - Mocks F-16 calculator utilities
- `mockA10Calculator(customReturnValues?)` - Mocks A-10 calculator utilities
- `mockImageStorage(customReturnValues?)` - Mocks imageStorage service
- `mockWaypointCalculations(customReturnValue?)` - Mocks waypoint calculations
- `mockStorageMonitor(overrides?)` - Mocks storage monitor composable

### Examples

```typescript
// In test file setup
vi.mock('@/data/airfields', () => ({
  getAirfieldsForTheater: vi.fn(),
}))

beforeEach(() => {
  // Use standard mock airfields
  mockAirfieldsModule()

  // Or provide custom airfields
  mockAirfieldsModule([createMockAirfield({ name: 'Custom' })])
})

// Mock calculator utilities
vi.mock('@/utils/f16RotationCalculator')
vi.mock('@/utils/a10RotationCalculator')

beforeEach(() => {
  mockF16Calculator()
  mockA10Calculator({
    speeds: { rotationSpeed: 130, refusalSpeed: 110 },
  })
})
```

## Naive UI Helpers (`naive-ui-helpers.ts`)

Utilities for testing components that use Naive UI components.

### Available Functions

- `selectNSelectValue(wrapper, handlerName, value)` - Select value in NSelect
- `getNInputValue(wrapper, refOrStateName)` - Get NInput value
- `setNInputValue(wrapper, updateEventName, value)` - Set NInput value
- `clickNButton(wrapper, buttonText)` - Click NButton by text
- `switchNTab(wrapper, tabStateName, tabValue)` - Switch NTabs
- `getNSelectOptions(wrapper, optionsPropertyName)` - Get NSelect options
- `hasNaiveUIComponent(wrapper, componentIndicator)` - Check component exists

### Examples

```typescript
import { selectNSelectValue } from '@/__tests__/helpers'

// Select airport in dropdown
await selectNSelectValue(wrapper, 'handleAirportChange', 'Kutaisi')

// Check if event was emitted
expectEmittedWith(wrapper, 'update:airportId', ['Kutaisi'])
```

## Benefits

### Reduced Duplication

- Eliminates 200+ lines of repeated mock setup code
- Standardizes test patterns across the codebase

### Improved Readability

- Tests focus on behavior, not boilerplate
- Self-documenting helper names

### Type Safety

- Factory functions ensure type correctness
- TypeScript autocompletion for all helpers

### Maintainability

- Update mocks in one place when types change
- Consistent test data across all tests

## Migration Guide

To migrate existing tests to use the helpers:

1. **Import helpers**: Replace local mock factories with imports from `@/__tests__/helpers`
2. **Use assertion helpers**: Replace verbose assertion patterns
3. **Simplify setup**: Use `setupTestEnvironment()` or `setupCommonMocks()`
4. **Leverage module mocks**: Replace repeated module mock configurations

### Before

```typescript
const createMockWaypoint = (overrides = {}): Waypoint => ({
  id: 'wp-1',
  sequence: 1,
  // ... 10 more lines
})

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should emit event', () => {
    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual(['value'])
  })
})
```

### After

```typescript
import { createMockWaypoint, setupTestEnvironment, expectEmittedWith } from '@/__tests__/helpers'

describe('MyComponent', () => {
  setupTestEnvironment()

  it('should emit event', () => {
    expectEmittedWith(wrapper, 'update', ['value'])
  })
})
```

## Contributing

When adding new helpers:

1. Follow existing naming conventions
2. Add JSDoc comments with examples
3. Export from `index.ts`
4. Update this README
5. Write tests for complex helpers
