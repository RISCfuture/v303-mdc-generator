#!/usr/bin/env python3
"""
Custom Terrain Classes for Missing pydcs Terrains

Provides minimal Terrain subclasses for DCS terrains not included in pydcs.
These classes use placeholder projection parameters and bounds since they're
only needed for mission generation, not coordinate conversion.

Author: Generated for v303 MDC Generator
"""

import dcs.mapping as mapping
from dcs.terrain.projections import TransverseMercator
from dcs.terrain.terrain import MapView, Terrain

# Placeholder projection parameters (using generic UTM-like values)
# These don't need to be accurate since we're not doing coordinate conversion
DEFAULT_PROJECTION = TransverseMercator(
    central_meridian=0,
    false_easting=0,
    false_northing=0,
    scale_factor=0.9996,
)


class Afghanistan(Terrain):
    """DCS: Afghanistan terrain (placeholder implementation for mission generation)."""

    def __init__(self):
        super().__init__(
            "Afghanistan",
            DEFAULT_PROJECTION,
            bounds=mapping.Rectangle(1000000, -1000000, -1000000, 1000000, self),
            map_view_default=MapView(mapping.Point(0, 0, self), self, 1000000),
        )
        self.airports = {}


class Iraq(Terrain):
    """DCS: Iraq terrain (placeholder implementation for mission generation)."""

    def __init__(self):
        super().__init__(
            "Iraq",
            DEFAULT_PROJECTION,
            bounds=mapping.Rectangle(1000000, -1000000, -1000000, 1000000, self),
            map_view_default=MapView(mapping.Point(0, 0, self), self, 1000000),
        )
        self.airports = {}


class Kola(Terrain):
    """DCS: Kola terrain (placeholder implementation for mission generation)."""

    def __init__(self):
        super().__init__(
            "Kola",
            DEFAULT_PROJECTION,
            bounds=mapping.Rectangle(1000000, -1000000, -1000000, 1000000, self),
            map_view_default=MapView(mapping.Point(0, 0, self), self, 1000000),
        )
        self.airports = {}


class GermanyColdWar(Terrain):
    """DCS: Germany Cold War terrain (placeholder implementation for mission generation)."""

    def __init__(self):
        super().__init__(
            "GermanyCW",
            DEFAULT_PROJECTION,
            bounds=mapping.Rectangle(1000000, -1000000, -1000000, 1000000, self),
            map_view_default=MapView(mapping.Point(0, 0, self), self, 1000000),
        )
        self.airports = {}


class Sinai(Terrain):
    """DCS: Sinai terrain (placeholder implementation for mission generation)."""

    def __init__(self):
        super().__init__(
            "SinaiMap",
            DEFAULT_PROJECTION,
            bounds=mapping.Rectangle(1000000, -1000000, -1000000, 1000000, self),
            map_view_default=MapView(mapping.Point(0, 0, self), self, 1000000),
        )
        self.airports = {}


class MarianasWWII(Terrain):
    """DCS: Marianas WWII terrain (placeholder implementation for mission generation)."""

    def __init__(self):
        super().__init__(
            "MarianaIslandsWWII",
            DEFAULT_PROJECTION,
            bounds=mapping.Rectangle(1000000, -1000000, -1000000, 1000000, self),
            map_view_default=MapView(mapping.Point(0, 0, self), self, 1000000),
        )
        self.airports = {}
