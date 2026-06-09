#!/usr/bin/env python3
"""
DCS Terrain Data Extraction Mission Generator (MOOSE Version)

Generates .miz mission files for each DCS terrain with MOOSE framework and
embedded Lua scripts that export complete airfield, runway, and terrain data
with proper latitude/longitude coordinates.

This version uses DoScriptFile instead of embedding scripts in the dictionary,
following best practices demonstrated by complex missions like Pretense.

Prerequisites:
    pip install pydcs

Usage:
    python generate_extraction_missions_moose.py
    python generate_extraction_missions_moose.py --terrain Caucasus
    python generate_extraction_missions_moose.py --output-dir ./missions

Author: Generated for v303 MDC Generator
"""

import argparse
import os
import shutil
import sys
import warnings
import zipfile
from pathlib import Path

# Suppress pydcs warnings about DCS not being installed
warnings.filterwarnings("ignore")

# Suppress "Couldn't detect DCS World" and platform warning messages
_original_stderr = sys.stderr
_original_stdout = sys.stdout
sys.stderr = open(os.devnull, "w")
sys.stdout = open(os.devnull, "w")

try:
    import dcs

    # Import custom terrain classes for terrains not in pydcs
    from custom_terrains import Afghanistan, GermanyColdWar, Iraq, Kola, MarianasWWII, Sinai
    from dcs.action import DoScriptFile
    from dcs.terrain import (
        Caucasus,
        Falklands,
        MarianaIslands,
        Nevada,
        Normandy,
        PersianGulf,
        Syria,
        TheChannel,
    )
    from dcs.triggers import Event, TriggerStart

    # Restore stderr/stdout after imports
    sys.stderr.close()
    sys.stdout.close()
    sys.stderr = _original_stderr
    sys.stdout = _original_stdout
except ImportError as e:
    sys.stderr.close()
    sys.stdout.close()
    sys.stderr = _original_stderr
    sys.stdout = _original_stdout
    print("ERROR: pydcs library not installed. Please run: pip install pydcs")
    print(f"Details: {e}")
    sys.exit(1)


class MissionGenerator:
    """Generates DCS extraction missions for each terrain using MOOSE framework."""

    # Map terrain names to pydcs terrain classes
    TERRAINS = {
        "Caucasus": Caucasus,
        "Nevada": Nevada,
        "PersianGulf": PersianGulf,
        "Syria": Syria,
        "Sinai": Sinai,
        "Falklands": Falklands,
        "Normandy": Normandy,
        "TheChannel": TheChannel,
        "MarianaIslands": MarianaIslands,
        # Custom terrains (not in pydcs)
        "Afghanistan": Afghanistan,
        "Iraq": Iraq,
        "Kola": Kola,
        "GermanyColdWar": GermanyColdWar,
        "MarianasWWII": MarianasWWII,
    }

    def __init__(self, output_dir: Path, dcs_export_dir: Path):
        self.output_dir = output_dir
        self.dcs_export_dir = dcs_export_dir

        # Verify required files exist
        self.export_script = dcs_export_dir / "export_terrain_data.lua"
        self.moose_lib = dcs_export_dir / "Moose.lua"

        if not self.export_script.exists():
            raise FileNotFoundError(f"Export script not found: {self.export_script}")
        if not self.moose_lib.exists():
            raise FileNotFoundError(f"MOOSE library not found: {self.moose_lib}")

    def generate_mission(self, terrain_name: str) -> Path:
        """
        Generate a single extraction mission for the specified terrain.

        Args:
            terrain_name: Name of terrain (e.g., 'Caucasus', 'Syria')

        Returns:
            Path to generated .miz file
        """
        terrain_class = self.TERRAINS.get(terrain_name)
        if not terrain_class:
            raise ValueError(f"Unknown terrain: {terrain_name}")

        print(f"\nGenerating mission for {terrain_name}...")

        # Create mission with the specified terrain
        mission = dcs.Mission(terrain=terrain_class())

        # Set mission metadata
        mission.description_text = (
            f"Terrain Data Extraction Mission for {terrain_name}\n\n"
            "This mission automatically exports airfield and runway data at startup.\n"
            "Uses MOOSE framework for proper lat/lon coordinate conversion.\n"
            "Load the mission, wait 10 seconds for the export message, then exit.\n\n"
            "Output: Saved Games/DCS/Logs/terrain_export_" + terrain_name + ".json"
        )

        # Register the script files in mapResource FIRST
        # This maps the script names to actual .lua files in l10n/DEFAULT/
        # add_resource_file returns a resource key that we use in DoScriptFile
        print("  Registering MOOSE framework...")
        moose_key = mission.map_resource.add_resource_file("moose", "Moose.lua")

        print("  Registering terrain export script...")
        export_key = mission.map_resource.add_resource_file("export", "export_terrain_data.lua")

        # Create a trigger that runs at mission start
        trigger = TriggerStart(Event.NoEvent, comment=f"Export {terrain_name} Data")

        # Add actions to load MOOSE and our export script
        # Order matters: MOOSE must be loaded first
        print("  Adding MOOSE framework to trigger...")
        trigger.add_action(DoScriptFile(moose_key))

        print("  Adding terrain export script to trigger...")
        trigger.add_action(DoScriptFile(export_key))

        # Add trigger to mission
        mission.triggerrules.triggers.append(trigger)

        # Save the mission
        mission_filename = f"Extract_{terrain_name}.miz"
        mission_path = self.output_dir / mission_filename

        print(f"  Saving mission to {mission_path}")
        mission.save(str(mission_path))

        # Now we need to add the actual .lua files to the .miz archive
        # A .miz file is just a ZIP archive, so we can add files to it
        print("  Embedding MOOSE and export script into mission...")
        self._embed_scripts_in_miz(mission_path, terrain_name)

        print(f"  ✓ Created {mission_filename}")

        return mission_path

    def _embed_scripts_in_miz(self, miz_path: Path, terrain_name: str):
        """
        Embed the MOOSE framework and export script into the .miz file.

        A .miz file is a ZIP archive. We need to add our .lua files to the
        l10n/DEFAULT/ directory within the archive and update mapResource.
        """
        # Create a temporary directory to work in
        temp_dir = miz_path.parent / f"_temp_{terrain_name}"
        temp_dir.mkdir(exist_ok=True)

        try:
            # Extract the .miz file
            with zipfile.ZipFile(miz_path, "r") as zip_ref:
                zip_ref.extractall(temp_dir)

            # Ensure l10n/DEFAULT directory exists
            l10n_dir = temp_dir / "l10n" / "DEFAULT"
            l10n_dir.mkdir(parents=True, exist_ok=True)

            # Copy MOOSE framework
            shutil.copy2(self.moose_lib, l10n_dir / "Moose.lua")

            # Copy export script
            shutil.copy2(self.export_script, l10n_dir / "export_terrain_data.lua")

            # Update mapResource file to register our scripts
            # The file should be in Lua format: mapResource = { ["key"] = "filename" }
            # We need BOTH the custom keys (moose, export) AND the ResKey mappings
            # that pydcs generates
            mapResource_path = l10n_dir / "mapResource"
            mapResource_content = """mapResource=
{
\t["ResKey_5"]="Moose.lua",
\t["ResKey_6"]="export_terrain_data.lua",
\t["moose"]="Moose.lua",
\t["export"]="export_terrain_data.lua",
}
"""
            with open(mapResource_path, "w", encoding="utf-8") as f:
                f.write(mapResource_content)

            # Re-create the .miz file (ZIP archive)
            with zipfile.ZipFile(miz_path, "w", zipfile.ZIP_DEFLATED) as zip_ref:
                # Add all files from temp directory
                for file_path in temp_dir.rglob("*"):
                    if file_path.is_file():
                        # Get the path relative to temp_dir
                        arcname = file_path.relative_to(temp_dir)
                        zip_ref.write(file_path, arcname)

        finally:
            # Clean up temporary directory
            if temp_dir.exists():
                shutil.rmtree(temp_dir)

    def generate_all_missions(self) -> dict:
        """
        Generate extraction missions for all terrains.

        Returns:
            Dictionary mapping terrain names to mission file paths
        """
        self.output_dir.mkdir(parents=True, exist_ok=True)

        results = {}

        for terrain_name in self.TERRAINS.keys():
            try:
                mission_path = self.generate_mission(terrain_name)
                results[terrain_name] = mission_path
            except Exception as e:
                print(f"  ✗ Error generating mission for {terrain_name}: {e}")
                import traceback

                traceback.print_exc()
                results[terrain_name] = None

        return results


def main():
    parser = argparse.ArgumentParser(
        description="Generate DCS terrain data extraction missions with MOOSE framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_extraction_missions_moose.py
  python generate_extraction_missions_moose.py --terrain Caucasus
  python generate_extraction_missions_moose.py --output-dir ./extraction_missions

After generating missions:
  1. Ensure MissionScripting.lua is desanitized (io module enabled)
  2. Load each mission in DCS
  3. Wait for "Terrain data exported" message
  4. Exit and process the exported data
        """,
    )

    parser.add_argument(
        "--terrain",
        type=str,
        choices=list(MissionGenerator.TERRAINS.keys()),
        help="Generate mission for specific terrain only",
    )

    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("./extraction_missions"),
        help="Output directory for mission files (default: ./extraction_missions)",
    )

    parser.add_argument(
        "--dcs-export-dir",
        type=Path,
        default=Path(__file__).parent / "dcs_export",
        help="Directory containing export scripts (default: ./dcs_export)",
    )

    args = parser.parse_args()

    print("DCS Terrain Data Extraction Mission Generator (MOOSE Version)")
    print("=" * 60)
    print(f"Output directory: {args.output_dir}")
    print(f"Export scripts: {args.dcs_export_dir}")
    print()

    try:
        generator = MissionGenerator(args.output_dir, args.dcs_export_dir)

        if args.terrain:
            # Generate single terrain mission
            generator.generate_mission(args.terrain)
        else:
            # Generate all terrain missions
            results = generator.generate_all_missions()

            # Print summary
            print("\n" + "=" * 60)
            print("Summary")
            print("=" * 60)

            successful = [t for t, p in results.items() if p is not None]
            failed = [t for t, p in results.items() if p is None]

            print(f"Successfully generated: {len(successful)} missions")
            for terrain in successful:
                print(f"  ✓ {terrain}")

            if failed:
                print(f"\nFailed: {len(failed)} missions")
                for terrain in failed:
                    print(f"  ✗ {terrain}")

            print("\n" + "=" * 60)
            print("\nNext steps:")
            print("1. Desanitize DCS MissionScripting.lua (see documentation)")
            print("2. Load each mission in DCS and wait for export")
            print("3. Run process_terrain_exports.py to process the data")
            print("\nNote: MOOSE framework is embedded in each mission file")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
