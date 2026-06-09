# DCS Airfield Data Extraction Guide

This guide explains how to extract complete airfield data (runways, TACANs, ILS, etc.) from DCS World terrains and process it into the JSON format used by the v303 MDC Generator.

## Overview

The extraction process has three main steps:

1. **Generate extraction missions** - Creates `.miz` files that run export scripts
2. **Run missions in DCS** - Executes the missions to export terrain data
3. **Process exports** - Converts raw DCS data into schema-compliant JSON files

## Prerequisites

### Software Requirements

- **DCS World** (any version)
- **Python 3.8+** with required packages:
  ```bash
  pip install pydcs jsonschema
  ```

### DCS Configuration

**IMPORTANT:** You must desanitize `MissionScripting.lua` to enable file I/O operations.

1. Locate your DCS installation:
   - Default: `C:\Program Files\Eagle Dynamics\DCS World\Scripts\MissionScripting.lua`
   - Steam: `C:\Program Files (x86)\Steam\steamapps\common\DCS World\Scripts\MissionScripting.lua`

2. Open `MissionScripting.lua` in a text editor (as Administrator)

3. Comment out these lines by adding `--` at the beginning:

   ```lua
   --do
   --    sanitizeModule('io')
   --    sanitizeModule('lfs')
   --    require = nil
   --    loadlib = nil
   --end
   ```

   **Note:** You do NOT need to desanitize the `os` module - the script uses `timer.getAbsTime()` instead.

4. Save the file

⚠️ **Warning:** This modification allows missions to access your file system. Only run missions from trusted sources.

## Step 1: Generate Extraction Missions

From the `scripts` directory, run:

```bash
# Generate missions for all terrains
python generate_extraction_missions.py

# Or generate for a specific terrain
python generate_extraction_missions.py --terrain Caucasus
```

### Available Terrains

- Afghanistan
- Caucasus
- Falklands
- GermanyCW (Germany Cold War)
- Iraq
- Kola
- MarianaIslands
- MarianaIslandsWWII (Marianas WWII)
- Nevada
- Normandy
- PersianGulf
- SinaiMap (Sinai)
- Syria
- TheChannel

Generated missions will be in `./extraction_missions/Extract_<TerrainName>.miz`

## Step 2: Run Missions in DCS

For each terrain you want to extract:

1. **Copy the mission file** from `extraction_missions/` to your DCS missions folder:
   - Default: `%USERPROFILE%\Saved Games\DCS\Missions\`

2. **Start DCS World**

3. **Load the mission**:
   - Main Menu → Mission → Single Mission
   - Select `Extract_<TerrainName>.miz`
   - Click "Fly"

4. **Wait for confirmation**:
   - You'll see a message: "Terrain export script loading..."
   - Wait ~5-10 seconds
   - You should see: "Export completed: XX airfields"
   - If you see errors, check the DCS log at `%USERPROFILE%\Saved Games\DCS\Logs\dcs.log`

5. **Exit the mission**

6. **Verify the export**:
   - Check for the file: `%USERPROFILE%\Saved Games\DCS\Logs\terrain_export_<TerrainName>.json`
   - The file should be 10KB-100KB depending on the terrain

## Step 3: Process Exports

After running the missions in DCS, you can process the exported JSON files directly from your DCS Logs folder or copy them to a local directory first.

### Process All Terrains

```bash
# Process directly from DCS Logs folder
python process_terrain_exports.py --input-dir "%USERPROFILE%\Saved Games\DCS\Logs"

# Or copy files first and process from local directory
cp "%USERPROFILE%\Saved Games\DCS\Logs\terrain_export_*.json" /path/to/exports/
python process_terrain_exports.py --input-dir /path/to/exports
```

This will:

- Look for all `terrain_export_*.json` files in the specified input directory
- Process each one and create corresponding JSON files in `../src/data/json/airfields/`

### Process Specific Terrain

```bash
python process_terrain_exports.py --input-dir /path/to/exports --terrain Caucasus
```

### Custom Output Directory

```bash
python process_terrain_exports.py \
  --input-dir /path/to/exports \
  --output-dir ../src/data/json/airfields
```

## What Gets Extracted

For each airfield, the following data is captured:

### Position

- Latitude/longitude (decimal degrees)
- Elevation (feet MSL)

### TACAN (if available)

- Channel number (1-126)
- Callsign (3 letters)
- Band (X or Y)

### Runways

Each runway end includes:

- Name (e.g., "09", "27")
- Magnetic heading (0-359°)
- ILS data (if equipped):
  - Callsign
  - Frequency (MHz)
  - Channel (if applicable)
  - Transmitter position

### Radio

ATC frequencies extracted from `Mods/terrains/<map>/Radio.lua` and emitted as a
facility-by-band matrix per airfield:

- **Facilities**: `ground`, `tower`, `approach`, `departure`, `atis`, or any
  other role string the terrain file declares
- **Bands**: `uhf` (225–400 MHz), `vhfAm` (108–174 MHz), `vhfFm` (30–88 MHz),
  `hf` (2–30 MHz) — classified by frequency range, robust to whichever band
  constants the source file uses
- **Callsign**: localized ATC callsign from Radio.lua (`callsign` field)

Airfields whose Radio.lua entry is missing or has an empty `frequency = {}`
come through as `radio: null` (this happens for a small number of airfields,
notably Bandar-e-Jask on Persian Gulf).

## Data Format

The output JSON follows this schema:

```json
[
  {
    "name": "Batumi",
    "position": {
      "latitude": 41.603279859649,
      "longitude": 41.60927548351,
      "elevation": 33
    },
    "tacan": {
      "channel": 16,
      "callsign": "BTM",
      "band": "X"
    },
    "runways": [
      {
        "name": "31",
        "heading": 306,
        "ils": {
          "name": "ILU",
          "frequency": "110.3",
          "channel": null,
          "position": {
            "latitude": 41.601731,
            "longitude": 41.612203
          }
        }
      },
      {
        "name": "13",
        "heading": 126,
        "ils": null
      }
    ],
    "radio": {
      "callsign": "Batumi",
      "frequencies": {
        "ground": { "uhf": 260.0, "vhfAm": 131.0, "vhfFm": 40.4, "hf": 4.25 },
        "tower": { "uhf": 260.0, "vhfAm": 131.0, "vhfFm": 40.4, "hf": 4.25 },
        "approach": { "uhf": 260.0, "vhfAm": 131.0, "vhfFm": 40.4, "hf": 4.25 }
      }
    }
  }
]
```

## Validation

The processor automatically validates all generated files against the schema at:
`../src/data/json/schemas/airfields.schema.json`

If validation fails, error messages will indicate:

- Which terrain file has issues
- What field caused the error
- The expected format

## Troubleshooting

### "No export files found"

- Make sure you ran the missions in DCS
- Verify the `--input-dir` path points to the directory containing the `terrain_export_*.json` files
- Check `%USERPROFILE%\Saved Games\DCS\Logs\` for the exported files
- Verify MissionScripting.lua is desanitized

### "Failed to get airbases" in DCS

- The MOOSE framework may not have loaded
- Check `dcs.log` for error messages
- Ensure the mission file contains both `Moose.lua` and `export_terrain_data.lua`

### "beacons.lua not found" warning in DCS log

- This is expected for WWII terrains (Normandy, TheChannel, MarianasWWII)
- Modern terrains should find beacons automatically
- Check that terrain name mapping is correct in `export_terrain_data.lua`

### Validation errors

- The schema is very strict about data types
- Common issues:
  - Headings must be integers (0-359)
  - TACAN frequency is now deprecated (use channel/band)
  - ILS can be `null` or a complete object (partial ILS data not allowed)

## Files Overview

```text
scripts/
├── generate_extraction_missions.py    # Creates .miz mission files
├── process_terrain_exports.py         # Converts DCS exports to JSON
├── custom_terrains.py                 # Terrain definitions for pydcs
├── dcs_export/
│   ├── export_terrain_data.lua        # Lua script that runs in DCS
│   └── Moose.lua                      # MOOSE framework library
└── extraction_missions/               # Generated .miz files (gitignored)
    └── Extract_*.miz
```

## Current Status

As of the last extraction (October 2025):

| Terrain            | Airfields | TACANs | ILS     |
| ------------------ | --------- | ------ | ------- |
| Afghanistan        | 28        | 9      | 2       |
| Caucasus           | 21        | 7      | 11      |
| Falklands          | 27        | 2      | 10      |
| GermanyCW          | 201       | 18     | 26      |
| Iraq               | 19        | 7      | 11      |
| Kola               | 33        | 4      | 16      |
| MarianaIslands     | 8         | 1      | 5       |
| MarianaIslandsWWII | 11        | 0      | 0       |
| Nevada             | 17        | 3      | 11      |
| Normandy           | 82        | 0      | 0       |
| PersianGulf        | 30        | 8      | 14      |
| SinaiMap           | 56        | 4      | 56      |
| Syria              | 211       | 4      | 33      |
| TheChannel         | 12        | 0      | 0       |
| **Total**          | **756**   | **67** | **195** |

## Notes

- WWII terrains (Normandy, TheChannel, MarianasWWII) have no navigation aids as expected
- Some airfields are FARPs/heliports and have no runways
- Runway headings are magnetic (not true)
- The export captures DCS's current terrain data; updates to DCS may require re-extraction
- TACAN frequencies can be calculated from channel/band but are not stored in the JSON

## Re-extracting Data

To update the airfield data after a DCS update:

1. Regenerate missions: `python generate_extraction_missions.py`
2. Run all missions in DCS (or just the terrains that changed)
3. Process the new exports: `python process_terrain_exports.py`
4. Commit the updated JSON files to the repository

The extraction process is idempotent - running it multiple times produces identical results.
