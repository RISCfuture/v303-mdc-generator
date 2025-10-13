# Munitions Data Extraction

This document describes how to extract munitions data from the Quaggles DCS Lua Datamine repository.

## Overview

The `generate-munitions.js` script automatically fetches ALL weapon and launcher data from the [Quaggles DCS Lua Datamine](https://github.com/Quaggles/dcs-lua-datamine) repository and generates a comprehensive munitions database containing:

- Air-to-air missiles
- Air-to-ground missiles and bombs
- Rocket pods
- Fuel tanks (with calculated fuel weights)
- Targeting and ECM pods
- Weapon racks and launchers

Each munition is identified by its CLSID (Computer Launch System Identifier), which is a stable identifier used by DCS.

## Prerequisites

- Node.js (version 18 or later)
- Yarn package manager
- Internet connection (to fetch data from GitHub)

## Running the Script

1. **Navigate to the project directory:**
   ```bash
   cd /path/to/v303-mdc-generator
   ```

2. **Install dependencies** (if not already done):
   ```bash
   yarn install
   ```

3. **Run the extraction script:**
   ```bash
   node scripts/generate-munitions.js
   ```

## Output

The script will:

1. Discover all launcher/weapon files from the Quaggles repository
2. Process each file to extract munition data (name, weight, category)
3. Calculate additional fuel weights for fuel tanks
4. Generate a single comprehensive `munitions.json` file

**Output location:** `src/data/json/munitions.json`

## Execution Time

⚠️ **This script processes ALL munitions in DCS (typically 1000+ files) and may take several minutes to complete.**

The script includes:
- Progress indicators every 50 files
- Rate limiting delays to avoid GitHub throttling
- Smart caching to reduce redundant requests

## Console Output

During execution, you'll see:

- 📂 Discovery of launcher files
- 📊 Total file count
- 📈 Progress updates every 50 files
- ✓ Successfully extracted munitions (those with weight data)
- 🔧 Fuel weight calculations
- 📊 Final summary with category breakdown

Example output:
```
🚀 Generating comprehensive munitions.json from Quaggles DCS Lua Datamine
======================================================================
⚠️  This will fetch ALL munitions from the DCS data mine
⚠️  This may take several minutes...

📂 Discovering launcher files from GitHub API...
📊 Found 1247 launcher files

  ✓ AIM-120C AMRAAM (335 lbs) [air-to-air]
  ✓ AGM-65D Maverick (485 lbs) [air-to-ground]
  ✓ GBU-12 Paveway II (610 lbs) [air-to-ground]
📈 Progress: 50/1247 files processed...
  ✓ F-16 370 gal Tank (2479 lbs) [fuel]
📈 Progress: 100/1247 files processed...
...

🔧 Calculating additional fuel weights for fuel tanks...
  ✓ F-16 370 gal Tank: 2479 lbs fuel (370 gal × 6.7)
  ✓ A-10C 600 gal Tank: 4020 lbs fuel (600 gal × 6.7)

======================================================================
✅ Generated 1247 munitions
📝 Written to: src/data/json/munitions.json

📊 Munitions by category:
   air-to-air: 87
   air-to-ground: 453
   fuel: 42
   pod: 28
   rack: 637

💡 Tip: Review munitions with weight: 0 - these may need manual updates
```

## Data Structure

The generated `munitions.json` file is a dictionary indexed by CLSID:

```json
{
  "EMPTY": {
    "id": "EMPTY",
    "name": "(empty)",
    "shortName": "Empty",
    "weight": 0,
    "category": "empty"
  },
  "{CLSID-123}": {
    "id": "{CLSID-123}",
    "name": "AIM-120C AMRAAM",
    "shortName": "120C AMRAAM",
    "weight": 335,
    "category": "air-to-air"
  },
  "{FUEL-TANK-123}": {
    "id": "{FUEL-TANK-123}",
    "name": "F-16 370 gal Tank",
    "shortName": "370 gal Tank",
    "weight": 2479,
    "category": "fuel",
    "additionalFuel": 2479
  }
}
```

### Field Descriptions

- **id**: CLSID (unique identifier)
- **name**: Full display name from DCS
- **shortName**: Simplified name (prefixes removed)
- **weight**: Total weight in pounds
- **category**: Munition type (`air-to-air`, `air-to-ground`, `fuel`, `pod`, `rack`, `empty`)
- **additionalFuel**: (Fuel tanks only) Weight of fuel alone in pounds

## Munition Categories

The script automatically categorizes munitions:

- **air-to-air**: AIM-9, AIM-120, R-27, R-73, R-77, MICA, Magic, etc.
- **air-to-ground**: AGM-65, AGM-88, Hellfires, GBU series, Mk-82/84, FAB series, etc.
- **fuel**: External fuel tanks (with fuel weight calculations)
- **pod**: Targeting pods (Litening, Sniper), ECM pods, ACMI pods
- **rack**: Weapon racks (BRU, TER, MER), pylons, rocket launchers (LAU-68, B-8, etc.)
- **empty**: Special entry for empty stations

## Fuel Weight Calculations

For fuel tanks, the script attempts to calculate the weight of fuel alone (not including tank weight):

1. **Empty/Full Matching**: Finds matching empty and full tank pairs and calculates fuel weight by subtraction
2. **Gallonage Parsing**: Extracts gallon amount from tank name and calculates weight (JP-8 fuel = 6.7 lb/gal)

Tanks with calculated fuel weights include the `additionalFuel` field.

## Troubleshooting

### Script takes a very long time

- This is normal - the script processes 1000+ files
- Progress indicators appear every 50 files
- Expected runtime: 5-15 minutes depending on network speed

### "Failed to fetch" errors

- Check your internet connection
- Verify the Quaggles repository is accessible
- GitHub may be temporarily rate-limiting requests
- Try running again after a few minutes

### Missing munitions

Some munitions may have zero weight or incomplete data in the source Lua files. These are still included in the output but may need manual review.

### Rate limiting

The script includes automatic delays to avoid GitHub rate limiting. If you encounter 429 errors, wait a few minutes before retrying.

## Updating Munitions Data

To update munitions data after DCS updates:

1. Wait for the Quaggles repository to be updated with new DCS data
2. Re-run the script: `node scripts/generate-munitions.js`
3. Review the console output for:
   - New munitions added
   - Changed weights or categories
   - Munitions with zero weight (may need manual updates)
4. Commit the updated `munitions.json` file to the repository

## Additional Notes

- All weights are converted from kilograms to pounds
- CLSIDs are stable identifiers that persist across DCS versions
- The script creates a special `EMPTY` entry for empty weapon stations
- Short names are auto-generated by removing common prefixes (AGM-, AIM-, GBU-, etc.)
- Fuel calculations assume JP-8 fuel density (6.7 lb/gal)
- Rocket pods and launchers are categorized as "rack" for simplicity

## Performance Tips

- Run the script during off-peak hours for faster GitHub access
- Consider running overnight if bandwidth is limited
- The script outputs progress every 50 files so you can monitor completion
- Generated file is typically 100-200 KB in size

## Data Quality

After generation, review:

1. **Zero-weight munitions**: `cat src/data/json/munitions.json | jq '.[] | select(.weight == 0)'`
2. **Category distribution**: Shown in console output summary
3. **Fuel tanks**: Verify `additionalFuel` field is present where expected

Common issues requiring manual fixes:
- Munitions with zero weight (missing Weight field in Lua)
- Incorrectly categorized items
- Fuel tanks without calculated fuel weights
