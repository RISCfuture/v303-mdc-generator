#!/usr/bin/env python3
"""
V303 FG Navaid Database Scraper

Scrapes navigation aid data from v303rdfightergroup.com and writes to JSON files
with elevations fetched from local DEM data.

Usage:
    python scrape_navaids.py                    # Process all theatres
    python scrape_navaids.py --theatre Nevada   # Process specific theatre

Author: Generated for v303 MDC Generator
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

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


# Theatre name mapping: filename -> URL slug
THEATRES = {
    'Nevada': 'nevada_navaids',
    'MarianaIslands': 'marianas_navaids',
    'Syria': 'syria_navaids',
    'Afghanistan': 'afghanistan_navaids',
    'GermanyCW': 'germany_navaids',
}

BASE_URL = 'https://www.v303rdfightergroup.com/index.php?pages/'


class NavaidScraper:
    """Scrapes navaid data from v303 FG website."""

    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; v303-navaid-scraper/1.0)'
        })

        # Initialize elevation data getter
        if ELEVATION_LIB == 'srtm':
            self.elevation_data = srtm.get_data()
            print(f"Using SRTM elevation data")
        else:
            print(f"Using elevation library")

    def parse_coordinate(self, coord_str: str, is_longitude: bool = False) -> float:
        """
        Convert coordinate string to decimal degrees.

        Input formats:
            "36°34.13568'" (latitude)
            "-114°49.30397'" (longitude)

        Output:
            36.56893 (decimal degrees)
        """
        # Remove whitespace
        coord_str = coord_str.strip()

        # Match pattern: optional minus, degrees, minutes with decimals
        pattern = r"(-?)(\d+)°(\d+\.?\d*)'?"
        match = re.match(pattern, coord_str)

        if not match:
            raise ValueError(f"Invalid coordinate format: {coord_str}")

        sign = -1 if match.group(1) == '-' else 1
        degrees = float(match.group(2))
        minutes = float(match.group(3))

        # Convert to decimal degrees
        decimal = sign * (degrees + minutes / 60.0)

        return decimal

    def scrape_theatre_table(self, url: str) -> List[Dict]:
        """
        Scrape navaid table from theatre page.

        Returns:
            List of dicts with {name, latitude, longitude}
        """
        print(f"  Fetching {url}")

        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"  ERROR: Failed to fetch page: {e}")
            return []

        soup = BeautifulSoup(response.text, 'html.parser')

        # Try to find all HTML tables on the page
        tables = soup.find_all('table')
        navaids = []

        for table in tables:
            navaids.extend(self._parse_html_table(table))

        # If no navaids found from table, try JavaScript embedded data
        if not navaids:
            navaids = self._parse_javascript_data(response.text)

        # If still no navaids, try Google Sheets embedded format
        if not navaids:
            navaids = self._parse_google_sheets(soup)

        # Fallback: parse from raw text if still no results
        if not navaids:
            print(f"  Table parsing failed, trying text extraction...")
            # Get text content without HTML tags
            text_content = soup.get_text()
            navaids = self._parse_from_text(text_content)

        print(f"  Found {len(navaids)} navaids")
        return navaids

    def _parse_html_table(self, table) -> List[Dict]:
        """Parse standard HTML table."""
        navaids = []
        rows = table.find_all('tr')

        # Skip header row
        for row in rows[1:]:
            cols = row.find_all('td')
            if len(cols) < 4:
                continue

            try:
                name = cols[0].get_text(strip=True)
                # mgrs = cols[1].get_text(strip=True)  # Not needed
                lat_str = cols[2].get_text(strip=True)
                lon_str = cols[3].get_text(strip=True)

                # Parse coordinates
                latitude = self.parse_coordinate(lat_str, is_longitude=False)
                longitude = self.parse_coordinate(lon_str, is_longitude=True)

                navaids.append({
                    'name': name,
                    'type': 'WAYPOINT',
                    'latitude': latitude,
                    'longitude': longitude,
                })
            except (ValueError, IndexError) as e:
                print(f"  WARNING: Skipping row due to error: {e}")
                continue

        return navaids

    def _parse_javascript_data(self, html_text: str) -> List[Dict]:
        """
        Parse JavaScript embedded navaid data.

        Format: { n:"AKOGE", m:"41RQQ7275590858", lat:"31°31.22650'", lon:"065°52.33567'" }
        """
        navaids = []

        # Pattern to match JavaScript objects with navaid data
        pattern = re.compile(
            r'\{\s*n:"([^"]+)"\s*,\s*m:"[^"]+"\s*,\s*lat:"([^"]+)"\s*,\s*lon:"([^"]+)"\s*\}'
        )

        for match in pattern.finditer(html_text):
            try:
                name = match.group(1).strip()
                lat_str = match.group(2).strip()
                lon_str = match.group(3).strip()

                if self._is_valid_navaid_name(name):
                    latitude = self.parse_coordinate(lat_str, is_longitude=False)
                    longitude = self.parse_coordinate(lon_str, is_longitude=True)

                    navaids.append({
                        'name': name,
                        'type': 'WAYPOINT',
                        'latitude': latitude,
                        'longitude': longitude,
                    })
            except Exception as e:
                # print(f"  WARNING: Failed to parse JS object: {e}")
                continue

        return navaids

    def _parse_google_sheets(self, soup) -> List[Dict]:
        """Parse Google Sheets embedded table (div-based waffle format)."""
        navaids = []

        # Look for the waffle container
        waffle = soup.find('div', class_='waffle')
        if not waffle:
            # Try to find iframe containing Google Sheets
            iframe = soup.find('iframe')
            if iframe and iframe.get('src'):
                iframe_url = iframe['src']
                print(f"  Found iframe, fetching: {iframe_url[:100]}...")

                try:
                    response = self.session.get(iframe_url, timeout=30)
                    response.raise_for_status()
                    soup = BeautifulSoup(response.text, 'html.parser')
                    waffle = soup.find('div', class_='waffle')
                except Exception as e:
                    print(f"  ERROR: Failed to fetch iframe: {e}")
                    return []

        if not waffle:
            print(f"  ERROR: Could not find table data (no waffle div or iframe)")
            return []

        # Find all rows in the waffle (they're divs with s# classes)
        # Look for divs that contain the cell data
        rows = waffle.find_all('div', class_='ritz-cell')
        if not rows:
            # Alternative: look for table within waffle
            table = waffle.find('table')
            if table:
                return self._parse_html_table(table)

        # If we still can't parse it, try a more aggressive text extraction
        # Get all text and look for coordinate patterns
        text_content = soup.get_text()
        return self._parse_from_text(text_content)

    def _parse_from_text(self, text: str) -> List[Dict]:
        """
        Fallback: parse navaids from raw text by looking for coordinate patterns.

        Two formats are supported:
        Format 1 (Nevada): "2ACOSU11S PA 94916 4926236°34.13568'-114°49.30397'"
        Format 2 (Syria): "216DAM37SBT858711513433°33.26472'036°41.61023'"
        """
        navaids = []

        # Pattern 1: Nevada format (MGRS with spaces, lat/lon together)
        pattern1 = re.compile(
            r"\d+"  # Row number
            r"([A-Z][A-Z0-9\s\-\.]*?)"  # Navaid name (starts with letter, non-greedy)
            r"(?=\d+[A-Z]\s)"  # Lookahead for MGRS zone (don't consume)
            r"\d+[A-Z]"  # MGRS zone (e.g., 11S)
            r"\s+[A-Z]+"  # MGRS band (e.g., PA)
            r"\s+\d{5}"  # MGRS easting (exactly 5 digits)
            r"\s+\d{5}"  # MGRS northing (exactly 5 digits)
            r"(\d+°\d+\.\d+\'?)"  # Latitude
            r"(-?\d+°\d+\.\d+\'?)"  # Longitude
        )

        # Pattern 2: Syria/Afghanistan/Germany format (MGRS without spaces, lat/lon separate)
        pattern2 = re.compile(
            r"\d+"  # Row number
            r"([A-Z][A-Z0-9\s\-\.]*?)"  # Navaid name (starts with letter, non-greedy)
            r"\d{2}[A-Z]{3}\d{10}"  # MGRS (compact format: 37SBT8587115134)
            r"(\d+°\d+\.\d+\'?)"  # Latitude
            r"(\d+°\d+\.\d+\'?)"  # Longitude (positive, may have leading zero)
        )

        # Try pattern 1 first
        for match in pattern1.finditer(text):
            try:
                name = match.group(1).strip()
                lat_str = match.group(2).strip()
                lon_str = match.group(3).strip()

                if self._is_valid_navaid_name(name):
                    latitude = self.parse_coordinate(lat_str, is_longitude=False)
                    longitude = self.parse_coordinate(lon_str, is_longitude=True)

                    navaids.append({
                        'name': name,
                        'type': 'WAYPOINT',
                        'latitude': latitude,
                        'longitude': longitude,
                    })
            except Exception:
                continue

        # If pattern 1 didn't find anything, try pattern 2
        if not navaids:
            for match in pattern2.finditer(text):
                try:
                    name = match.group(1).strip()
                    lat_str = match.group(2).strip()
                    lon_str = match.group(3).strip()

                    if self._is_valid_navaid_name(name):
                        latitude = self.parse_coordinate(lat_str, is_longitude=False)
                        longitude = self.parse_coordinate(lon_str, is_longitude=True)

                        navaids.append({
                            'name': name,
                            'type': 'WAYPOINT',
                            'latitude': latitude,
                            'longitude': longitude,
                        })
                except Exception:
                    continue

        return navaids

    def _is_valid_navaid_name(self, name: str) -> bool:
        """Check if a name looks like a valid navaid name."""
        if not name or len(name) < 2:
            return False
        # Skip header-like text
        if any(word in name for word in ['Lat', 'Long', 'MGRS', 'Nav', 'Point']):
            return False
        return True

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

    def process_theatre(self, theatre_name: str, url_slug: str) -> Optional[Path]:
        """
        Process a single theatre: scrape, fetch elevations, merge with existing, write JSON.

        Args:
            theatre_name: Output filename (e.g., 'Nevada')
            url_slug: URL path segment (e.g., 'nevada_navaids')

        Returns:
            Path to output file or None on error
        """
        print(f"\nProcessing {theatre_name}...")

        url = f"{BASE_URL}{url_slug}/"

        # Scrape the table
        scraped_navaids = self.scrape_theatre_table(url)
        if not scraped_navaids:
            print(f"  ERROR: No navaids found")
            return None

        # Fetch elevations for scraped navaids
        print(f"  Fetching elevations for scraped navaids...")
        for i, navaid in enumerate(scraped_navaids):
            if (i + 1) % 50 == 0:
                print(f"    {i + 1}/{len(scraped_navaids)}...")

            elevation = self.fetch_elevation(navaid['latitude'], navaid['longitude'])
            navaid['elevation'] = elevation

        # Load existing data and merge
        output_file = self.output_dir / f'{theatre_name}.json'
        existing_by_name = {}

        if output_file.exists():
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                existing_by_name = {entry['name']: entry for entry in existing_data}
                print(f"  Loaded {len(existing_data)} existing entries")
            except Exception as e:
                print(f"  WARNING: Failed to read existing file: {e}")

        # Merge: scraped data overwrites existing entries with same name
        merged_by_name = existing_by_name.copy()
        added_count = 0
        updated_count = 0

        for navaid in scraped_navaids:
            name = navaid['name']
            if name in merged_by_name:
                merged_by_name[name] = navaid
                updated_count += 1
            else:
                merged_by_name[name] = navaid
                added_count += 1

        print(f"  Merged: {added_count} added, {updated_count} updated, "
              f"{len(existing_by_name) - updated_count} kept from existing")

        # Sort by name
        merged_data = sorted(merged_by_name.values(), key=lambda n: n['name'])

        # Write output file
        self.output_dir.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Wrote {len(merged_data)} navaids to {output_file}")
        return output_file

    def process_all_theatres(self) -> Dict[str, Optional[Path]]:
        """Process all theatres."""
        results = {}

        for theatre_name, url_slug in THEATRES.items():
            output_file = self.process_theatre(theatre_name, url_slug)
            results[theatre_name] = output_file

        return results


def main():
    parser = argparse.ArgumentParser(
        description='Scrape navaid data from v303rdfightergroup.com',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scrape_navaids.py                    # Process all theatres
  python scrape_navaids.py --theatre Nevada   # Process specific theatre

Theatres:
  Nevada, MarianaIslands, Syria, Afghanistan, GermanyCW
        """
    )

    parser.add_argument(
        '--theatre',
        type=str,
        choices=list(THEATRES.keys()),
        help='Process specific theatre only'
    )

    parser.add_argument(
        '--output-dir',
        type=Path,
        default=Path(__file__).parent.parent.parent / 'src' / 'data' / 'json' / 'navaids',
        help='Output directory for JSON files'
    )

    args = parser.parse_args()

    print("V303 FG Navaid Database Scraper")
    print("=" * 60)
    print(f"Output directory: {args.output_dir}")
    print()

    try:
        scraper = NavaidScraper(args.output_dir)

        if args.theatre:
            # Process specific theatre
            url_slug = THEATRES[args.theatre]
            scraper.process_theatre(args.theatre, url_slug)
        else:
            # Process all theatres
            results = scraper.process_all_theatres()

            # Print summary
            print("\n" + "=" * 60)
            print("Summary")
            print("=" * 60)

            successful = [t for t, p in results.items() if p is not None]
            failed = [t for t, p in results.items() if p is None]

            print(f"Successfully processed: {len(successful)} theatres")
            for theatre in successful:
                print(f"  ✓ {theatre}")

            if failed:
                print(f"\nFailed: {len(failed)} theatres")
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
