#!/usr/bin/env python3
"""
DCS Terrain Export Data Processor

Processes terrain data exported from DCS missions and merges with existing
beacon/ILS/TACAN data to create complete airfield database files.

Usage:
    python process_terrain_exports.py
    python process_terrain_exports.py --input-dir "/path/to/exports"
    python process_terrain_exports.py --terrain Caucasus

Author: Generated for v303 MDC Generator
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
import math


class TerrainDataProcessor:
    """Processes DCS-exported terrain data and merges with beacon data."""

    def __init__(self, input_dir: Path, output_dir: Path):
        self.input_dir = input_dir
        self.output_dir = output_dir

        if not self.input_dir.exists():
            raise FileNotFoundError(f"Input directory not found: {self.input_dir}")

    def find_export_files(self) -> List[Path]:
        """Find all terrain export JSON files in input directory."""
        export_files = list(self.input_dir.glob('terrain_export_*.json'))

        if not export_files:
            print(f"Warning: No terrain export files found in {self.input_dir}")
            print("Expected files like: terrain_export_Caucasus.json")

        return export_files

    def match_beacon_to_airfield(self, beacon: Dict, airfields: List[Dict]) -> Optional[Dict]:
        """
        Match a beacon to an airfield by proximity.

        Args:
            beacon: Beacon data with positionGeo
            airfields: List of airfield dictionaries

        Returns:
            Matching airfield or None
        """
        if not beacon.get('positionGeo'):
            return None

        beacon_lat = beacon['positionGeo'].get('latitude')
        beacon_lon = beacon['positionGeo'].get('longitude')

        if beacon_lat is None or beacon_lon is None:
            return None

        # Find closest airfield (within 5nm / ~0.083 degrees)
        MAX_DISTANCE = 0.083
        closest_airfield = None
        closest_distance = MAX_DISTANCE

        for airfield in airfields:
            af_pos = airfield.get('position', {})
            af_lat = af_pos.get('latitude')
            af_lon = af_pos.get('longitude')

            if af_lat is None or af_lon is None:
                continue

            # Simple distance calculation (Pythagorean approximation)
            distance = math.sqrt((beacon_lat - af_lat)**2 + (beacon_lon - af_lon)**2)

            if distance < closest_distance:
                closest_distance = distance
                closest_airfield = airfield

        return closest_airfield

    def dcs_coords_to_latlon(self, x: float, z: float, terrain_name: str) -> tuple:
        """
        Convert DCS world coordinates to latitude/longitude.

        This is a simplified conversion. For accurate results, we rely on
        the fact that DCS provides coordinates that can be converted using
        terrain-specific projection parameters.

        For now, we'll extract this from the existing beacon data.
        """
        # TODO: Implement proper coordinate conversion per terrain
        # For now, return None to indicate we need to use beacon data coordinates
        return (None, None)


    def process_terrain_export(self, export_file: Path) -> Optional[Path]:
        """
        Process a single terrain export file.

        Args:
            export_file: Path to terrain_export_*.json file

        Returns:
            Path to output file or None on error
        """
        # Extract terrain name from filename
        filename = export_file.stem  # e.g., 'terrain_export_Caucasus'
        terrain_name = filename.replace('terrain_export_', '')

        print(f"\nProcessing {terrain_name}...")

        # Load DCS export data
        try:
            with open(export_file, 'r', encoding='utf-8') as f:
                dcs_data = json.load(f)
        except Exception as e:
            print(f"  Error loading export file: {e}")
            return None

        # Extract beacons from DCS export
        beacons = dcs_data.get('beacons', [])
        print(f"  Found {len(beacons)} beacons in export")

        # Group beacons by type
        BEACON_TYPE_TACAN = 4
        BEACON_TYPE_ILS_LOCALIZER = 16640
        BEACON_TYPE_ILS_GLIDESLOPE = 16896

        # Create lists of beacons by type for easier processing
        tacan_beacons = [b for b in beacons if b.get('type') == BEACON_TYPE_TACAN]
        ils_loc_beacons = [b for b in beacons if b.get('type') == BEACON_TYPE_ILS_LOCALIZER]
        ils_gs_beacons = [b for b in beacons if b.get('type') == BEACON_TYPE_ILS_GLIDESLOPE]

        print(f"    TACAN: {len(tacan_beacons)}, ILS: {len(ils_loc_beacons)}")

        # Process airfields
        processed_airfields = []

        for dcs_airfield in dcs_data.get('airfields', []):
            name = dcs_airfield.get('name', '')
            print(f"  Processing: {name}")

            # Build airfield entry with DCS data (has proper lat/lon now!)
            dcs_pos = dcs_airfield.get('position', {})
            airfield = {
                'name': name,
                'position': {
                    'latitude': dcs_pos.get('latitude'),
                    'longitude': dcs_pos.get('longitude'),
                    'elevation': int(round(dcs_pos.get('altitude', 0)))  # Convert to integer feet
                }
            }

            # Find TACAN beacon for this airfield
            tacan = None
            for beacon in tacan_beacons:
                if self.match_beacon_to_airfield(beacon, [airfield]):
                    tacan = {
                        'channel': beacon.get('channel'),
                        'callsign': beacon.get('callsign'),
                        'band': 'X'  # DCS TACANs are typically X band
                    }
                    print(f"    TACAN: {tacan['channel']}{tacan['band']} ({tacan['callsign']})")
                    break

            airfield['tacan'] = tacan

            # Process runways and match ILS
            # DCS only returns one end of each runway, so we need to create both ends
            runways = []
            for dcs_runway in dcs_airfield.get('runways', []):
                rwy_name = dcs_runway.get('name', '')
                rwy_heading = dcs_runway.get('heading', 0)
                rwy_length = dcs_runway.get('length')  # Already in feet from Lua export
                rwy_width = dcs_runway.get('width')  # Already in feet from Lua export
                rwy_pos = dcs_runway.get('position', {})

                # Normalize heading to 0-359
                rwy_heading = rwy_heading % 360

                # Calculate reciprocal runway
                reciprocal_heading = (rwy_heading + 180) % 360
                reciprocal_name_num = int(round(reciprocal_heading / 10)) % 36
                if reciprocal_name_num == 0:
                    reciprocal_name_num = 36
                reciprocal_name = str(reciprocal_name_num)

                # Match ILS to this runway (ILS localizer should be near runway threshold)
                # Look for ILS within ~0.05 degrees (~5km) of runway position
                ils_primary = None
                ils_reciprocal = None

                for ils_beacon in ils_loc_beacons:
                    ils_pos = ils_beacon.get('positionGeo', {})
                    ils_lat = ils_pos.get('latitude')
                    ils_lon = ils_pos.get('longitude')

                    if ils_lat and ils_lon and rwy_pos.get('latitude') and rwy_pos.get('longitude'):
                        distance = math.sqrt(
                            (ils_lat - rwy_pos['latitude'])**2 +
                            (ils_lon - rwy_pos['longitude'])**2
                        )

                        if distance < 0.05:  # Within ~5km
                            freq = ils_beacon.get('frequency')
                            freq_mhz = str(freq / 1000000) if freq else None

                            ils_data = {
                                'name': ils_beacon.get('callsign'),
                                'frequency': freq_mhz,
                                'channel': ils_beacon.get('channel'),
                                'position': {
                                    'latitude': ils_lat,
                                    'longitude': ils_lon
                                }
                            }

                            # Determine which runway end this ILS serves based on heading alignment
                            # ILS typically points in the direction of the runway heading
                            # For now, assign to primary (we'd need glideslope angle to be certain)
                            ils_primary = ils_data
                            print(f"    ILS: {ils_data['name']} @ {ils_data['frequency']} MHz for RWY {rwy_name}")
                            break

                # Create the runway end that DCS returned
                # Ensure heading is in range 0-359 (handle rounding edge cases)
                primary_hdg = int(round(rwy_heading)) % 360
                runway = {
                    'name': str(rwy_name),
                    'heading': primary_hdg,
                    'ils': ils_primary
                }
                # Add length and width if available (round to nearest foot)
                if rwy_length is not None:
                    runway['length'] = int(round(rwy_length))
                if rwy_width is not None:
                    runway['width'] = int(round(rwy_width))
                runways.append(runway)

                # Create the reciprocal runway end
                recip_hdg = int(round(reciprocal_heading)) % 360
                reciprocal_runway = {
                    'name': reciprocal_name,
                    'heading': recip_hdg,
                    'ils': ils_reciprocal
                }
                # Both ends share the same length and width
                if rwy_length is not None:
                    reciprocal_runway['length'] = int(round(rwy_length))
                if rwy_width is not None:
                    reciprocal_runway['width'] = int(round(rwy_width))
                runways.append(reciprocal_runway)

            airfield['runways'] = runways
            print(f"    Runways: {len(runways)}")

            # ATC radio matrix sourced from Mods/terrains/<map>/Radio.lua in
            # the DCS extraction step. Shape is { callsign?, frequencies:
            # { facility: { band: mhz } } }. Airfields missing from Radio.lua
            # (or where it has empty frequency = {}) come through as None.
            airfield['radio'] = dcs_airfield.get('radio')

            processed_airfields.append(airfield)

        # Sort airfields by name
        processed_airfields.sort(key=lambda a: a.get('name', ''))

        # Write output file
        output_file = self.output_dir / f'{terrain_name}.json'
        self.output_dir.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(processed_airfields, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Wrote {len(processed_airfields)} airfields to {output_file}")

        return output_file

    def process_all_exports(self) -> Dict[str, Optional[Path]]:
        """Process all terrain export files found."""
        export_files = self.find_export_files()

        if not export_files:
            print("No export files to process.")
            return {}

        results = {}

        for export_file in export_files:
            terrain_name = export_file.stem.replace('terrain_export_', '')
            output_file = self.process_terrain_export(export_file)
            results[terrain_name] = output_file

        return results


def main():
    parser = argparse.ArgumentParser(
        description='Process DCS terrain export data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python process_terrain_exports.py --input-dir /path/to/exports
  python process_terrain_exports.py --input-dir ~/dcs-exports --output-dir ../src/data/json/airfields
  python process_terrain_exports.py --input-dir /path/to/exports --terrain Caucasus

This script:
  1. Reads terrain_export_*.json files from input directory
  2. Processes beacon/ILS/TACAN data
  3. Creates complete airfield JSON files with:
     - All runways (not just ILS-equipped)
     - Accurate elevations from DCS terrain
     - Runway dimensions (length, width)
     - ILS/TACAN/radio data from beacons
        """
    )

    parser.add_argument(
        '--input-dir',
        type=Path,
        required=True,
        help='Directory containing terrain_export_*.json files'
    )

    parser.add_argument(
        '--output-dir',
        type=Path,
        default=Path(__file__).parent.parent / 'src' / 'data' / 'json' / 'airfields',
        help='Output directory for processed JSON files'
    )

    parser.add_argument(
        '--terrain',
        type=str,
        help='Process specific terrain only'
    )

    args = parser.parse_args()

    print("DCS Terrain Export Data Processor")
    print("=" * 60)
    print(f"Input directory: {args.input_dir}")
    print(f"Output directory: {args.output_dir}")
    print()

    try:
        processor = TerrainDataProcessor(args.input_dir, args.output_dir)

        if args.terrain:
            # Process specific terrain
            export_file = processor.input_dir / f'terrain_export_{args.terrain}.json'
            if not export_file.exists():
                print(f"ERROR: Export file not found: {export_file}")
                sys.exit(1)

            processor.process_terrain_export(export_file)
        else:
            # Process all exports
            results = processor.process_all_exports()

            # Print summary
            print("\n" + "=" * 60)
            print("Summary")
            print("=" * 60)

            successful = [t for t, p in results.items() if p is not None]
            failed = [t for t, p in results.items() if p is None]

            print(f"Successfully processed: {len(successful)} terrains")
            for terrain in successful:
                print(f"  ✓ {terrain}")

            if failed:
                print(f"\nFailed: {len(failed)} terrains")
                for terrain in failed:
                    print(f"  ✗ {terrain}")

            print("=" * 60)

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
