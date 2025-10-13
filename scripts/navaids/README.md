# Navaid Database Pipeline

Complete pipeline for building comprehensive navaid databases for DCS World theatres, combining data from three sources:
1. **v303 FG Website** (manually curated tactical navaids)
2. **DCS World Beacons** (navigation beacons from game files)
3. **DCS World Towns** (populated areas from game files)

## Overview

The pipeline consists of three scripts that must be run in order:

1. **`scrape_navaids.py`** - Scrapes tactical navaid data from v303rdfightergroup.com
2. **`extract_beacons_towns.py`** - Extracts beacons and towns from DCS World installation (run on gaming PC)
3. **`merge_beacons_towns.py`** - Merges all data sources and adds elevation data

## Requirements

```bash
# For scraping and merging (local Mac/Linux)
pip install requests beautifulsoup4 srtm.py

# For extraction on Windows gaming PC
pip install lupa
```

**Note**: `lupa` requires LuaJIT. On Windows, it's available as a pre-built wheel.

---

## Step 1: Scrape v303 FG Website Data

**Location**: Run locally on your development machine

**Purpose**: Downloads manually curated tactical navaids from the v303 FG website

### Usage

```bash
# Scrape all theatres
python scrape_navaids.py

# Scrape specific theatre
python scrape_navaids.py --theatre Nevada

# Custom output directory
python scrape_navaids.py --output-dir /path/to/output
```

### Available Theatres

`Nevada`, `MarianaIslands`, `Syria`, `Afghanistan`, `GermanyCW`

### Output

Writes JSON files to `src/data/json/navaids/` with format:

```json
[
  {
    "name": "ACOSU",
    "latitude": 36.568928,
    "longitude": -114.821733,
    "elevation": 2431
  }
]
```

### Features

- **Multi-format parser**: Handles Google Sheets embedded, JavaScript JSON objects, and HTML tables
- **Local DEM elevations**: Uses SRTM/NASA data (cached in `~/.cache/srtm`)
- **Coordinate conversion**: Converts degrees/decimal minutes to decimal degrees

---

## Step 2: Extract Beacons & Towns from DCS World

**Location**: Run on Windows gaming PC with DCS World installed

**Purpose**: Extracts navigation beacons and populated town locations from DCS World Lua files

### Usage

```bash
# Extract all theatres (default DCS location)
python extract_beacons_towns.py

# Custom DCS directory
python extract_beacons_towns.py --dcs-dir "D:\DCS World"

# Extract specific theatre
python extract_beacons_towns.py --theatre Caucasus

# Custom output directory
python extract_beacons_towns.py --output-dir ./output
```

### Default Paths

- **DCS Directory**: `C:\Program Files\Eagle Dynamics\DCS World`
- **Beacons**: `{dcs-dir}\mods\terrains\{terrain}\beacons.lua`
- **Towns**: `{dcs-dir}\mods\terrains\{terrain}\map\towns.lua`

### Output

Creates one JSON file per terrain combining beacons and towns:

```json
[
  {
    "name": "HAM",
    "latitude": 53.685493,
    "longitude": 10.205137,
    "elevation": null
  },
  {
    "name": "Berlin",
    "latitude": 52.517036,
    "longitude": 13.388860,
    "elevation": null
  }
]
```

**Note**: Elevation is set to `null` - this will be populated in Step 3.

### Features

- **Lua parsing**: Uses `lupa` library to safely execute DCS Lua files
- **Combined output**: Merges beacons and towns into single file
- **Auto-discovery**: Scans DCS installation for all available theatres
- **Cross-platform**: Works on Windows, macOS, and Linux
- **All beacon types**: Includes VOR, VORTAC, TACAN, ILS, NDB, etc.

### Transfer Files

After running on gaming PC, transfer the output JSON files to your development machine (e.g., via Dropbox, USB drive, etc.)

---

## Step 3: Merge Data & Add Elevations

**Location**: Run locally on your development machine

**Purpose**: Merges extracted DCS data with scraped website data and populates elevation information

### Usage

```bash
# Merge files from directory
python merge_beacons_towns.py --input-dir ~/Dropbox

# Custom output location
python merge_beacons_towns.py --input-dir ./extracted --output-dir ./output
```

### Required Arguments

- `--input-dir`: Directory containing extracted JSON files from Step 2

### Optional Arguments

- `--output-dir`: Output directory (default: `src/data/json/navaids`)

### Merge Logic

For each theatre:
1. Load extracted beacons/towns from input directory
2. Load existing scraped navaids from output directory (if exists)
3. **Merge strategy**:
   - If name exists in destination: **overwrite** with new beacon/town data
   - If name doesn't exist: **add** new entry
   - Keep all scraped navaids that don't have matching names
4. Fetch elevations using SRTM for entries with `elevation: null`
5. Sort by name and write final JSON

### Terrain Name Mapping

The script automatically maps DCS directory names to internal names:

| Directory Name | Internal DCS Name |
|---|---|
| `GermanyColdWar` | `GermanyCW` |
| `Sinai` | `SinaiMap` |
| `MarianasWWII` | `MarianaIslandsWWII` |
| All others | Same name |

### Output

Final merged JSON files in `src/data/json/navaids/`:

```json
[
  {
    "name": "ACOSU",
    "latitude": 36.568928,
    "longitude": -114.821733,
    "elevation": 2431
  },
  {
    "name": "Las Vegas",
    "latitude": 36.166286,
    "longitude": -115.149225,
    "elevation": 2034
  }
]
```

---

## Complete Example Workflow

```bash
# On development machine: Step 1
cd scripts/navaids
python scrape_navaids.py

# On gaming PC: Step 2
python extract_beacons_towns.py
# Copy output files to ~/Dropbox (or transfer method of choice)

# On development machine: Step 3
python merge_beacons_towns.py --input-dir ~/Dropbox
```

---

## Current Data

After running the complete pipeline (as of last run):

| Theatre | Total Entries | Sources |
|---------|--------------|---------|
| Afghanistan | 1,238 | Scraped + DCS |
| Caucasus | 1,807 | Scraped + DCS |
| Falklands | 1,347 | DCS only |
| Iraq | 310 | Scraped + DCS |
| MarianaIslands | 90 | Scraped + DCS |
| MarianaIslandsWWII | 22 | DCS only |
| Nevada | 255 | Scraped + DCS |
| Normandy | 1,282 | DCS only |
| Syria | 1,134 | Scraped + DCS |
| TheChannel | 1,311 | DCS only |

---

## Schema

All output conforms to `src/data/json/schemas/navaids.schema.json`:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["name", "latitude", "longitude", "elevation"],
    "properties": {
      "name": {"type": "string"},
      "latitude": {"type": "number", "minimum": -90, "maximum": 90},
      "longitude": {"type": "number", "minimum": -180, "maximum": 180},
      "elevation": {"type": "number"}
    }
  }
}
```

---

## Data Sources

1. **v303rd Fighter Group Website**: https://www.v303rdfightergroup.com/index.php?pages/navaids/
2. **DCS World Beacons**: `{DCS}\mods\terrains\*\beacons.lua`
3. **DCS World Towns**: `{DCS}\mods\terrains\*\map\towns.lua`
4. **Elevations**: SRTM/NASA Digital Elevation Model

---

## Troubleshooting

### Step 1 Issues

- **No DEM library found**: Install `srtm.py` with `pip install srtm.py`
- **Network errors**: Check internet connection and v303fg.com availability
- **Parse failures**: Website format may have changed - file an issue

### Step 2 Issues

- **lupa not installed**: Run `pip install lupa` on gaming PC
- **No theatres found**: Check `--dcs-dir` points to correct DCS World installation
- **Lua parse errors**: Beacon type constants may need updating

### Step 3 Issues

- **No JSON files found**: Verify `--input-dir` contains .json files from Step 2
- **Elevation warnings**: Some coordinates may be outside SRTM coverage (oceans, polar regions)
- **Merge conflicts**: Script prefers extracted data over scraped data for matching names

---

## Notes

- The v303rd Fighter Group (v303 FG) consists of the v303rd Fighter Squadron (v303 FS, A-10C) and the V93rd Fighter Squadron (v93 FS, F-16C)
- Waypoints are locations (lat/lon + altitude) in a navigation database
- Steerpoints are waypoints that are part of a flight plan
- Elevation data uses meters internally but outputs feet to match aviation standards
- SRTM data is cached locally after first download for faster subsequent runs
