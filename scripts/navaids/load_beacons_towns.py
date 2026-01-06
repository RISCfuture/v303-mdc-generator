#!/usr/bin/env python3
"""
Navaid Data Loader

Loads extracted DCS beacon/town data, adds elevations, and writes to navaid files.
This replaces any existing navaid data.

Usage:
    python load_beacons_towns.py --input-dir ~/Dropbox/extracted_navaids
    python load_beacons_towns.py --input-dir ./extracted_data --output-dir ./output

Author: Generated for v303 MDC Generator
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Try to import elevation library
try:
    import srtm
    ELEVATION_LIB = 'srtm'
except ImportError:
    try:
        import elevation
        ELEVATION_LIB = 'elevation'
    except ImportError:
        print("ERROR: No DEM library found. Please install one of:")
        print("  pip install srtm.py")
        print("  pip install elevation")
        sys.exit(1)


# Terrain name mapping: directory name -> internal DCS name
# Based on scripts/airfields/dcs_export/export_terrain_data.lua line 88
TERRAIN_NAME_MAPPING = {
    'GermanyColdWar': 'GermanyCW',
    'Sinai': 'SinaiMap',
    'MarianasWWII': 'MarianaIslandsWWII',
}


class NavaidLoader:
    """Loads extracted beacon/town data and writes to navaid files."""

    def __init__(self, input_dir: Path, output_dir: Path):
        self.input_dir = input_dir
        self.output_dir = output_dir

        # Initialize elevation data getter
        if ELEVATION_LIB == 'srtm':
            self.elevation_data = srtm.get_data()
            print(f"Using SRTM elevation data")
        else:
            print(f"Using elevation library")

    def map_terrain_name(self, directory_name: str) -> str:
        """
        Convert terrain directory name to internal DCS name.

        Args:
            directory_name: Name from directory (e.g., 'GermanyColdWar')

        Returns:
            Internal DCS name (e.g., 'GermanyCW')
        """
        return TERRAIN_NAME_MAPPING.get(directory_name, directory_name)

    def fetch_elevation(self, latitude: float, longitude: float) -> int:
        """
        Fetch elevation for a single coordinate using local DEM data.

        Returns:
            Elevation in feet (rounded to nearest foot)
        """
        try:
            if ELEVATION_LIB == 'srtm':
                # srtm.py returns elevation in meters
                elevation_m = self.elevation_data.get_elevation(latitude, longitude)
                if elevation_m is None:
                    # Try to handle missing data
                    print(f"    WARNING: No elevation data for {latitude}, {longitude}")
                    return 0
            else:
                # elevation library - would need different implementation
                # For now, return 0 as placeholder
                elevation_m = 0

            # Convert meters to feet
            elevation_ft = elevation_m * 3.28084
            return int(round(elevation_ft))

        except Exception as e:
            print(f"    WARNING: Failed to get elevation for {latitude}, {longitude}: {e}")
            return 0

    def load_theatre(self, input_file: Path, theatre_name: str) -> Optional[Path]:
        """
        Load navaid data for one theatre from extracted beacon/town data.

        Args:
            input_file: Path to extracted JSON file
            theatre_name: Internal DCS theatre name (e.g., 'GermanyCW')

        Returns:
            Path to output file or None on error
        """
        print(f"\nProcessing {theatre_name}...")

        # Read extracted data
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                extracted_data = json.load(f)
            print(f"  Loaded {len(extracted_data)} entries from {input_file.name}")
        except Exception as e:
            print(f"  ERROR: Failed to read {input_file}: {e}")
            return None

        output_file = self.output_dir / f'{theatre_name}.json'

        # Deduplicate by name
        extracted_by_name = {}
        duplicate_count = 0
        for entry in extracted_data:
            name = entry['name']
            if name in extracted_by_name:
                duplicate_count += 1
            else:
                extracted_by_name[name] = entry
        merged_data = list(extracted_by_name.values())
        if duplicate_count > 0:
            print(f"  Removed {duplicate_count} duplicates")
        print(f"  Processing {len(merged_data)} unique entries")

        # Fetch elevations for entries with null elevation
        print(f"  Fetching elevations...")
        elevation_count = 0

        for i, entry in enumerate(merged_data):
            if entry.get('elevation') is None:
                elevation = self.fetch_elevation(entry['latitude'], entry['longitude'])
                entry['elevation'] = elevation
                elevation_count += 1

                if (elevation_count) % 50 == 0:
                    print(f"    {elevation_count} elevations fetched...")

        print(f"  Fetched {elevation_count} elevations")

        # Sort by name
        merged_data.sort(key=lambda n: n['name'])

        # Write output file
        self.output_dir.mkdir(parents=True, exist_ok=True)

        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(merged_data, f, indent=2, ensure_ascii=False)
            print(f"  ✓ Wrote {len(merged_data)} entries to {output_file}")
            return output_file
        except Exception as e:
            print(f"  ERROR: Failed to write {output_file}: {e}")
            return None

    def load_all(self) -> Dict[str, Optional[Path]]:
        """
        Load all extracted JSON files found in input directory.

        Returns:
            Dict mapping theatre name to output file path
        """
        results = {}

        # Find all JSON files in input directory
        json_files = sorted(self.input_dir.glob('*.json'))

        if not json_files:
            print(f"ERROR: No JSON files found in {self.input_dir}")
            return results

        print(f"Found {len(json_files)} file(s) to process")

        for json_file in json_files:
            # Get directory name from filename (e.g., 'GermanyColdWar' from 'GermanyColdWar.json')
            directory_name = json_file.stem

            # Map to internal DCS name
            theatre_name = self.map_terrain_name(directory_name)

            # Process this theatre
            output_file = self.load_theatre(json_file, theatre_name)
            results[theatre_name] = output_file

        return results


def main():
    parser = argparse.ArgumentParser(
        description='Load extracted DCS beacon/town data into navaid files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python load_beacons_towns.py --input-dir ~/Dropbox/extracted_navaids
  python load_beacons_towns.py --input-dir ./extracted --output-dir ./output

Notes:
  - Replaces any existing navaid data
  - Fetches elevations using SRTM/DEM data for entries with null elevation
  - Deduplicates entries by name
  - Automatically maps terrain directory names to internal DCS names
        """
    )

    parser.add_argument(
        '--input-dir',
        type=Path,
        required=True,
        help='Directory containing extracted JSON files from DCS (required)'
    )

    parser.add_argument(
        '--output-dir',
        type=Path,
        default=Path(__file__).parent.parent.parent / 'src' / 'data' / 'json' / 'navaids',
        help='Output directory for navaid JSON files (default: src/data/json/navaids)'
    )

    args = parser.parse_args()

    # Validate input directory
    if not args.input_dir.exists():
        print(f"ERROR: Input directory does not exist: {args.input_dir}")
        sys.exit(1)

    if not args.input_dir.is_dir():
        print(f"ERROR: Input path is not a directory: {args.input_dir}")
        sys.exit(1)

    print("Navaid Data Loader")
    print("=" * 60)
    print(f"Input directory:  {args.input_dir}")
    print(f"Output directory: {args.output_dir}")
    print()

    try:
        loader = NavaidLoader(args.input_dir, args.output_dir)
        results = loader.load_all()

        # Print summary
        print("\n" + "=" * 60)
        print("Summary")
        print("=" * 60)

        successful = [t for t, p in results.items() if p is not None]
        failed = [t for t, p in results.items() if p is None]

        print(f"Successfully processed: {len(successful)} theatre(s)")
        for theatre in successful:
            print(f"  ✓ {theatre}")

        if failed:
            print(f"\nFailed: {len(failed)} theatre(s)")
            for theatre in failed:
                print(f"  ✗ {theatre}")

        print("=" * 60)

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
