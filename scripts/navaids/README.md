# Navaid Database Pipeline

Complete pipeline for building comprehensive navaid databases for DCS World theatres, combining data from three sources:

1. **DCS World Beacons** (navigation beacons from game files)
2. **DCS World Towns** (populated areas from game files)
3. **v303 FG Website** (manually curated tactical navaids)

## Overview

The pipeline consists of three scripts that must be run in order:

1. **`extract_beacons_towns.py`** - Extracts beacons and towns from DCS World installation (run on gaming PC)
2. **`load_beacons_towns.py`** - Loads extracted DCS data, replacing existing navaid files
3. **`scrape_navaids.py`** - Scrapes tactical navaid data from v303rdfightergroup.com and merges with existing data

## Requirements

```bash
# For loading and scraping (local Mac/Linux)
pip install requests beautifulsoup4 srtm.py

# For extraction on Windows gaming PC
pip install lupa
```

**Note**: `lupa` requires LuaJIT. On Windows, it's available as a pre-built wheel.

---

## Step 1: Extract Beacons & Towns from DCS World

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
    "longitude": 13.38886,
    "elevation": null
  }
]
```

**Note**: Elevation is set to `null` - this will be populated in Step 2.

### Features

- **Lua parsing**: Uses `lupa` library to safely execute DCS Lua files
- **Combined output**: Merges beacons and towns into single file
- **Auto-discovery**: Scans DCS installation for all available theatres
- **Cross-platform**: Works on Windows, macOS, and Linux
- **All beacon types**: Includes VOR, VORTAC, TACAN, ILS, NDB, etc.

### Transfer Files

After running on gaming PC, transfer the output JSON files to your development machine (e.g., via Dropbox, USB drive, etc.)

---

## Step 2: Load Extracted DCS Data

**Location**: Run locally on your development machine

**Purpose**: Loads extracted DCS beacon/town data, adds elevations, and writes to navaid files. This **replaces** any existing navaid data.

### Usage

```bash
# Load files from directory
python load_beacons_towns.py --input-dir ~/Dropbox/extracted_navaids

# Custom output location
python load_beacons_towns.py --input-dir ./extracted --output-dir ./output
```

### Required Arguments

- `--input-dir`: Directory containing extracted JSON files from Step 1

### Optional Arguments

- `--output-dir`: Output directory (default: `src/data/json/navaids`)

### Behavior

For each theatre:

1. Load extracted beacons/towns from input directory
2. Deduplicate entries by name
3. Fetch elevations using SRTM for entries with `elevation: null`
4. Sort by name and write JSON (replaces any existing file)

### Terrain Name Mapping

The script automatically maps DCS directory names to internal names:

| Directory Name   | Internal DCS Name    |
| ---------------- | -------------------- |
| `GermanyColdWar` | `GermanyCW`          |
| `Sinai`          | `SinaiMap`           |
| `MarianasWWII`   | `MarianaIslandsWWII` |
| All others       | Same name            |

---

## Step 3: Scrape & Merge v303 FG Website Data

**Location**: Run locally on your development machine

**Purpose**: Scrapes manually curated tactical navaids from the v303 FG website and **merges** them with existing navaid data from Step 2.

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

`Nevada`, `MarianaIslands`, `Syria`, `Afghanistan`, `GermanyCW`, `Kola`

### Merge Behavior

For each theatre:

1. Scrape tactical navaids from website
2. Load existing navaid data (from Step 2)
3. **Merge strategy**:
   - Scraped navaids overwrite existing entries with the same name
   - New scraped navaids are added
   - Existing entries not in scraped data are kept
4. Sort by name and write final JSON

### Features

- **Multi-format parser**: Handles Google Sheets embedded, JavaScript JSON objects, and HTML tables
- **Local DEM elevations**: Uses SRTM/NASA data (cached in `~/.cache/srtm`)
- **Coordinate conversion**: Converts degrees/decimal minutes to decimal degrees

---

## Complete Example Workflow

```bash
# On gaming PC: Step 1
python extract_beacons_towns.py
# Copy output files to ~/Dropbox/extracted_navaids (or transfer method of choice)

# On development machine: Step 2
cd scripts/navaids
python load_beacons_towns.py --input-dir ~/Dropbox/extracted_navaids

# On development machine: Step 3
python scrape_navaids.py
```

---

## Output

Final JSON files in `src/data/json/navaids/`:

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

## Schema

All output conforms to `src/data/json/schemas/navaids.schema.json`:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["name", "latitude", "longitude", "elevation"],
    "properties": {
      "name": { "type": "string" },
      "latitude": { "type": "number", "minimum": -90, "maximum": 90 },
      "longitude": { "type": "number", "minimum": -180, "maximum": 180 },
      "elevation": { "type": "number" }
    }
  }
}
```

---

## Data Sources

1. **DCS World Beacons**: `{DCS}\mods\terrains\*\beacons.lua`
2. **DCS World Towns**: `{DCS}\mods\terrains\*\map\towns.lua`
3. **v303rd Fighter Group Website**: https://www.v303rdfightergroup.com/index.php?pages/navaids/
4. **Elevations**: SRTM/NASA Digital Elevation Model

---

## Troubleshooting

### Step 1 Issues

- **lupa not installed**: Run `pip install lupa` on gaming PC
- **No theatres found**: Check `--dcs-dir` points to correct DCS World installation
- **Lua parse errors**: Beacon type constants may need updating

### Step 2 Issues

- **No JSON files found**: Verify `--input-dir` contains .json files from Step 1
- **Elevation warnings**: Some coordinates may be outside SRTM coverage (oceans, polar regions)
- **No DEM library found**: Install `srtm.py` with `pip install srtm.py`

### Step 3 Issues

- **No DEM library found**: Install `srtm.py` with `pip install srtm.py`
- **Network errors**: Check internet connection and v303fg.com availability
- **Parse failures**: Website format may have changed - file an issue

---

## Notes

- The v303rd Fighter Group (v303 FG) consists of the v303rd Fighter Squadron (v303 FS, A-10C) and the V93rd Fighter Squadron (v93 FS, F-16C)
- Waypoints are locations (lat/lon + altitude) in a navigation database
- Steerpoints are waypoints that are part of a flight plan
- Elevation data uses meters internally but outputs feet to match aviation standards
- SRTM data is cached locally after first download for faster subsequent runs
