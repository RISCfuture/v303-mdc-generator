# F-16C Rotation and Refusal Speed Calculator

This module calculates takeoff rotation speed and refusal speed for the F-16C with F110-GE-129 engine based on TO GR1F-16CJ-1-1 Supplemental Flight Manual performance charts (pages 284-293).

## Overview

The calculator provides functions to determine:
- **Rotation Speed**: The speed at which the pilot rotates the aircraft for liftoff
- **Refusal Speed**: The maximum speed at which a takeoff can be safely aborted

## Data Extraction Process

### 1. Chart Analysis and Digitization (`extract_regression.py`)
- Manually sampled data points from performance charts (pages 284-293)
- Fitted polynomial regression equations (quadratic, degree 2)
- Achieved R² > 0.999 for all curves
- Generated coefficients saved in `regression_data.json`

### 2. TypeScript Calculator (`src/utils/f16RotationCalculator.ts`)
Uses embedded polynomial regression equations to calculate speeds:
- **No external data files needed** - coefficients are embedded in code
- **Quadratic equations** capture the slight curvature of chart lines
- Apply corrections for:
  - Power setting (MIL vs AB)
  - Center of gravity position
  - Pitch attitude
  - Runway condition (dry/wet/snow/ice)
  - Wind component (headwind/tailwind)
  - Runway slope (upslope/downslope)

## Usage

### Basic Example

```typescript
import { calculateStandardSpeeds } from '@/utils/f16RotationCalculator'

// Calculate speeds for a 30,000 lb aircraft using AB takeoff
const result = calculateStandardSpeeds(30000, 'AB')

console.log(`Rotation Speed: ${result.rotationSpeed} KIAS`)
console.log(`Refusal Speed: ${result.refusalSpeed} KIAS`)
```

### Advanced Example with Custom Conditions

```typescript
import { calculateSpeeds } from '@/utils/f16RotationCalculator'

const result = calculateSpeeds({
  grossWeight: 32500,           // lbs
  powerSetting: 'AB',
  runwayCondition: 'wet',
  headwindComponent: 15,        // 15 kt headwind
  runwaySlope: -0.5,            // 0.5% downslope
  cgPercent: 37,                // 37% MAC
  pitchAttitude: 10,            // 10 degrees
})

console.log(`Rotation Speed: ${result.rotationSpeed} KIAS`)
console.log(`Refusal Speed: ${result.refusalSpeed} KIAS`)
console.log('Notes:', result.notes.join(', '))
```

## Chart Data Structure

The `speed_data.json` file contains:

```json
{
  "aircraft": "F-16C",
  "engine": "F110-GE-129",
  "source": "TO GR1F-16CJ-1-1 Supplemental Flight Manual, pages 284-293",
  "takeoffSpeed": {
    "table": [
      { "gw": 15.0, "speed": 120 },
      { "gw": 15.5, "speed": 122.5 },
      ...
    ]
  },
  "refusalSpeed": {
    "nonAB": {
      "conditions": {
        "dry": { "table": [...] },
        "wet": { "table": [...] },
        "snow": { "table": [...] },
        "ice": { "table": [...] }
      }
    },
    "AB": { ... }
  }
}
```

## Corrections Applied

### Rotation Speed Corrections
- **Power Setting**: -10 KIAS for MIL, -15 KIAS for AB
- **CG Position**: ±0.8 KIAS per 1% from 35% MAC
- **Pitch Attitude**: +8% for 8° pitch (vs 10° baseline)

### Refusal Speed Corrections
- **Wind**: ~-1 KIAS per 5 kt headwind, +1 KIAS per 3 kt tailwind
- **Slope**: ~±4 KIAS per 1% slope

## Testing

Comprehensive unit tests validate:
- Correct speed calculations across weight range
- Application of all corrections
- Proper handling of different runway conditions
- Edge cases and boundary conditions

Run tests:
```bash
yarn test:unit f16RotationCalculator
```

## Notes

1. The digitized chart data is approximate and should be verified against actual flight manual charts for operational use
2. Refusal speed can be lower than rotation speed for light aircraft with AB takeoffs due to high acceleration rates
3. Standard conditions assume:
   - Dry runway
   - Zero wind
   - Level runway
   - 35% MAC CG
   - 10° pitch attitude
   - All drag indexes
   - Speedbrakes open

## Future Enhancements

- Temperature and pressure altitude corrections (currently data is for all altitudes/temperatures)
- Integration with mission planning for automatic calculation based on loadout
- Visual display of speed bugs for HUD/MDC
- Takeoff distance calculations (Figure B2-3)
- Acceleration check speeds (Figure B2-4)
