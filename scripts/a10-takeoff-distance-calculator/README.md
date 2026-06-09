# A-10C Takeoff Distance Calculator

This module calculates takeoff distance for the A-10C Thunderbolt II with TF34-GE-100A engines based on TO 1A-10C-1-1 Flight Manual performance charts.

## Overview

The calculator provides functions to determine:

- **Takeoff Index**: Based on temperature (°C) and pressure altitude
- **Takeoff Ground Run**: From the takeoff index and gross weight (Flaps 0° or 7°)
- **Critical Field Length**: For single-engine failure scenarios
- **Corrections**: Wind, slope, and RCR (Runway Condition Reading)

## Data Extraction Process

### 1. Chart Analysis and Digitization (`extract_regression.py`)

- Manually sampled data points from performance charts
- Fitted polynomial regression equations
- Achieved R² > 0.98 for all curves
- Generated coefficients saved in `regression_data.json`

Charts digitized:

- **Takeoff Index**: Temperature (°C), altitude → index
- **Takeoff Run - Flaps 0°**: Index, weight → distance with wind/slope corrections
- **Takeoff Run - Flaps 7°**: Index, weight → distance with wind/slope corrections
- **Critical Field Length**: Index, weight → CFL with wind/slope/RCR corrections

### 2. TypeScript Calculator (`src/utils/a10TakeoffDistanceCalculator.ts`)

Uses embedded polynomial regression equations to calculate takeoff distance:

- **No external data files needed** - coefficients are embedded in code
- Apply corrections for:
  - Flap setting (0° vs 7°)
  - Thrust setting (MAX vs 3% Below PTFS)
  - Runway slope (uphill/downhill)
  - Wind component (headwind/tailwind)
  - RCR for critical field length

## Usage

### Basic Example

```typescript
import { calculateStandardTakeoffDistance } from '@/utils/a10TakeoffDistanceCalculator'

// Calculate takeoff distance at standard conditions
// 40,000 lbs, 20°C, sea level, Flaps 0°
const result = calculateStandardTakeoffDistance(40000, 20, 0, 0)

console.log(`Takeoff Distance: ${result.takeoffDistance} feet`)
console.log(`Takeoff Index: ${result.takeoffIndex.toFixed(2)}`)
```

### Advanced Example with Custom Conditions

```typescript
import { calculateTakeoffDistance } from '@/utils/a10TakeoffDistanceCalculator'

const result = calculateTakeoffDistance({
  grossWeight: 45000, // lbs
  temperatureC: 30, // °C
  pressureAltitude: 2000, // ft
  flapSetting: 7, // 7 degrees
  thrustSetting: 'MAX', // or '3_BELOW_PTFS'
  runwaySlope: 1, // 1% uphill
  headwindComponent: 15, // 15 kt headwind
})

console.log(`Takeoff Distance: ${result.takeoffDistance} feet`)
console.log(`Base Distance: ${result.baseDistance} feet`)
console.log('Notes:', result.notes.join(', '))
```

### Critical Field Length

```typescript
import { calculateCriticalFieldLength } from '@/utils/a10TakeoffDistanceCalculator'

const result = calculateCriticalFieldLength({
  grossWeight: 45000, // lbs
  temperatureC: 25, // °C
  pressureAltitude: 1000, // ft
  thrustSetting: 'MAX',
  runwaySlope: 0,
  headwindComponent: 10,
  rcr: 12, // Wet runway
})

console.log(`Critical Field Length: ${result.criticalFieldLength} feet`)
console.log(`RCR Correction: ${(result.corrections.rcr * 100 - 100).toFixed(0)}%`)
```

### Wind Component Calculation

```typescript
import { calculateHeadwindComponent } from '@/utils/a10TakeoffDistanceCalculator'

// Wind from 270° at 20 knots, runway 36 (heading 360°)
const headwind = calculateHeadwindComponent(20, 270, 360)
// Returns approximately 0 (pure crosswind)

// Wind from 360° at 20 knots, runway 36
const directHeadwind = calculateHeadwindComponent(20, 360, 360)
// Returns 20 (full headwind)
```

## Calculation Method

### Takeoff Index

```text
index = 4.524 + 0.0405*temp_C + 0.597*alt_1000ft + 0.00621*temp_C*alt_1000ft
```

- Add 0.4 for 3% Below PTFS thrust setting
- Clamped to chart limits (4-11)

### Takeoff Ground Run

```text
distance_1000ft = c0 + c1*index + c2*index² + c3*weight_k + c4*weight_k² + c5*index*weight_k
```

Different coefficients for Flaps 0° and Flaps 7°

### Corrections Applied

| Correction | Formula              | Notes                                  |
| ---------- | -------------------- | -------------------------------------- |
| Wind       | Polynomial           | Headwind decreases, tailwind increases |
| Slope      | ~7% per 1% slope     | Uphill increases, downhill decreases   |
| RCR        | Factor (1.0/1.2/1.5) | Only for critical field length         |

## Flap Settings

| Setting  | Use Case                         |
| -------- | -------------------------------- |
| Flaps 0° | Normal operations, lower weights |
| Flaps 7° | High weight, hot/high conditions |

Flaps 7° provides approximately 10-15% reduction in takeoff distance.

## RCR (Runway Condition Reading)

| RCR | Condition | CFL Multiplier |
| --- | --------- | -------------- |
| 23  | Dry       | 1.0            |
| 12  | Wet       | 1.2 (+20%)     |
| 5   | Icy       | 1.5 (+50%)     |

## Weight Limits

- Minimum: 20,000 lbs (normal takeoff)
- Minimum: 30,000 lbs (critical field length)
- Maximum: 50,000 lbs

## Testing

Run tests:

```bash
pnpm test:unit a10TakeoffDistanceCalculator
```

## Notes

1. The digitized chart data is approximate and should be verified against actual flight manual charts for operational use
2. Standard conditions assume:
   - Maximum thrust
   - Level runway
   - Zero wind
   - Dry runway (RCR 23)
3. Temperature is in Celsius (°C), not Fahrenheit
4. Critical field length is always longer than normal takeoff distance
5. The calculator clamps inputs to valid chart ranges

## Differences from F-16 Calculator

| Feature               | A-10C        | F-16C              |
| --------------------- | ------------ | ------------------ |
| Temperature unit      | Celsius      | Fahrenheit         |
| Weight in calculation | Direct input | Via takeoff factor |
| Flap settings         | 0° / 7°      | N/A                |
| Drag index            | N/A          | Cumulative         |
| CG correction         | N/A          | Yes                |
| Pitch correction      | N/A          | 8° vs 10°          |
| Critical field length | Yes          | N/A                |
| RCR correction        | Yes          | N/A                |
