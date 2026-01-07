#!/usr/bin/env python3
"""
DCS World Beacon and Town Extractor

Extracts navigation beacons and populated town locations from DCS World Lua files.
Run this script on your gaming PC with DCS World installed.

Usage:
    python extract_beacons_towns.py                          # Extract all terrains
    python extract_beacons_towns.py --terrain Caucasus       # Extract specific terrain
    python extract_beacons_towns.py --dcs-dir "D:\\DCS World"  # Custom DCS path

Requirements:
    pip install lupa

Author: Generated for v303 MDC Generator
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any

try:
    from lupa import LuaRuntime
except ImportError:
    print("ERROR: lupa library not found. Please install it:")
    print("  pip install lupa")
    sys.exit(1)


# Default DCS installation paths to search
DEFAULT_DCS_PATHS = [
    Path("C:/Program Files/Eagle Dynamics/DCS World"),
    Path("C:/Program Files/Eagle Dynamics/DCS World OpenBeta"),
    Path("D:/DCS World"),
    Path("D:/Games/DCS World"),
    Path("E:/DCS World"),
]

# Beacon type constants from DCS
# These match the values in DCS beacons.lua files
BEACON_TYPES = {
    0: "NULL",
    1: "VOR",
    2: "DME",
    3: "VOR_DME",
    4: "TACAN",
    5: "VORTAC",
    6: "RSBN",
    7: "BROADCAST_STATION",
    8: "HOMER",
    9: "AIRPORT_HOMER",
    10: "AIRPORT_HOMER_WITH_MARKER",
    11: "ILS_FAR_HOMER",
    12: "ILS_NEAR_HOMER",
    13: "ILS_LOCALIZER",
    14: "ILS_GLIDESLOPE",
    15: "PRMG_LOCALIZER",
    16: "PRMG_GLIDESLOPE",
    17: "ICLS_LOCALIZER",
    18: "ICLS_GLIDESLOPE",
    19: "NAUTICAL_HOMER",
}

# Beacon types we want to extract as navaids (VOR, TACAN, etc.)
# Exclude ILS components and airport-specific beacons
NAVAID_BEACON_TYPES = {1, 2, 3, 4, 5, 6, 8, 19}  # VOR, DME, VOR_DME, TACAN, VORTAC, RSBN, HOMER, NAUTICAL_HOMER

# Map DCS beacon type numbers to output type strings
# HOMER (8) and NAUTICAL_HOMER (19) are non-directional beacons
BEACON_TYPE_TO_OUTPUT = {
    1: "VOR",
    2: "DME",
    3: "VOR_DME",
    4: "TACAN",
    5: "VORTAC",
    6: "RSBN",
    8: "NDB",      # HOMER
    19: "NDB",     # NAUTICAL_HOMER
}


class BeaconTownExtractor:
    """Extracts beacons and towns from DCS World installation."""

    def __init__(self, dcs_dir: Path, output_dir: Path):
        self.dcs_dir = dcs_dir
        self.output_dir = output_dir
        self.lua = LuaRuntime(unpack_returned_tuples=True)

        # Set up Lua environment with required globals
        self._setup_lua_environment()

    def _setup_lua_environment(self):
        """Set up Lua runtime with DCS-compatible globals and mock modules."""
        # Create beacon type constants that DCS Lua files expect
        lua_setup = """
        BEACON_TYPE_NULL = 0
        BEACON_TYPE_VOR = 1
        BEACON_TYPE_DME = 2
        BEACON_TYPE_VOR_DME = 3
        BEACON_TYPE_TACAN = 4
        BEACON_TYPE_VORTAC = 5
        BEACON_TYPE_RSBN = 6
        BEACON_TYPE_BROADCAST_STATION = 7
        BEACON_TYPE_HOMER = 8
        BEACON_TYPE_AIRPORT_HOMER = 9
        BEACON_TYPE_AIRPORT_HOMER_WITH_MARKER = 10
        BEACON_TYPE_ILS_FAR_HOMER = 11
        BEACON_TYPE_ILS_NEAR_HOMER = 12
        BEACON_TYPE_ILS_LOCALIZER = 13
        BEACON_TYPE_ILS_GLIDESLOPE = 14
        BEACON_TYPE_PRMG_LOCALIZER = 15
        BEACON_TYPE_PRMG_GLIDESLOPE = 16
        BEACON_TYPE_ICLS_LOCALIZER = 17
        BEACON_TYPE_ICLS_GLIDESLOPE = 18
        BEACON_TYPE_NAUTICAL_HOMER = 19

        -- Create empty beacons table that the file will populate
        beacons = {}

        -- Create empty towns table
        towns = {}

        -- Mock translation function (must be defined first, globally)
        function _(s) return s end

        -- Mock DCS modules that may be required by Lua files
        -- i_18n: internationalization module - returns the _ function
        i_18n = _

        -- Mock require to return mock modules
        local original_require = require

        -- Create a callable table that also supports indexing
        local function make_i18n_mock()
            local t = {}
            setmetatable(t, {
                __call = function(self, s) return s end,
                __index = function(self, k) return _ end
            })
            return t
        end

        local mock_modules = {
            ['i_18n'] = make_i18n_mock(),
            ['i18n'] = make_i18n_mock(),
            ['gettext'] = make_i18n_mock(),
        }

        require = function(modname)
            if mock_modules[modname] then
                return mock_modules[modname]
            end
            -- Try original require, but don't fail on missing modules
            local ok, result = pcall(original_require, modname)
            if ok then
                return result
            else
                -- Return empty table for unknown modules
                return {}
            end
        end

        -- Mock other common DCS globals
        log = { write = function() end, info = function() end, error = function() end }

        -- Mock file loading functions
        dofile = function(path) end
        loadfile = function(path) return function() end end

        -- Mock wsTypes and other database tables that beacons may reference
        wsType_Air = {}
        wsType_Weapon = {}
        wsType_GContainer = {}
        wsTypes = {}

        -- Create a permissive global metatable for undefined variables
        setmetatable(_G, {
            __index = function(t, k)
                -- Return empty table for any undefined global
                return {}
            end
        })
        """
        self.lua.execute(lua_setup)

    def _lua_table_to_python(self, lua_table) -> Any:
        """Convert a Lua table to Python dict/list."""
        if lua_table is None:
            return None

        try:
            # Check if it's a Lua table
            if not hasattr(lua_table, 'items'):
                return lua_table

            # Convert to dict first
            result = {}
            for key, value in lua_table.items():
                # Convert key to Python type
                if hasattr(key, 'items'):
                    # Key is a table - skip it (can't use as dict key)
                    continue

                # Recursively convert nested tables
                if hasattr(value, 'items'):
                    value = self._lua_table_to_python(value)
                result[key] = value

            # Check if it's actually a list (sequential integer keys starting at 1)
            if result and all(isinstance(k, (int, float)) for k in result.keys()):
                int_keys = [int(k) for k in result.keys()]
                min_key = min(int_keys)
                max_key = max(int_keys)
                if min_key == 1 and max_key == len(result):
                    # It's a Lua array, convert to Python list
                    return [result.get(i) or result.get(float(i)) for i in range(1, len(result) + 1)]

            return result

        except Exception as e:
            print(f"    WARNING: Failed to convert Lua table: {e}")
            import traceback
            traceback.print_exc()
            return None

    def find_terrains(self) -> List[Path]:
        """Find all terrain directories in DCS installation."""
        terrains_dir = self.dcs_dir / "Mods" / "terrains"

        if not terrains_dir.exists():
            print(f"ERROR: Terrains directory not found: {terrains_dir}")
            return []

        terrains = []
        for terrain_dir in terrains_dir.iterdir():
            if terrain_dir.is_dir():
                # Check if it has a beacons.lua or towns.lua
                beacons_file = terrain_dir / "beacons.lua"
                towns_file = terrain_dir / "map" / "towns.lua"

                if beacons_file.exists() or towns_file.exists():
                    terrains.append(terrain_dir)

        return sorted(terrains)

    def extract_beacons(self, terrain_dir: Path) -> List[Dict]:
        """
        Extract navigation beacons from terrain's beacons.lua file.

        Returns list of dicts with {name, latitude, longitude, elevation}
        """
        beacons_file = terrain_dir / "beacons.lua"

        if not beacons_file.exists():
            return []

        try:
            # Read and execute the Lua file
            lua_content = beacons_file.read_text(encoding='utf-8', errors='replace')

            # Reset beacons table
            self.lua.execute("beacons = {}")

            # Execute the beacons file
            self.lua.execute(lua_content)

            lua_beacons = self.lua.globals().beacons

            if not lua_beacons or not hasattr(lua_beacons, 'items'):
                return []

            # Process beacons directly from Lua table
            navaids = []
            for key, beacon in lua_beacons.items():
                try:
                    # Get beacon type
                    beacon_type = beacon.type if hasattr(beacon, 'type') else beacon.get('type', 0) if isinstance(beacon, dict) else 0

                    # Convert to int if needed
                    if hasattr(beacon_type, '__float__'):
                        beacon_type = int(beacon_type)

                    # Filter by beacon type - only include navigation beacons
                    if beacon_type not in NAVAID_BEACON_TYPES:
                        continue

                    # Get beacon name/callsign
                    callsign = None
                    display_name = None

                    if hasattr(beacon, 'callsign'):
                        callsign = beacon.callsign
                    if hasattr(beacon, 'display_name'):
                        display_name = beacon.display_name

                    name = callsign or display_name
                    if not name:
                        continue

                    # Get position from positionGeo (contains latitude/longitude)
                    pos_geo = beacon.positionGeo if hasattr(beacon, 'positionGeo') else None

                    if pos_geo is None:
                        continue

                    latitude = None
                    longitude = None

                    if hasattr(pos_geo, 'latitude'):
                        latitude = pos_geo.latitude
                    if hasattr(pos_geo, 'longitude'):
                        longitude = pos_geo.longitude

                    if latitude is None or longitude is None:
                        continue

                    navaids.append({
                        'name': str(name).strip(),
                        'type': BEACON_TYPE_TO_OUTPUT.get(beacon_type, 'VOR'),
                        'latitude': float(latitude),
                        'longitude': float(longitude),
                        'elevation': None  # Will be filled by merge script
                    })
                except Exception as e:
                    print(f"    WARNING: Failed to process beacon: {e}")
                    continue

            return navaids

        except Exception as e:
            print(f"    WARNING: Failed to parse beacons.lua: {e}")
            return []

    def extract_beacons_fallback(self, terrain_dir: Path) -> List[Dict]:
        """
        Fallback beacon extraction using regex when Lua parsing fails.
        """
        beacons_file = terrain_dir / "beacons.lua"

        if not beacons_file.exists():
            return []

        try:
            content = beacons_file.read_text(encoding='utf-8', errors='replace')
            navaids = []

            # Pattern to match beacon entries with lat/lon
            # Looking for patterns like:
            # callsign = "HAM",
            # ...
            # lat = 53.685493,
            # lon = 10.205137,

            # Find all beacon blocks
            beacon_pattern = re.compile(
                r'\{\s*'
                r'(?:[^}]*?)'  # Any content
                r'(?:callsign|display_name)\s*=\s*["\']([^"\']+)["\']'  # Name
                r'(?:[^}]*?)'  # Any content
                r'type\s*=\s*(?:BEACON_TYPE_)?(\w+)'  # Type
                r'(?:[^}]*?)'  # Any content
                r'(?=.*?lat\s*=\s*(-?[\d.]+))'  # Latitude (lookahead)
                r'(?=.*?lon\s*=\s*(-?[\d.]+))'  # Longitude (lookahead)
                r'[^}]*\}',
                re.DOTALL | re.IGNORECASE
            )

            # Simpler pattern - find individual beacons by structure
            # Each beacon is a table with specific fields
            block_pattern = re.compile(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', re.DOTALL)

            for block_match in block_pattern.finditer(content):
                block = block_match.group(0)

                # Extract fields from this block
                name_match = re.search(r'(?:callsign|display_name)\s*=\s*["\']([^"\']+)["\']', block)
                type_match = re.search(r'type\s*=\s*(?:BEACON_TYPE_)?(\w+)', block)
                lat_match = re.search(r'\blat\s*=\s*(-?[\d.]+)', block)
                lon_match = re.search(r'\blon\s*=\s*(-?[\d.]+)', block)

                if not (name_match and lat_match and lon_match):
                    continue

                # Check beacon type
                if type_match:
                    beacon_type_str = type_match.group(1).upper()
                    # Map string to type number
                    type_map = {
                        'VOR': 1, 'DME': 2, 'VOR_DME': 3, 'TACAN': 4,
                        'VORTAC': 5, 'RSBN': 6, 'HOMER': 8, 'NAUTICAL_HOMER': 19
                    }
                    beacon_type = type_map.get(beacon_type_str, 0)
                    if beacon_type not in NAVAID_BEACON_TYPES:
                        continue

                name = name_match.group(1).strip()
                latitude = float(lat_match.group(1))
                longitude = float(lon_match.group(1))

                # Skip duplicates
                if any(n['name'] == name for n in navaids):
                    continue

                navaids.append({
                    'name': name,
                    'type': BEACON_TYPE_TO_OUTPUT.get(beacon_type, 'VOR'),
                    'latitude': latitude,
                    'longitude': longitude,
                    'elevation': None
                })

            return navaids

        except Exception as e:
            print(f"    WARNING: Fallback beacon extraction failed: {e}")
            return []

    def extract_towns(self, terrain_dir: Path) -> List[Dict]:
        """
        Extract town/city locations from terrain's towns.lua file.

        Returns list of dicts with {name, latitude, longitude, elevation}
        """
        towns_file = terrain_dir / "map" / "towns.lua"

        if not towns_file.exists():
            return []

        try:
            # Read and execute the Lua file
            lua_content = towns_file.read_text(encoding='utf-8', errors='replace')

            # Reset towns table
            self.lua.execute("towns = {}")

            # Execute the towns file
            self.lua.execute(lua_content)

            # Get the towns table
            lua_towns = self.lua.globals().towns

            if not lua_towns or not hasattr(lua_towns, 'items'):
                return []

            # Process towns directly from Lua table
            locations = []

            for key, town in lua_towns.items():
                try:
                    # Key might be the town name (string) or an index (number)
                    name = None
                    latitude = None
                    longitude = None

                    # If key is string, it's likely the town name
                    if isinstance(key, str):
                        name = key

                    # Try to get data from town object
                    if hasattr(town, 'items'):
                        # It's a table, extract fields
                        if hasattr(town, 'name'):
                            name = town.name
                        if hasattr(town, 'display_name') and not name:
                            name = town.display_name

                        # Try positionGeo first (like beacons)
                        if hasattr(town, 'positionGeo'):
                            pos_geo = town.positionGeo
                            if hasattr(pos_geo, 'latitude'):
                                latitude = pos_geo.latitude
                            if hasattr(pos_geo, 'longitude'):
                                longitude = pos_geo.longitude

                        # Fall back to direct latitude/longitude
                        if latitude is None and hasattr(town, 'latitude'):
                            latitude = town.latitude
                        if longitude is None and hasattr(town, 'longitude'):
                            longitude = town.longitude

                        # Also try lat/lon variants
                        if latitude is None and hasattr(town, 'lat'):
                            latitude = town.lat
                        if longitude is None and hasattr(town, 'lon'):
                            longitude = town.lon

                    if not name or latitude is None or longitude is None:
                        continue

                    locations.append({
                        'name': str(name).strip(),
                        'type': 'TOWN',
                        'latitude': float(latitude),
                        'longitude': float(longitude),
                        'elevation': None
                    })

                except Exception as e:
                    continue

            return locations

        except Exception as e:
            print(f"    WARNING: Failed to parse towns.lua: {e}")
            return []

    def extract_towns_fallback(self, terrain_dir: Path) -> List[Dict]:
        """
        Fallback town extraction using regex when Lua parsing fails.
        """
        towns_file = terrain_dir / "map" / "towns.lua"

        if not towns_file.exists():
            return []

        try:
            content = towns_file.read_text(encoding='utf-8', errors='replace')
            locations = []

            # Pattern to match town entries
            # Looking for: ["TownName"] = { ... lat = X, lon = Y ... }
            # or: name = "TownName", lat = X, lon = Y

            # Pattern 1: Named table entries
            pattern1 = re.compile(
                r'\["([^"]+)"\]\s*=\s*\{[^}]*'
                r'lat\s*=\s*(-?[\d.]+)[^}]*'
                r'lon\s*=\s*(-?[\d.]+)',
                re.DOTALL
            )

            for match in pattern1.finditer(content):
                name = match.group(1).strip()
                latitude = float(match.group(2))
                longitude = float(match.group(3))

                if not any(loc['name'] == name for loc in locations):
                    locations.append({
                        'name': name,
                        'type': 'TOWN',
                        'latitude': latitude,
                        'longitude': longitude,
                        'elevation': None
                    })

            # Pattern 2: Array entries with name field
            pattern2 = re.compile(
                r'name\s*=\s*["\']([^"\']+)["\'][^}]*'
                r'lat\s*=\s*(-?[\d.]+)[^}]*'
                r'lon\s*=\s*(-?[\d.]+)',
                re.DOTALL
            )

            for match in pattern2.finditer(content):
                name = match.group(1).strip()
                latitude = float(match.group(2))
                longitude = float(match.group(3))

                if not any(loc['name'] == name for loc in locations):
                    locations.append({
                        'name': name,
                        'type': 'TOWN',
                        'latitude': latitude,
                        'longitude': longitude,
                        'elevation': None
                    })

            return locations

        except Exception as e:
            print(f"    WARNING: Fallback town extraction failed: {e}")
            return []

    def extract_terrain(self, terrain_dir: Path) -> Optional[Path]:
        """
        Extract all navaids (beacons + towns) from a terrain.

        Returns path to output file or None on error.
        """
        terrain_name = terrain_dir.name
        print(f"\nProcessing {terrain_name}...")

        # Extract beacons
        print(f"  Extracting beacons...")
        beacons = self.extract_beacons(terrain_dir)

        # If Lua parsing failed, try fallback
        if not beacons:
            beacons = self.extract_beacons_fallback(terrain_dir)

        print(f"    Found {len(beacons)} navigation beacons")

        # Extract towns
        print(f"  Extracting towns...")
        towns = self.extract_towns(terrain_dir)

        # If Lua parsing failed, try fallback
        if not towns:
            towns = self.extract_towns_fallback(terrain_dir)

        print(f"    Found {len(towns)} towns")

        # Combine and deduplicate by name
        all_navaids = []
        seen_names = set()

        for navaid in beacons + towns:
            name = navaid['name']
            if name not in seen_names:
                all_navaids.append(navaid)
                seen_names.add(name)

        if not all_navaids:
            print(f"  No navaids found for {terrain_name}")
            return None

        # Sort by name
        all_navaids.sort(key=lambda n: n['name'])

        # Write output file
        self.output_dir.mkdir(parents=True, exist_ok=True)
        output_file = self.output_dir / f"{terrain_name}.json"

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_navaids, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Wrote {len(all_navaids)} navaids to {output_file}")
        return output_file

    def extract_all(self) -> Dict[str, Optional[Path]]:
        """Extract navaids from all terrains."""
        results = {}

        terrains = self.find_terrains()
        if not terrains:
            print("ERROR: No terrains found")
            return results

        print(f"Found {len(terrains)} terrain(s)")

        for terrain_dir in terrains:
            output_file = self.extract_terrain(terrain_dir)
            results[terrain_dir.name] = output_file

        return results


def find_dcs_installation() -> Optional[Path]:
    """Find DCS World installation directory."""
    for path in DEFAULT_DCS_PATHS:
        if path.exists() and (path / "bin").exists():
            return path
    return None


def main():
    parser = argparse.ArgumentParser(
        description='Extract beacons and towns from DCS World installation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python extract_beacons_towns.py                          # Extract all terrains
  python extract_beacons_towns.py --terrain Caucasus       # Extract specific terrain
  python extract_beacons_towns.py --dcs-dir "D:\\DCS World"  # Custom DCS path

Notes:
  - Run this script on your Windows gaming PC with DCS World installed
  - Requires 'lupa' library: pip install lupa
  - Transfer output JSON files to your development machine for merging
  - Elevations are set to null and will be populated by merge_beacons_towns.py
        """
    )

    parser.add_argument(
        '--dcs-dir',
        type=Path,
        help='Path to DCS World installation directory'
    )

    parser.add_argument(
        '--terrain',
        type=str,
        help='Extract specific terrain only (e.g., Caucasus, Syria)'
    )

    parser.add_argument(
        '--output-dir',
        type=Path,
        default=Path('./extracted_navaids'),
        help='Output directory for JSON files (default: ./extracted_navaids)'
    )

    args = parser.parse_args()

    # Find DCS installation
    dcs_dir = args.dcs_dir
    if not dcs_dir:
        dcs_dir = find_dcs_installation()
        if not dcs_dir:
            print("ERROR: Could not find DCS World installation.")
            print("Please specify the path with --dcs-dir")
            print("\nSearched paths:")
            for path in DEFAULT_DCS_PATHS:
                print(f"  {path}")
            sys.exit(1)

    if not dcs_dir.exists():
        print(f"ERROR: DCS directory does not exist: {dcs_dir}")
        sys.exit(1)

    print("DCS World Beacon and Town Extractor")
    print("=" * 60)
    print(f"DCS directory:    {dcs_dir}")
    print(f"Output directory: {args.output_dir}")
    print()

    try:
        extractor = BeaconTownExtractor(dcs_dir, args.output_dir)

        if args.terrain:
            # Extract specific terrain
            terrain_dir = dcs_dir / "Mods" / "terrains" / args.terrain
            if not terrain_dir.exists():
                print(f"ERROR: Terrain not found: {args.terrain}")
                print("\nAvailable terrains:")
                for t in extractor.find_terrains():
                    print(f"  {t.name}")
                sys.exit(1)

            extractor.extract_terrain(terrain_dir)
        else:
            # Extract all terrains
            results = extractor.extract_all()

            # Print summary
            print("\n" + "=" * 60)
            print("Summary")
            print("=" * 60)

            successful = [t for t, p in results.items() if p is not None]
            failed = [t for t, p in results.items() if p is None]

            print(f"Successfully extracted: {len(successful)} terrain(s)")
            for terrain in successful:
                print(f"  ✓ {terrain}")

            if failed:
                print(f"\nFailed/Empty: {len(failed)} terrain(s)")
                for terrain in failed:
                    print(f"  ✗ {terrain}")

            print("=" * 60)
            print(f"\nNext step: Copy {args.output_dir}/*.json to your dev machine")
            print("Then run: python merge_beacons_towns.py --input-dir <path>")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
