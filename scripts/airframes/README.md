# Airframe Data Extraction

This document describes how to extract airframe configuration data from the Quaggles DCS Lua Datamine repository.

## Overview

The `generate-airframes.js` script automatically fetches aircraft data from the [Quaggles DCS Lua Datamine](https://github.com/Quaggles/dcs-lua-datamine) repository and generates JSON files containing:

- Aircraft weights (empty weight, max takeoff weight)
- Internal fuel capacity
- Countermeasures (CMDS) configuration
- Radio configurations with frequency ranges
- Station/pylon configurations with munition CLSIDs

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
   node scripts/generate-airframes.js
   ```

## Output

The script will:

1. Discover all aircraft files from the Quaggles repository
2. Process each aircraft file to extract relevant data
3. Skip non-flyable (AI-only) aircraft
4. Generate individual JSON files for each flyable aircraft

**Output location:** `src/data/json/airframes/*.json`

Each aircraft gets its own JSON file named after its aircraft ID (e.g., `A-10C.json`, `F-16C_50.json`).

## Console Output

During execution, you'll see:

- 📦 Aircraft being processed
- ✓ Successfully extracted aircraft with summary stats
- ⚠️ Aircraft with insufficient data (skipped)
- ⏭️ Non-flyable aircraft (skipped)
- 📊 Final summary with success/skip counts

Example output:
```
🚀 Generating airframe configurations from Quaggles DCS Lua Datamine
======================================================================

📂 Discovering aircraft files from GitHub API...
📊 Found 150 aircraft files

📦 Processing A-10C...
  ✓ A-10C Thunderbolt II
    Weight: 29000 lbs (empty), 50000 lbs (max)
    Fuel: 10000 lbs
    CMDS: 480 (chaff: 240, flare: 240)
    Radios: 3
    Stations: 11

...

======================================================================
✅ Generated 45 airframe files
⏭️  Skipped 105 aircraft (insufficient data)
📁 Output directory: src/data/json/airframes/
```

## Data Structure

Each generated JSON file contains:

```json
{
  "aircraft": "A-10C",
  "displayName": "A-10C Thunderbolt II",
  "emptyWeight": 29000,
  "maxTakeoffWeight": 50000,
  "internalFuel": 10000,
  "cmdsCapacity": 480,
  "chaffIncrement": 1,
  "flareIncrement": 1,
  "defaultChaff": 240,
  "defaultFlare": 240,
  "defaultJoker": 4000,
  "defaultBingo": 2500,
  "radios": [
    {
      "name": "COM 1",
      "description": "UHF Radio",
      "presetCount": 20,
      "min": 225.0,
      "max": 399.975,
      "step": 0.025
    }
  ],
  "stations": [
    {
      "station": 1,
      "name": "Station 1",
      "munitions": ["CLSID_1", "CLSID_2", "..."]
    }
  ]
}
```

## Filtering Criteria

The script only generates files for aircraft that:

1. Are marked as flyable (`_file_flyable` in Lua data)
2. Have a non-zero empty weight
3. Have at least one station/pylon with munitions

## Rate Limiting

The script includes a 100ms delay between processing each aircraft to avoid GitHub API rate limiting.

## Troubleshooting

### "Failed to fetch data" errors

- Check your internet connection
- Verify the Quaggles repository is accessible
- GitHub API may be temporarily unavailable

### No files generated

- Ensure the output directory exists or can be created
- Check file permissions in the `src/data/json/airframes/` directory

### Incomplete data

Some aircraft may have incomplete data in the Lua files. The script will skip these and report them in the summary.

## Updating Airframe Data

To update airframe data after DCS updates:

1. Wait for the Quaggles repository to be updated with new DCS data
2. Re-run the script: `node scripts/generate-airframes.js`
3. Review the console output for any new or changed aircraft
4. Commit the updated JSON files to the repository

## Additional Notes

- All weights are converted from kilograms to pounds
- Radio frequencies are in MHz
- CLSID (Computer Launch System Identifier) codes uniquely identify weapons and stores
- Default fuel levels (joker/bingo) are set based on aircraft category (fighter/attacker/heavy)
