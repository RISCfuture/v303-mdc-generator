# DCS Datamine

This directory contains tools to extract weapon and aircraft data directly from DCS World,
eliminating dependency on third-party data repositories.

## Overview

The datamine system consists of two components:

1. **DCS Hook Script** (Windows) - Runs at DCS launch and exports game data to JSON
2. **Integration Script** (Mac/Node.js) - Processes exported JSON into project format

## Setup

### Windows: Install DCS Hook

1. Copy the hook file to your DCS Scripts/Hooks directory:

   ```
   hooks/v303-datamine-hook.lua → DCS World\Scripts\Hooks\
   ```

   The typical path is:
   ```
   C:\Program Files\Eagle Dynamics\DCS World\Scripts\Hooks\
   ```

2. Launch DCS World

3. The hook automatically exports data when:
   - First time running with the hook installed
   - DCS version changes (after updates)

4. Find exported files at:
   ```
   %USERPROFILE%\Saved Games\DCS\v303-datamine\
   ```

   You should see:
   - `launchers.json` - All weapons/munitions data
   - `aircraft.json` - All flyable aircraft data
   - `version.txt` - DCS version marker (for change detection)

### Mac: Run Integration Script

1. Copy the exported files from Windows to a location accessible from your Mac
   (e.g., via Dropbox, network share, or USB drive)

2. Run the integration script with the path to the export directory:

   ```bash
   node scripts/dcs-datamine/integrate-dcs-export.js <path-to-export-dir>
   ```

   For example:
   ```bash
   node scripts/dcs-datamine/integrate-dcs-export.js ~/Dropbox/DCS/v303-datamine
   ```

3. The script generates:
   - `src/data/json/munitions.json`
   - `src/data/json/airframes/*.json`

## Workflow

### After DCS Updates

1. **Windows**: Launch DCS World
   - The hook detects the new version and automatically re-exports
   - Check `Saved Games\DCS\v303-datamine\` for updated JSON files

2. **Transfer Files**: Copy the `v303-datamine` folder (or sync via Dropbox/etc.)

3. **Mac**: Run the integration script with the path to the exported data
   ```bash
   node scripts/dcs-datamine/integrate-dcs-export.js /path/to/v303-datamine
   ```

4. **Review & Commit**: Check the generated files for changes, then commit

## File Structure

```
scripts/dcs-datamine/
├── hooks/
│   └── v303-datamine-hook.lua    # DCS hook (copy to DCS installation)
├── integrate-dcs-export.js       # Integration script
└── README.md                     # This file
```

## Export Format

### launchers.json

```json
{
  "version": "2.9.x.xxxxx",
  "exportTime": "2024-01-01T12:00:00",
  "count": 1820,
  "launchers": {
    "{CLSID}": {
      "displayName": "Weapon Name",
      "weight": 123.45,
      "weightEmpty": 50.0,
      "attribute": [1, 3, 43],
      "category": 1
    }
  }
}
```

### aircraft.json

```json
{
  "version": "2.9.x.xxxxx",
  "exportTime": "2024-01-01T12:00:00",
  "count": 31,
  "aircraft": {
    "A-10C_2": {
      "aircraft": "A-10C_2",
      "displayName": "A-10C II Thunderbolt",
      "M_empty": 12000,
      "M_max": 23000,
      "M_fuel_max": 5000,
      "passivCounterm": {...},
      "radios": [...],
      "guns": [...],
      "ammoTypes": [...],
      "stations": [...]
    }
  }
}
```

## Override System

The integration script applies overrides from:

- `src/data/json/munitions-overrides.json` - Munitions corrections
- `src/data/json/airframe-overrides/*.json` - Per-aircraft corrections

Overrides are applied after processing the DCS export, allowing manual corrections
without modifying the extraction process.

## Troubleshooting

### Hook doesn't export

1. Check DCS logs at `Saved Games\DCS\Logs\dcs.log`
2. Search for "V303_DATAMINE" to see hook messages
3. Ensure the hook file is in the correct directory

### Missing data

The hook only exports flyable aircraft (player-controllable). AI-only aircraft
are excluded. Similarly, only weapons with valid CLSIDs are exported.

### Integration errors

If the integration script reports missing CLSIDs, these weapons exist in the
aircraft configuration but not in the launcher database. This can happen with
mod-specific weapons or removed items. The script filters these automatically.

## Technical Details

### Data Sources

The hook accesses these DCS global tables:

- `_G.launcher` - All weapon/launcher definitions indexed by CLSID
- `_G.db.Units.Planes.Plane` - Aircraft definitions

### Version Detection

The hook stores the DCS version in `version.txt`. On each launch, it compares
the current version to the stored version. Export only occurs when versions differ,
preventing unnecessary re-exports on every DCS launch.

### Weight Units

- DCS stores weights in **kilograms**
- The integration script converts to **pounds** (using factor 2.20462)
- Final JSON files contain weights in pounds
