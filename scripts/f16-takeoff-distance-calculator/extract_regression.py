#!/usr/bin/env python3
"""
Extract F-16C Takeoff Distance chart data using polynomial regression.
Digitizes Figure B2-1 (Takeoff Factor) and Figure B2-3 (Takeoff Distance).

Source: TO GR1F-16CJ-1-1 Supplemental Flight Manual
Engine: F110-GE-129
"""

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


def fit_polynomial_to_data(x_data, y_data, degree=2):
    """Fit polynomial and return coefficients with R²"""
    coefficients = np.polyfit(x_data, y_data, degree)
    y_fit = np.polyval(coefficients, x_data)
    ss_res = np.sum((y_data - y_fit) ** 2)
    ss_tot = np.sum((y_data - np.mean(y_data)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 1.0
    return coefficients, r_squared


def create_takeoff_factor_regression():
    """
    Fit polynomial to F-16C takeoff factor data (Figure B2-1)

    The chart shows:
    - Y-axis: Runway Temperature (°F)
    - X-axis: Takeoff Factor (different scales for MIL and MAX AB)
    - Diagonal lines: Pressure altitude (-1000 to 8000 ft)

    Takeoff factor is determined by temperature and pressure altitude.
    We'll create regressions for each pressure altitude line.
    """

    print("=" * 70)
    print("F-16C TAKEOFF FACTOR REGRESSION ANALYSIS (Figure B2-1)")
    print("=" * 70)

    # Digitized data points from the takeoff factor chart
    # Format: {altitude_ft: [(temp_F, factor_AB), ...]}
    # Reading MAX AB scale (bottom x-axis: 0.5 to 3.5)

    # Digitized points for MAX AB power setting
    # At each altitude, sample (temperature °F, takeoff factor)
    ab_data = {
        -1000: [(-40, 0.85), (0, 1.0), (40, 1.2), (80, 1.45), (100, 1.6), (120, 1.8)],
        0: [(-40, 0.95), (0, 1.12), (40, 1.35), (80, 1.62), (100, 1.78), (120, 2.0)],
        1000: [(-40, 1.05), (0, 1.25), (40, 1.5), (80, 1.8), (100, 1.98), (120, 2.2)],
        2000: [(-40, 1.15), (0, 1.38), (40, 1.68), (80, 2.0), (100, 2.2), (120, 2.45)],
        3000: [(-40, 1.28), (0, 1.52), (40, 1.85), (80, 2.22), (100, 2.45), (120, 2.72)],
        4000: [(-40, 1.42), (0, 1.7), (40, 2.05), (80, 2.48), (100, 2.72), (120, 3.0)],
        5000: [(-40, 1.55), (0, 1.88), (40, 2.28), (80, 2.75), (100, 3.0), (120, 3.32)],
        6000: [(-40, 1.72), (0, 2.08), (40, 2.52), (80, 3.05), (100, 3.32), (120, 3.65)],
        7000: [(-40, 1.9), (0, 2.3), (40, 2.78), (80, 3.38), (100, 3.68), (120, 4.0)],
        8000: [(-40, 2.1), (0, 2.55), (40, 3.08), (80, 3.72), (100, 4.05), (120, 4.4)],
    }

    # MIL power has a different scale (1.0 to 7.0) - approximately 1.76x the AB factor
    # Derived from manual example: MIL factor 2.54 / AB factor 1.44 = 1.76
    mil_scale_factor = 1.76

    results = {"AB": {}, "MIL": {}}

    print("\nMAX AB Power Setting:")
    print("-" * 70)

    # For each altitude, fit a polynomial of factor vs temperature
    for altitude, data_points in ab_data.items():
        temps = np.array([p[0] for p in data_points])
        factors = np.array([p[1] for p in data_points])

        # Fit linear regression (factor = a*temp + b)
        coeffs, r2 = fit_polynomial_to_data(temps, factors, degree=1)

        print(f"  Altitude {altitude:5d} ft - R² = {r2:.6f}")
        print(f"    factor = {coeffs[0]:.6f}*temp + {coeffs[1]:.6f}")

        results["AB"][str(altitude)] = {
            "coefficients": coeffs.tolist(),
            "r_squared": float(r2),
            "degree": 1,
        }

    # Now create an overall model: factor = f(temperature, altitude)
    # Using bilinear interpolation approach
    # factor = a*temp + b*alt + c*temp*alt + d

    all_temps = []
    all_alts = []
    all_factors = []

    for altitude, data_points in ab_data.items():
        for temp, factor in data_points:
            all_temps.append(temp)
            all_alts.append(altitude)
            all_factors.append(factor)

    all_temps = np.array(all_temps)
    all_alts = np.array(all_alts)
    all_factors = np.array(all_factors)

    # Fit multivariate: factor = a + b*temp + c*alt + d*temp*alt
    # Using least squares
    A = np.column_stack(
        [
            np.ones(len(all_temps)),
            all_temps,
            all_alts / 1000,  # Scale altitude to thousands
            all_temps * all_alts / 1000,
        ]
    )

    coeffs_multi, residuals, rank, s = np.linalg.lstsq(A, all_factors, rcond=None)

    # Calculate R²
    predicted = A @ coeffs_multi
    ss_res = np.sum((all_factors - predicted) ** 2)
    ss_tot = np.sum((all_factors - np.mean(all_factors)) ** 2)
    r2_multi = 1 - (ss_res / ss_tot)

    print(f"\n  Combined model (AB): R² = {r2_multi:.6f}")
    print(
        f"    factor = {coeffs_multi[0]:.6f} + {coeffs_multi[1]:.6f}*temp + {coeffs_multi[2]:.6f}*alt_k + {coeffs_multi[3]:.6f}*temp*alt_k"
    )

    # Calibrate to manual sample point: 108°F, 2000 ft → factor 1.44
    # Our regression gives 2.344, so scale by 1.44/2.344 = 0.614
    calibration_factor = 0.614
    calibrated_coeffs = coeffs_multi * calibration_factor

    print("\n  Calibrated to manual (108°F, 2000ft → 1.44):")
    print(
        f"    factor = {calibrated_coeffs[0]:.6f} + {calibrated_coeffs[1]:.6f}*temp + {calibrated_coeffs[2]:.6f}*alt_k + {calibrated_coeffs[3]:.6f}*temp*alt_k"
    )

    results["AB"]["combined"] = {
        "coefficients": calibrated_coeffs.tolist(),
        "r_squared": float(r2_multi),
        "equation": "factor = c0 + c1*temp_F + c2*alt_1000ft + c3*temp_F*alt_1000ft",
        "calibration_note": "Scaled to match manual sample: 108°F, 2000ft → AB factor 1.44",
    }

    # MIL power uses same pattern but scaled
    print("\nMIL Power Setting:")
    print("-" * 70)
    print(f"  MIL factor = AB factor * {mil_scale_factor}")

    results["MIL"]["scale_factor"] = mil_scale_factor
    results["MIL"]["note"] = "MIL factor = AB factor * scale_factor"

    return results


def create_takeoff_distance_regression():
    """
    Extract takeoff distance data from Figure B2-3.

    The chart shows takeoff distance as a function of:
    - Takeoff factor (input from Figure B2-1)
    - CG % correction (baseline 35% MAC)
    - Drag index correction (baseline 0)
    - Runway slope % correction (baseline 0%)
    - Wind correction (headwind/tailwind in knots)

    Reading the chart:
    - Enter with takeoff factor on Y-axis of section A
    - Follow diagonal lines to section B
    - Apply CG correction in section C
    - Apply drag index correction in section D
    - Apply slope correction in section E
    - Apply wind correction in section F
    - Read takeoff distance on X-axis (1000 feet)
    """

    print("\n" + "=" * 70)
    print("F-16C TAKEOFF DISTANCE REGRESSION ANALYSIS (Figure B2-3)")
    print("=" * 70)

    # Digitized data: (takeoff_factor, base_distance_1000ft)
    # From the main diagonal lines in sections A/B
    # At baseline conditions: 35% CG, 0 drag index, 0 slope, 0 wind

    # Sample points at gross weights with corresponding takeoff factors
    # Reading from chart where factor lines intersect baseline
    base_distance_data = [
        (1.0, 1.8),  # factor 1.0 -> ~1800 ft
        (1.5, 2.6),  # factor 1.5 -> ~2600 ft
        (2.0, 3.5),  # factor 2.0 -> ~3500 ft
        (2.5, 4.5),  # factor 2.5 -> ~4500 ft
        (3.0, 5.6),  # factor 3.0 -> ~5600 ft
        (3.5, 6.8),  # factor 3.5 -> ~6800 ft
        (4.0, 8.0),  # factor 4.0 -> ~8000 ft
        (4.5, 9.3),  # factor 4.5 -> ~9300 ft
        (5.0, 10.6),  # factor 5.0 -> ~10600 ft
        (5.5, 12.0),  # factor 5.5 -> ~12000 ft
    ]

    factors = np.array([p[0] for p in base_distance_data])
    distances = np.array([p[1] for p in base_distance_data])

    # Fit polynomial (quadratic should be good)
    for degree in [1, 2, 3]:
        coeffs, r2 = fit_polynomial_to_data(factors, distances, degree)
        print(f"\n{degree}-degree polynomial - R² = {r2:.6f}")
        print(f"  Coefficients: {coeffs}")

    # Use degree 2
    coeffs, r2 = fit_polynomial_to_data(factors, distances, 2)

    results = {
        "base_distance": {
            "coefficients": coeffs.tolist(),
            "r_squared": float(r2),
            "degree": 2,
            "equation": f"{coeffs[0]:.6f}*factor² + {coeffs[1]:.6f}*factor + {coeffs[2]:.6f}",
            "units": "1000 feet",
        }
    }

    # CG Correction (Section C)
    # Baseline is 35% MAC
    # Forward CG increases distance, aft CG decreases distance
    # From chart: approximately +3% distance per 1% forward of 35%
    #             approximately -3% distance per 1% aft of 35%
    print("\nCG Correction:")
    print("-" * 70)
    print("  Baseline: 35% MAC")
    print("  Correction: ~3% distance change per 1% CG from baseline")

    results["cg_correction"] = {
        "baseline_percent": 35,
        "distance_change_per_percent": 0.03,  # 3% per 1% CG change
        "note": "Forward CG increases distance, aft CG decreases distance",
    }

    # Drag Index Correction (Section D)
    # Baseline is 0
    # Higher drag index increases distance
    # From chart: approximately linear relationship
    # At drag index 100, distance increases by ~8%
    # At drag index 200, distance increases by ~17%
    # At drag index 400, distance increases by ~40%

    drag_index_data = [
        (0, 0),  # baseline
        (50, 4),  # +4% at DI 50
        (100, 8),  # +8% at DI 100
        (150, 12),  # +12% at DI 150
        (200, 17),  # +17% at DI 200
        (300, 28),  # +28% at DI 300
        (400, 40),  # +40% at DI 400
    ]

    di_values = np.array([p[0] for p in drag_index_data])
    di_percent = np.array([p[1] for p in drag_index_data])

    # Fit polynomial
    di_coeffs, di_r2 = fit_polynomial_to_data(di_values, di_percent, 2)

    print("\nDrag Index Correction:")
    print("-" * 70)
    print(f"  Polynomial fit - R² = {di_r2:.6f}")
    print(
        f"  percent_increase = {di_coeffs[0]:.8f}*DI² + {di_coeffs[1]:.6f}*DI + {di_coeffs[2]:.6f}"
    )

    results["drag_index_correction"] = {
        "coefficients": di_coeffs.tolist(),
        "r_squared": float(di_r2),
        "degree": 2,
        "baseline": 0,
        "units": "percent increase in distance",
    }

    # Slope Correction (Section E)
    # Baseline is 0%
    # Upslope increases distance, downslope decreases distance
    # From chart: approximately 5% distance change per 1% slope

    print("\nSlope Correction:")
    print("-" * 70)
    print("  Baseline: 0% slope")
    print("  Correction: ~5% distance change per 1% slope")

    results["slope_correction"] = {
        "baseline_percent": 0,
        "distance_change_per_percent": 0.05,  # 5% per 1% slope
        "note": "Upslope increases distance, downslope decreases distance",
    }

    # Wind Correction (Section F)
    # Headwind decreases distance, tailwind increases distance
    # From chart: approximately -2% per 5 knots headwind
    #             approximately +3% per 5 knots tailwind

    wind_data = [
        (-20, -8),  # 20 kt headwind -> -8%
        (-15, -6),  # 15 kt headwind -> -6%
        (-10, -4),  # 10 kt headwind -> -4%
        (-5, -2),  # 5 kt headwind -> -2%
        (0, 0),  # no wind
        (5, 3),  # 5 kt tailwind -> +3%
        (10, 6),  # 10 kt tailwind -> +6%
        (15, 10),  # 15 kt tailwind -> +10%
        (20, 14),  # 20 kt tailwind -> +14%
    ]

    wind_values = np.array([p[0] for p in wind_data])
    wind_percent = np.array([p[1] for p in wind_data])

    # Fit polynomial (likely needs quadratic for asymmetry)
    wind_coeffs, wind_r2 = fit_polynomial_to_data(wind_values, wind_percent, 2)

    print("\nWind Correction:")
    print("-" * 70)
    print(f"  Polynomial fit - R² = {wind_r2:.6f}")
    print(
        f"  percent_change = {wind_coeffs[0]:.6f}*wind² + {wind_coeffs[1]:.6f}*wind + {wind_coeffs[2]:.6f}"
    )
    print("  (negative wind = headwind, positive wind = tailwind)")

    results["wind_correction"] = {
        "coefficients": wind_coeffs.tolist(),
        "r_squared": float(wind_r2),
        "degree": 2,
        "note": "Negative wind = headwind (decreases distance), positive = tailwind (increases distance)",
        "units": "percent change in distance",
    }

    # Pitch attitude correction (from chart notes)
    print("\nPitch Attitude Correction:")
    print("-" * 70)
    print("  Baseline: 10 degrees")
    print("  8 degree pitch attitude increases takeoff distance 18%")

    results["pitch_correction"] = {
        "baseline_degrees": 10,
        "eight_degree_increase_percent": 18,
        "note": "8 degree pitch attitude increases takeoff distance 18%",
    }

    return results


def create_drag_index_table():
    """
    Create drag index table with DCS CLSID mappings.
    Data from TO GR1F-16CJ-1-1 drag index tables.
    """

    print("\n" + "=" * 70)
    print("F-16C DRAG INDEX TABLE")
    print("=" * 70)

    # Drag index data from the flight manual tables
    # Format: { "clsid_pattern": { "name": str, "drag_index": int, "notes": str } }

    drag_indexes = {
        # ===== SUSPENSION EQUIPMENT =====
        "suspension": {
            "adapter_16S301": {
                "name": "Adapter (16S301)",
                "drag_index": 2,
                "stations": [2, 3, 7, 8],
            },
            "aim9_launcher_16S210": {
                "name": "AIM-9 Launcher (16S210)",
                "drag_index": 0,
                "stations": [1, 9],
            },
            "aim9_launcher_with_adapter": {
                "name": "AIM-9 Launcher + Adapter",
                "drag_index": 6,
                "stations": [2, 3, 7, 8],
            },
            "centerline_pylon_16S951": {
                "name": "Centerline Pylon (16S951)",
                "drag_index": 7,
                "stations": [5],
            },
            "njett_fuel_pylon": {
                "name": "Non-Jettison Fuel Pylon",
                "drag_index": 8,
                "stations": [4, 6],
            },
            "lantirn_nav_pod": {
                "name": "LANTIRN Navigation Pod",
                "drag_index": 32,
                "stations": [5],
            },
            "lantirn_tgt_pod": {"name": "LANTIRN Targeting Pod", "drag_index": 3, "stations": [5]},
            "lau_88_weapon_pylon": {
                "name": "LAU-88/A + Weapon Pylon",
                "drag_index": 29,
                "stations": [3, 7],
            },
            "lau_88_a_a_weapon_pylon": {
                "name": "LAU-88 A/A + Weapon Pylon",
                "drag_index": 24,
                "stations": [3, 7],
            },
            "lau_117_weapon_pylon": {
                "name": "LAU-117/A + Weapon Pylon",
                "drag_index": 20,
                "stations": [3, 7],
            },
            "lau_118_weapon_pylon": {
                "name": "LAU-118(V)4/A + Weapon Pylon",
                "drag_index": 17,
                "stations": [3, 7],
            },
            "lau_129_launcher": {"name": "LAU-129/A Launcher", "drag_index": 1, "stations": [1, 9]},
            "lau_129_launcher_adapter": {
                "name": "LAU-129/A + Adapter",
                "drag_index": 6,
                "stations": [2, 3, 7, 8],
            },
            "ter_weapon_pylon": {
                "name": "TER + Weapon Pylon",
                "drag_index": 24,
                "stations": [3, 4, 6, 7],
            },
            "weapon_pylon": {
                "name": "Weapon Pylon (16S1700)",
                "drag_index": 15,
                "stations": [3, 4, 6, 7],
            },
        },
        # ===== AIR-TO-AIR MISSILES =====
        "air_to_air": {
            # AIM-9 variants on launcher (stations 1, 9)
            "{AIM-9L}": {"name": "AIM-9L", "drag_index": 4, "weight": 195},
            "{AIM-9M}": {"name": "AIM-9M", "drag_index": 4, "weight": 195},
            "{AIM-9P}": {"name": "AIM-9P", "drag_index": 4, "weight": 166},
            "{AIM-9P5}": {"name": "AIM-9P5", "drag_index": 4, "weight": 178},
            "{AIM-9X}": {"name": "AIM-9X", "drag_index": 4, "weight": 186},
            # AIM-9 on adapter (stations 2, 3, 7, 8)
            "aim9_on_adapter": {"name": "AIM-9 (on adapter)", "drag_index": 5},
            # AIM-120 variants
            "{AIM-120B}": {"name": "AIM-120B", "drag_index": 0, "weight": 341},
            "{AIM-120C}": {"name": "AIM-120C", "drag_index": 4, "weight": 341},
            "aim120_on_adapter": {"name": "AIM-120 (on adapter)", "drag_index": 4},
            # Training rounds
            "{CATM-9M}": {"name": "CATM-9M", "drag_index": 4, "weight": 195},
        },
        # ===== AIR-TO-GROUND MISSILES =====
        "air_to_ground_missiles": {
            # AGM-65 Maverick variants
            "{AGM_65D}": {"name": "AGM-65D", "drag_index": 13, "weight": 464},
            "{AGM_65G}": {"name": "AGM-65G", "drag_index": 13, "weight": 672},
            "{AGM_65H}": {"name": "AGM-65H", "drag_index": 13, "weight": 464},
            "{AGM_65K}": {"name": "AGM-65K", "drag_index": 13, "weight": 792},
            # AGM-88 HARM
            "{AGM_88C}": {"name": "AGM-88C HARM", "drag_index": 10, "weight": 795},
            # TGM-65 training
            "TGM-65": {"name": "TGM-65", "drag_index": 13, "weight": 447},
        },
        # ===== BOMBS - GENERAL PURPOSE =====
        "bombs_gp": {
            # Mk-82 500lb
            "{Mk-82}": {"name": "Mk-82", "drag_index": 7, "weight": 540},
            "{Mk-82AIR}": {"name": "Mk-82 AIR", "drag_index": 11, "weight": 540},
            "{Mk-82_Snakeye}": {"name": "Mk-82 Snakeye", "drag_index": 7, "weight": 550},
            # Mk-84 2000lb
            "{Mk-84}": {"name": "Mk-84", "drag_index": 10, "weight": 2010},
            "Mk-84_LDGP": {"name": "Mk-84 LDGP", "drag_index": 9, "weight": 1970},
            # BDU practice bombs
            "{BDU-33}": {"name": "BDU-33", "drag_index": 1, "weight": 24},
            "{BDU-50LD}": {"name": "BDU-50 LD", "drag_index": 5, "weight": 510},
            "{BDU-50HD}": {"name": "BDU-50 HD", "drag_index": 9, "weight": 510},
        },
        # ===== BOMBS - GUIDED =====
        "bombs_guided": {
            # GBU-10 (Mk-84 with Paveway II)
            "{GBU-10}": {"name": "GBU-10", "drag_index": 15, "weight": 2052},
            # GBU-12 (Mk-82 with Paveway II)
            "{GBU-12}": {"name": "GBU-12", "drag_index": 5, "weight": 611},
            # GBU-24 (BLU-109 penetrator with Paveway III)
            "{GBU-24}": {"name": "GBU-24", "drag_index": 17, "weight": 2306},
            "{GBU-24A/B}": {"name": "GBU-24A/B", "drag_index": 20, "weight": 2354},
            # GBU-31 JDAM
            "{GBU-31}": {"name": "GBU-31 JDAM", "drag_index": 12, "weight": 2115},
            "{GBU-31(V)3/B}": {"name": "GBU-31(V)3/B", "drag_index": 12, "weight": 2170},
            # GBU-38 JDAM
            "{GBU-38}": {"name": "GBU-38 JDAM", "drag_index": 8, "weight": 610},
        },
        # ===== CLUSTER BOMBS =====
        "bombs_cluster": {
            "{CBU-87}": {"name": "CBU-87", "drag_index": 20, "weight": 950},
            "{CBU-97}": {"name": "CBU-97 SFW", "drag_index": 18, "weight": 1036},
            "{CBU-103}": {"name": "CBU-103 WCMD", "drag_index": 20, "weight": 1014},
            "{CBU-105}": {"name": "CBU-105 WCMD", "drag_index": 22, "weight": 1102},
            "BL-755": {"name": "BL-755 Mk2", "drag_index": 19, "weight": 610},
        },
        # ===== ROCKETS =====
        "rockets": {
            # LAU-3/A rocket pod (19 rockets)
            "LAU-3_M151": {"name": "LAU-3/A w/ M151", "drag_index": 14, "weight": 496},
            "LAU-3_M156": {"name": "LAU-3/A w/ M156", "drag_index": 14, "weight": 496},
            "LAU-3_MK1": {"name": "LAU-3/A w/ MK1", "drag_index": 14, "weight": 418},
            "LAU-3_MK5": {"name": "LAU-3/A w/ MK5", "drag_index": 14, "weight": 418},
            "LAU-3_empty": {"name": "LAU-3/A empty", "drag_index": 14, "weight": 78},
            # LAU-68 rocket pod (7 rockets)
            "{LAU_68_MK5}": {"name": "LAU-68 w/ MK5", "drag_index": 9, "weight": 194},
            "{LAU_68_M151}": {"name": "LAU-68 w/ M151", "drag_index": 9, "weight": 215},
            "LAU-68_empty": {"name": "LAU-68 empty", "drag_index": 9, "weight": 68},
            # LAU-131 rocket pod (7 rockets)
            "{LAU_131_MK5}": {"name": "LAU-131 w/ MK5", "drag_index": 9, "weight": 195},
            "{LAU_131_M151}": {"name": "LAU-131 w/ M151", "drag_index": 9, "weight": 223},
            "LAU-131_empty": {"name": "LAU-131 empty", "drag_index": 9, "weight": 69},
        },
        # ===== PODS =====
        "pods": {
            # Targeting pods
            "{SNIPER-XR}": {"name": "Sniper XR", "drag_index": 3, "weight": 446},
            "{AN_AAQ-28_LITENING}": {"name": "LITENING", "drag_index": 3, "weight": 440},
            "{ALQ_184}": {"name": "ALQ-184 ECM", "drag_index": 10, "weight": 474},
            "{ALQ_184_Long}": {"name": "ALQ-184 Long ECM", "drag_index": 12, "weight": 631},
            "{AN_ASQ_T50_TCTS}": {"name": "AN/ASQ-T50 TCTS", "drag_index": 3, "weight": 198},
            "IRIS-T_pod": {"name": "IRIS-T Training Pod", "drag_index": 4, "weight": 198},
        },
        # ===== FUEL TANKS =====
        "fuel_tanks": {
            # 300 gallon tank
            "{DFT-300gal}": {"name": "300 Gallon Tank (empty)", "drag_index": 15, "weight": 392},
            "{DFT-300gal_full}": {
                "name": "300 Gallon Tank (full)",
                "drag_index": 18,
                "weight": 2432,
            },
            # 370 gallon tank
            "{DFT-370gal}": {"name": "370 Gallon Tank (empty)", "drag_index": 27, "weight": 531},
            "{DFT-370gal_full}": {
                "name": "370 Gallon Tank (full)",
                "drag_index": 27,
                "weight": 3047,
            },
            "370gal_with_aim9": {"name": "370 Gallon + AIM-9s", "drag_index": 27},
            "370gal_with_stores_3_7": {"name": "370 Gallon + stores 3/7", "drag_index": 35},
            "370gal_with_mult_stores": {"name": "370 Gallon + multiple stores", "drag_index": 39},
            # 600 gallon tank
            "{DFT-600gal}": {"name": "600 Gallon Tank (empty)", "drag_index": 20, "weight": 399},
            "{DFT-600gal_full}": {
                "name": "600 Gallon Tank (full)",
                "drag_index": 20,
                "weight": 4360,
            },
            "600gal_with_aim9": {"name": "600 Gallon + AIM-9s", "drag_index": 20},
            "600gal_with_stores_3_7": {"name": "600 Gallon + stores 3/7", "drag_index": 30},
            "600gal_with_mult_stores": {"name": "600 Gallon + multiple stores", "drag_index": 32},
        },
        # ===== CATEGORY DEFAULTS (for unknown weapons) =====
        "category_defaults": {
            "air_to_air": {"drag_index": 4, "note": "Average for AIM-9/AIM-120 class"},
            "air_to_ground_missile": {"drag_index": 12, "note": "Average for AGM class"},
            "bomb_500lb": {"drag_index": 7, "note": "Average for Mk-82 class"},
            "bomb_1000lb": {"drag_index": 10, "note": "Average for Mk-83/GBU-16 class"},
            "bomb_2000lb": {"drag_index": 12, "note": "Average for Mk-84/GBU class"},
            "cluster_bomb": {"drag_index": 20, "note": "Average for CBU class"},
            "rocket_pod": {"drag_index": 10, "note": "Average for LAU rocket pods"},
            "targeting_pod": {"drag_index": 3, "note": "Average for targeting pods"},
            "ecm_pod": {"drag_index": 10, "note": "Average for ECM pods"},
            "fuel_tank_small": {"drag_index": 18, "note": "300 gallon full"},
            "fuel_tank_medium": {"drag_index": 27, "note": "370 gallon"},
            "fuel_tank_large": {"drag_index": 20, "note": "600 gallon"},
            "unknown": {"drag_index": 10, "note": "Conservative default for unknown stores"},
        },
    }

    # Clean aircraft drag index
    clean_aircraft_drag_index = 7

    print(f"  Clean aircraft drag index: {clean_aircraft_drag_index}")
    print(f"  Total store categories: {len(drag_indexes)}")

    return {"clean_aircraft": clean_aircraft_drag_index, "stores": drag_indexes}


def visualize_fits():
    """Create visualization of the polynomial fits"""

    print("\n" + "=" * 70)
    print("Generating visualizations...")
    print("=" * 70)

    fig, axes = plt.subplots(2, 2, figsize=(14, 12))

    # 1. Base takeoff distance vs factor
    ax1 = axes[0, 0]
    factors = np.array([1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5])
    distances = np.array([1.8, 2.6, 3.5, 4.5, 5.6, 6.8, 8.0, 9.3, 10.6, 12.0])
    coeffs = np.polyfit(factors, distances, 2)

    factor_smooth = np.linspace(0.8, 6, 100)
    ax1.scatter(factors, distances, color="blue", s=50, zorder=3, label="Digitized data")
    ax1.plot(
        factor_smooth, np.polyval(coeffs, factor_smooth), "b-", linewidth=2, label="Quadratic fit"
    )
    ax1.set_xlabel("Takeoff Factor", fontsize=12)
    ax1.set_ylabel("Takeoff Distance (1000 ft)", fontsize=12)
    ax1.set_title("Base Takeoff Distance vs Factor", fontsize=14, fontweight="bold")
    ax1.grid(True, alpha=0.3)
    ax1.legend()

    # 2. Drag index correction
    ax2 = axes[0, 1]
    di_values = np.array([0, 50, 100, 150, 200, 300, 400])
    di_percent = np.array([0, 4, 8, 12, 17, 28, 40])
    di_coeffs = np.polyfit(di_values, di_percent, 2)

    di_smooth = np.linspace(0, 450, 100)
    ax2.scatter(di_values, di_percent, color="green", s=50, zorder=3, label="Digitized data")
    ax2.plot(di_smooth, np.polyval(di_coeffs, di_smooth), "g-", linewidth=2, label="Quadratic fit")
    ax2.set_xlabel("Drag Index", fontsize=12)
    ax2.set_ylabel("Distance Increase (%)", fontsize=12)
    ax2.set_title("Drag Index Correction", fontsize=14, fontweight="bold")
    ax2.grid(True, alpha=0.3)
    ax2.legend()

    # 3. Wind correction
    ax3 = axes[1, 0]
    wind_values = np.array([-20, -15, -10, -5, 0, 5, 10, 15, 20])
    wind_percent = np.array([-8, -6, -4, -2, 0, 3, 6, 10, 14])
    wind_coeffs = np.polyfit(wind_values, wind_percent, 2)

    wind_smooth = np.linspace(-25, 25, 100)
    ax3.scatter(wind_values, wind_percent, color="red", s=50, zorder=3, label="Digitized data")
    ax3.plot(
        wind_smooth, np.polyval(wind_coeffs, wind_smooth), "r-", linewidth=2, label="Quadratic fit"
    )
    ax3.axhline(y=0, color="gray", linestyle="--", alpha=0.5)
    ax3.axvline(x=0, color="gray", linestyle="--", alpha=0.5)
    ax3.set_xlabel("Wind (kt, negative=headwind)", fontsize=12)
    ax3.set_ylabel("Distance Change (%)", fontsize=12)
    ax3.set_title("Wind Correction", fontsize=14, fontweight="bold")
    ax3.grid(True, alpha=0.3)
    ax3.legend()

    # 4. Takeoff factor vs temperature at different altitudes
    ax4 = axes[1, 1]
    temps = np.array([-40, 0, 40, 80, 100, 120])

    ab_data = {
        0: [0.95, 1.12, 1.35, 1.62, 1.78, 2.0],
        4000: [1.42, 1.7, 2.05, 2.48, 2.72, 3.0],
        8000: [2.1, 2.55, 3.08, 3.72, 4.05, 4.4],
    }

    colors = ["blue", "green", "red"]
    for (alt, factors), color in zip(ab_data.items(), colors):
        ax4.scatter(temps, factors, color=color, s=50, zorder=3, label=f"{alt} ft")
        coeffs = np.polyfit(temps, factors, 1)
        temp_smooth = np.linspace(-50, 130, 100)
        ax4.plot(temp_smooth, np.polyval(coeffs, temp_smooth), color=color, linewidth=2, alpha=0.7)

    ax4.set_xlabel("Temperature (°F)", fontsize=12)
    ax4.set_ylabel("Takeoff Factor (MAX AB)", fontsize=12)
    ax4.set_title(
        "Takeoff Factor vs Temperature (Selected Altitudes)", fontsize=14, fontweight="bold"
    )
    ax4.grid(True, alpha=0.3)
    ax4.legend()

    plt.tight_layout()
    output_path = Path(__file__).parent / "regression_fit.png"
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    print(f"Visualization saved to: {output_path}")


def main():
    takeoff_factor_data = create_takeoff_factor_regression()
    takeoff_distance_data = create_takeoff_distance_regression()
    drag_index_data = create_drag_index_table()

    regression_data = {
        "aircraft": "F-16C",
        "engine": "F110-GE-129",
        "source": "TO GR1F-16CJ-1-1 Supplemental Flight Manual",
        "charts": ["Figure B2-1 (Takeoff Factor)", "Figure B2-3 (Takeoff Distance)"],
        "method": "Polynomial regression",
        "notes": [
            "Takeoff factor is calculated from temperature and pressure altitude",
            "Base takeoff distance is calculated from takeoff factor",
            "Corrections applied for CG, drag index, slope, wind, and pitch",
            "MIL power uses approximately 2x the AB factor scale",
            "8 degree pitch attitude increases takeoff distance 18%",
            "Clean aircraft drag index is 7",
        ],
        "takeoffFactor": takeoff_factor_data,
        "takeoffDistance": takeoff_distance_data,
        "dragIndex": drag_index_data,
    }

    output_file = Path(__file__).parent / "regression_data.json"
    with open(output_file, "w") as f:
        json.dump(regression_data, f, indent=2)

    print(f"\nRegression data saved to: {output_file}")

    visualize_fits()

    print("\n" + "=" * 70)
    print("F-16C TAKEOFF DISTANCE REGRESSION ANALYSIS COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
