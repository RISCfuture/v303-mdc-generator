# Mission Storage JSON Schema

This directory contains the JSON Schema definition for the v303 MDC Generator mission storage format.

## Schema File

**`mission.schema.json`** - Defines the structure and validation rules for the mission storage format (v2).

## Important: Valid vs Complete

**Understanding the distinction:**

- **VALID**: Mission conforms to TypeScript types and can be stored in localStorage
  - Checked by TypeScript compiler at build time
  - Allows empty strings, empty arrays, null values where the type permits
  - Example: A new mission with empty callsign is VALID for storage

- **COMPLETE**: Mission passes all JSON Schema requirements and is ready for export
  - Checked by JSON Schema validation at runtime
  - Requires all export-critical fields to be filled (non-empty callsign, crew, waypoints, etc.)
  - Example: A mission must be COMPLETE before the Export button is enabled

**The JSON Schema enforces COMPLETENESS, not just validity.**

## Usage

### Checking Completeness (Export-Readiness)

Use this to determine if a mission can be exported:

```typescript
import { isMissionStorageComplete } from '../utils/validateMissionStorage'

const result = isMissionStorageComplete(data)
if (!result.valid) {
  console.error('Mission is incomplete:', result.errors)
  // Export button should be disabled
}
```

### Legacy Function (Deprecated)

```typescript
import { validateMissionStorage } from '../utils/validateMissionStorage'

// This is now deprecated - use isMissionStorageComplete() for clarity
const result = validateMissionStorage(data)
```

### Development Utilities

```typescript
import { validateStoredMissions, logValidationErrors } from '../utils/validateMissionStorage'

// Validate current localStorage
const result = validateStoredMissions()
logValidationErrors(result)
```

### External Validation

The schema can also be used with external JSON Schema validators:

```bash
# Using ajv-cli
npx ajv validate -s src/schemas/mission.schema.json -d mission-data.json
```

## Schema Structure

The schema validates:

- **Storage version** - Must be `2`
- **Mission metadata** - ID, name, date, airframe, theater
- **Crew data** - Pilot names (references to crew database)
- **Waypoints/Steerpoints** - All coordinate and flight plan data
- **Loadout** - Station assignments (EMPTY stations omitted)
- **CMDS/ECM** - Countermeasure settings
- **Radio presets** - Communication frequencies
- **Fuel data** - Takeoff, joker, bingo values
- **Mission details** - Remarks, threats, targets

## Validation Rules

### Coordinates

- **Latitude**: -90 to 90 decimal degrees
- **Longitude**: -180 to 180 decimal degrees

### Enums

- **Airframe**: `F-16C`, `A-10C`
- **Theater**: `Afghanistan`, `Nevada`, `Marianas`, `Syria`, `Germany`

### Required Fields

All missions must have:

- `id`, `n` (name), `d` (date), `af` (airframe), `th` (theater)
- `cr` (crew array), `wp` (waypoints array), `ld` (loadout array)
- `f` (fuel data with `to`, `j`, `b`)
- `ca` (createdAt), `ua` (updatedAt)

## Updates

When modifying the storage format:

1. Update the schema definition in `mission.schema.json`
2. Increment the version number in both schema and code
3. Update serialization/deserialization in `src/utils/missionStorage.ts`
4. Add tests in `src/__tests__/utils/validateMissionStorage.spec.ts`
5. Update this documentation

## Testing

Tests are located in `src/__tests__/utils/validateMissionStorage.spec.ts` and verify:

- Valid mission data passes validation
- Invalid data is properly rejected
- Error messages are helpful and accurate
- All edge cases are covered
