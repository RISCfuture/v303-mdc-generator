# A-10C Rotation and Refusal Speed Calculator

This module calculates takeoff rotation speed and refusal speed for the A-10C based on TO 1A-10A-1 Flight Manual performance charts (pages 437, 446).

## Overview

The calculator provides functions to determine:

- **Rotation Speed**: The speed at which the pilot rotates the aircraft for liftoff
- **Refusal Speed**: The maximum speed at which a takeoff can be safely aborted

## Data Extraction Process

### 1. PDF Chart Extraction (`extract_charts.py`)

Extracts pages 437, 439, 446 from the flight manual as high-resolution PNG images (300 DPI).

Note: Page 447 was intentionally left blank. Page 446 contains the refusal speed chart.

### 2. Chart Digitization (`digitize_charts.py`)

Converts the performance charts into structured JSON data with interpolation tables:

- **Rotation Speed (Figure A2-2, Page 437)**: Linear relationship between gross weight and takeoff speed for two flap settings
- **Refusal Speed (Figure A2-11, Page 446)**: Refusal speeds across different gross weights and runway conditions (RCR values)

### 3. TypeScript Calculator (`src/utils/a10RotationCalculator.ts`)

Provides calculation functions that:

- Lookup base speeds from interpolation tables
- Apply corrections for:
  - Flap setting (0° or 7°)
  - Runway condition (dry/wet/icy via RCR mapping)
  - Speed brake configuration (open/closed)

## Usage

### Basic Example

```typescript
import { calculateStandardSpeeds } from '@/utils/a10RotationCalculator'

// Calculate speeds for a 35,000 lb aircraft using flaps 0
const result = calculateStandardSpeeds(35000, 0)

console.log(`Rotation Speed: ${result.rotationSpeed} KIAS`)
console.log(`Refusal Speed: ${result.refusalSpeed} KIAS`)
// Output:
// Rotation Speed: 127 KIAS
// Refusal Speed: 100 KIAS
```

### Advanced Example with Custom Conditions

```typescript
import { calculateSpeeds } from '@/utils/a10RotationCalculator'

const result = calculateSpeeds({
  grossWeight: 38000, // lbs
  flapSetting: 7, // 7 degrees
  runwayCondition: 'wet', // wet runway (RCR 12)
  speedBrakes: 'closed', // speed brakes closed
})

console.log(`Rotation Speed: ${result.rotationSpeed} KIAS`)
console.log(`Refusal Speed: ${result.refusalSpeed} KIAS`)
console.log('Notes:', result.notes.join(', '))
```

## Chart Data Structure

The `speed_data.json` file contains:

```json
{
  "aircraft": "A-10A",
  "engines": "(2) TF34-GE-100/-100A",
  "source": "TO 1A-10A-1 Flight Manual, Pages 437, 446",
  "rotationSpeed": {
    "flaps0": {
      "table": [
        { "gw": 25.0, "speed": 108 },
        { "gw": 25.5, "speed": 109.7 },
        ...
      ]
    },
    "flaps7": {
      "table": [ ... ]
    }
  },
  "refusalSpeed": {
    "flaps0or7": {
      "speedBrakesOpen": {
        "gw30": [ ... ],
        "gw35": [ ... ],
        "gw40": [ ... ],
        "gw45": [ ... ]
      }
    }
  }
}
```

## Corrections Applied

### Rotation Speed Corrections

- **Flap Setting**: Different base speeds for flaps 0° vs 7° (flaps 7° ~2-3 KIAS higher)

### Refusal Speed Corrections

- **Runway Condition**: Different RCR values mapped to conditions
  - Dry: RCR 23
  - Wet: RCR 12
  - Icy: RCR 4
- **Speed Brakes Closed**:
  - Dry runway: -6% refusal speed
  - Wet runway: -3% refusal speed
  - Icy: No correction (not documented)

## Testing

Comprehensive unit tests validate:

- Correct speed calculations across weight range
- Application of all corrections
- Proper handling of different runway conditions and flap settings
- Edge cases and boundary conditions

Run tests:

```bash
pnpm test:unit a10RotationCalculator
```

## Data Ranges

- **Gross Weight**: 25,000 - 50,000 lbs (extrapolates beyond)
- **Rotation Speed**: ~108-157 KIAS (varies with weight/flaps)
- **Refusal Speed**: ~60-180 KIAS (varies with weight/conditions)
- **RCR Range**: 4-23 (4=ice, 12=wet, 23=dry)

## Important Notes

1. The digitized chart data is approximate and should be verified against actual flight manual charts for operational use
2. Charts are for "Max. or 3% below predicted fan speed"
3. Refusal speed chart assumes speed brakes open (100%) as baseline
4. If best single-engine rate-of-climb speed is used as takeoff speed, refusal speed remains unchanged
5. Standard conditions assume:
   - Flaps 0°
   - Dry runway
   - Speed brakes open
   - Max or 3% below predicted fan speed

## Chart Notes from Flight Manual

From Figure A2-2 (Rotation Speed):

- "Max. or 3% Below Predicted Fan Speed"
- "Takeoff distances for unimproved surfaces will be significantly increased and have not been substantiated by flight tests"

From Figure A2-11 (Refusal Speed):

- "Refusal speed obtained for RCR's less than 12 are estimated and have not been substantiated"
- "Takeoff distances for unimproved surfaces will be significantly increased and have not been substantiated by flight tests"
- "Check wheel brake energy limit speed, if lower than refusal speed, use limit speed"
- "With speed brakes closed, dry runway, decrease speed by 6%"
- "With speed brakes closed, wet runway, decrease speed by 3%"
- "If best single-engine rate-of-climb speed is used as takeoff speed, refusal speed remains unchanged"

## Integration with MDC Generator

The calculator is integrated into the mission editor and automatically calculates rotation and refusal speeds for A-10C missions based on:

- Calculated gross weight (empty + loadout + fuel)
- Default assumptions (flaps 0, dry runway, speed brakes open)

Values can be manually overridden if needed for specific conditions.

## Future Enhancements

Possible additions (not implemented):

- Temperature/altitude corrections
- Additional flap configurations
- Takeoff distance calculations
- Visual chart overlay for verification
- UI controls for flap setting, runway condition, and speed brake selection
