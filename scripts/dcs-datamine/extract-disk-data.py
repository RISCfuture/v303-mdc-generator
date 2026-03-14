#!/usr/bin/env python3
"""
Extract aircraft data from DCS cockpit Lua scripts on disk.

Supplements the hook-based export (which reads _G.db at runtime) with data
parsed directly from aircraft module files. Currently extracts:

  - Radio data: frequency range, step, displayName, preset count
    (catches radios like AH-64D HF that panelRadio omits)

Run this on the Windows machine where DCS is installed:

    python extract-disk-data.py "C:\\Program Files\\Eagle Dynamics\\DCS World"

Or auto-detect via Steam/default paths:

    python extract-disk-data.py

Output: disk-data.json in the v303-datamine export directory
        (Saved Games\\DCS\\v303-datamine\\)
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


def find_dcs_root():
    """Try common DCS installation paths."""
    candidates = [
        Path(r"C:\Program Files\Eagle Dynamics\DCS World"),
        Path(r"C:\Program Files\Eagle Dynamics\DCS World OpenBeta"),
        Path(r"C:\Program Files (x86)\Steam\steamapps\common\DCS World"),
        Path(r"C:\Program Files (x86)\Steam\steamapps\common\DCS World OpenBeta"),
    ]
    for p in candidates:
        if p.is_dir():
            return p
    return None


def find_export_dir():
    """Find the v303-datamine export directory in Saved Games."""
    saved_games = Path(os.environ.get("USERPROFILE", "~")) / "Saved Games"
    for dcs_dir in ["DCS", "DCS.openbeta"]:
        export_dir = saved_games / dcs_dir / "v303-datamine"
        if export_dir.is_dir():
            return export_dir
    # Create default
    export_dir = saved_games / "DCS" / "v303-datamine"
    export_dir.mkdir(parents=True, exist_ok=True)
    return export_dir


def parse_radio_lua(filepath):
    """Parse a radio Lua script for GUI displayName, range, step, and presets."""
    try:
        content = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None

    # Must have a GUI displayName to be a real radio (skip Intercom, ADF, etc. without one)
    m = re.search(r"""displayName\s*=\s*_\(\s*['"]([^'"]+)['"]\s*\)""", content)
    if not m:
        m = re.search(r"""displayName\s*=\s*['"]([^'"]+)['"]""", content)
    if not m:
        return None

    display_name = m.group(1)

    # Extract range block: range = { min = ..., max = ..., step = ... }
    min_hz = max_hz = step_hz = None
    range_match = re.search(r"range\s*=\s*\{([^}]+)\}", content)
    if range_match:
        block = range_match.group(1)
        for field, var in [("min", "min_hz"), ("max", "max_hz"), ("step", "step_hz")]:
            fm = re.search(rf"{field}\s*=\s*([0-9eE.+\-]+)", block)
            if fm:
                try:
                    locals()[var]  # just to avoid lint warning
                except:
                    pass
                val = float(fm.group(1))
                if field == "min":
                    min_hz = val
                elif field == "max":
                    max_hz = val
                elif field == "step":
                    step_hz = val

    # Count presets
    preset_count = len(re.findall(r"presets\s*\[\s*\d+\s*\]", content))

    # Convert Hz to MHz
    min_mhz = min_hz / 1e6 if min_hz is not None else None
    max_mhz = max_hz / 1e6 if max_hz is not None else None
    step_mhz = step_hz / 1e6 if step_hz is not None else None

    return {
        "displayName": display_name,
        "min": min_mhz,
        "max": max_mhz,
        "step": step_mhz,
        "presetCount": preset_count,
        "sourceFile": filepath.name,
    }


def scan_aircraft_module(module_path):
    """Scan an aircraft module for radio scripts."""
    # Common locations for Radio/ directory
    radio_dirs = [
        module_path / "Cockpit" / "Scripts" / "Radio",
        module_path / "Scripts" / "Radio",
    ]

    radio_dir = None
    for d in radio_dirs:
        if d.is_dir():
            radio_dir = d
            break

    if not radio_dir:
        return []

    radios = []
    for lua_file in sorted(radio_dir.glob("*.lua")):
        if lua_file.name.lower() == "intercom.lua":
            continue
        parsed = parse_radio_lua(lua_file)
        if parsed and (parsed["min"] is not None or parsed["max"] is not None):
            radios.append(parsed)

    return radios


def scan_all_aircraft(dcs_root):
    """Scan all aircraft modules for radio data."""
    results = {}

    for mods_parent in ["Mods/aircraft", "CoreMods/aircraft"]:
        mods_dir = dcs_root / mods_parent
        if not mods_dir.is_dir():
            continue

        for module_dir in sorted(mods_dir.iterdir()):
            if not module_dir.is_dir():
                continue

            radios = scan_aircraft_module(module_dir)
            if radios:
                results[module_dir.name] = radios

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Extract radio data from DCS aircraft Lua scripts on disk"
    )
    parser.add_argument(
        "dcs_root",
        nargs="?",
        help="Path to DCS World installation (auto-detected if omitted)",
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Output file path (default: v303-datamine/radios.json)",
    )
    args = parser.parse_args()

    # Find DCS root
    if args.dcs_root:
        dcs_root = Path(args.dcs_root)
    else:
        dcs_root = find_dcs_root()

    if not dcs_root or not dcs_root.is_dir():
        print("ERROR: DCS World installation not found.")
        print("Specify the path: python extract-disk-radios.py <dcs-root>")
        sys.exit(1)

    print(f"DCS root: {dcs_root}")

    # Scan
    results = scan_all_aircraft(dcs_root)

    total_modules = len(results)
    total_radios = sum(len(r) for r in results.values())
    print(f"Found {total_radios} radios across {total_modules} aircraft modules")

    for module, radios in sorted(results.items()):
        names = [r["displayName"] for r in radios]
        print(f"  {module}: {', '.join(names)}")

    # Write output
    if args.output:
        output_path = Path(args.output)
    else:
        export_dir = find_export_dir()
        output_path = export_dir / "disk-data.json"

    output = {
        "source": "disk-scan",
        "dcsRoot": str(dcs_root),
        "radios": {
            "count": total_radios,
            "aircraft": results,
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"\nWritten to {output_path}")


if __name__ == "__main__":
    main()
