# F-16C Takeoff Distance Calculator

This module calculates takeoff distance for the F-16C with F110-GE-129 engine based on TO GR1F-16CJ-1-1 Supplemental Flight Manual performance charts.

## Overview

The calculator provides functions to determine:
- **Takeoff Factor**: Based on temperature and pressure altitude
- **Base Takeoff Distance**: From the takeoff factor
- **Corrected Takeoff Distance**: Applying corrections for CG, drag index, slope, wind, and pitch attitude

## Data Extraction Process

### 1. Chart Analysis and Digitization (`extract_regression.py`)
- Manually sampled data points from performance charts (Figures B2-1 and B2-3)
- Fitted polynomial regression equations
- Achieved R² > 0.98 for all curves
- Generated coefficients saved in `regression_data.json`

Charts digitized:
- **Figure B2-1**: Takeoff Factor (temperature, altitude → factor)
- **Figure B2-3**: Takeoff Distance (factor + corrections → distance)
- **Drag Index Tables**: Store drag indexes for CLSID mapping

### 2. TypeScript Calculator (`src/utils/f16TakeoffDistanceCalculator.ts`)
Uses embedded polynomial regression equations to calculate takeoff distance:
- **No external data files needed** - coefficients are embedded in code
- Apply corrections for:
  - Power setting (MIL vs AB)
  - Center of gravity position
  - Drag index (stores configuration)
  - Runway slope (upslope/downslope)
  - Wind component (headwind/tailwind)
  - Pitch attitude (10° vs 8°)

## Usage

### Basic Example

```typescript
import { calculateStandardTakeoffDistance } from '@/utils/f16TakeoffDistanceCalculator'

// Calculate takeoff distance at standard conditions
// 30,000 lbs, 70°F, sea level, AB power
const result = calculateStandardTakeoffDistance(30000, 70, 0, 'AB')

console.log(`Takeoff Distance: ${result.takeoffDistance} feet`)
console.log(`Takeoff Factor: ${result.takeoffFactor.toFixed(2)}`)
```

### Advanced Example with Custom Conditions

```typescript
import { calculateTakeoffDistance } from '@/utils/f16TakeoffDistanceCalculator'

const result = calculateTakeoffDistance({
  grossWeight: 32500,           // lbs
  temperatureF: 85,             // °F
  pressureAltitude: 2000,       // ft
  powerSetting: 'AB',
  cgPercent: 37,                // 37% MAC (forward of baseline)
  dragIndex: 50,                // loaded with stores
  runwaySlope: 0.5,             // 0.5% upslope
  headwindComponent: 10,        // 10 kt headwind
  pitchAttitude: 10,            // 10 degrees
})

console.log(`Takeoff Distance: ${result.takeoffDistance} feet`)
console.log(`Base Distance: ${result.baseDistance} feet`)
console.log('Notes:', result.notes.join(', '))
```

### Drag Index Lookup

```typescript
import { getDragIndex, calculateTotalDragIndex } from '@/utils/f16TakeoffDistanceCalculator'

// Get drag index for a specific weapon
const aim9DragIndex = getDragIndex('{AIM-9M}')  // returns 4

// Calculate total drag index for a loadout
const totalDragIndex = calculateTotalDragIndex([
  { clsid: '{AIM-9M}' },
  { clsid: '{AIM-9M}' },
  { clsid: '{GBU-12}' },
  { clsid: '{GBU-12}' },
  { clsid: '{AN_AAQ-28_LITENING}' },
])
// Returns: 7 (clean) + 4 + 4 + 5 + 5 + 3 = 28
```

## Calculation Method

### Takeoff Factor (Figure B2-1)
```
AB Factor = 1.110 + 0.00631*temp_F + 0.172*alt_1000ft + 0.000968*temp_F*alt_1000ft
MIL Factor = AB Factor * 1.76  (from manual: 2.54/1.44)
```

### Base Takeoff Distance (Figure B2-3)
```
Distance (1000 ft) = 0.141*factor² + 1.369*factor + 0.242
```

### Corrections Applied
| Correction | Formula | Notes |
|------------|---------|-------|
| CG | 3% per 1% from 35% MAC | Forward increases distance |
| Drag Index | Polynomial (0.0001*DI² + 0.07*DI) | From clean baseline |
| Slope | 5% per 1% slope | Upslope increases distance |
| Wind | Polynomial (asymmetric) | Headwind decreases distance |
| Pitch | +18% for 8° vs 10° | 8° increases distance |

## Drag Index Reference

### Clean Aircraft
- Clean F-16C drag index: **7**

### Common Stores
| Store | Drag Index |
|-------|-----------|
| AIM-9L/M/X | 4 |
| AIM-120B | 0 |
| AIM-120C | 4 |
| AGM-65 Maverick | 13 |
| AGM-88 HARM | 10 |
| Mk-82 | 7 |
| Mk-82 AIR | 11 |
| Mk-84 | 10 |
| GBU-12 | 5 |
| GBU-10 | 15 |
| GBU-24 | 17-20 |
| GBU-31/38 JDAM | 8-12 |
| CBU-87/97 | 18-20 |
| LITENING/Sniper | 3 |
| ALQ-184 ECM | 10-12 |
| 300 gal tank (full) | 18 |
| 370 gal tank | 27 |
| 600 gal tank | 20 |

## Testing

Run tests:
```bash
yarn test:unit f16TakeoffDistanceCalculator
```

## Notes

1. The digitized chart data is approximate and should be verified against actual flight manual charts for operational use
2. Standard conditions assume:
   - 35% MAC CG
   - Clean aircraft (drag index 7)
   - Level runway
   - Zero wind
   - 10° pitch attitude
3. MIL power takeoff distances are approximately 1.8-2x longer than AB due to reduced thrust (varies with conditions)
4. Drag index is cumulative - add the drag index of each store to the clean aircraft baseline

## Future Enhancements

- Integration with loadout configuration for automatic drag index calculation
- Visual display of takeoff distance on mission planning maps
- Runway length validation (warn if takeoff distance exceeds available runway)
