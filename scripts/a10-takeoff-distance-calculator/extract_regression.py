#!/usr/bin/env python3
"""
Extract A-10C Takeoff Distance chart data using polynomial regression.
Digitizes takeoff index and takeoff run charts from TO 1A-10C-1-1.

Source: TO 1A-10C-1-1 A-10C Flight Manual
Engine: TF34-GE-100A (2x)
"""

import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import json


def fit_polynomial_to_data(x_data, y_data, degree=2):
    """Fit polynomial and return coefficients with R²"""
    coefficients = np.polyfit(x_data, y_data, degree)
    y_fit = np.polyval(coefficients, x_data)
    ss_res = np.sum((y_data - y_fit) ** 2)
    ss_tot = np.sum((y_data - np.mean(y_data)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 1.0
    return coefficients, r_squared


def create_takeoff_index_regression():
    """
    Fit polynomial to A-10C takeoff index data.

    The chart shows:
    - X-axis: Pressure Altitude (0-6 thousand ft, SL = sea level)
    - Y-axis (top): Runway Temperature (°C, -20 to 50)
    - Y-axis (bottom): Takeoff Index (4-11)
    - Two curves: Maximum Thrust and 3% Below PTFS

    Takeoff index increases with higher temperature and altitude.
    """

    print("=" * 70)
    print("A-10C TAKEOFF INDEX REGRESSION ANALYSIS")
    print("=" * 70)

    # Digitized data points from the takeoff index chart
    # Format: {altitude_ft: [(temp_C, index), ...]}
    # Reading Maximum Thrust curve

    max_thrust_data = {
        0: [  # Sea level
            (-20, 4.0), (-10, 4.3), (0, 4.6), (10, 4.9),
            (20, 5.3), (30, 5.7), (40, 6.2), (50, 6.7)
        ],
        1000: [
            (-20, 4.3), (-10, 4.7), (0, 5.1), (10, 5.5),
            (20, 5.9), (30, 6.4), (40, 6.9), (50, 7.5)
        ],
        2000: [
            (-20, 4.7), (-10, 5.1), (0, 5.6), (10, 6.1),
            (20, 6.6), (30, 7.2), (40, 7.8), (50, 8.4)
        ],
        3000: [
            (-20, 5.1), (-10, 5.6), (0, 6.2), (10, 6.8),
            (20, 7.4), (30, 8.0), (40, 8.7), (50, 9.4)
        ],
        4000: [
            (-20, 5.5), (-10, 6.2), (0, 6.8), (10, 7.5),
            (20, 8.2), (30, 8.9), (40, 9.7), (50, 10.5)
        ],
        5000: [
            (-20, 6.0), (-10, 6.7), (0, 7.5), (10, 8.3),
            (20, 9.1), (30, 9.9), (40, 10.7), (50, 11.0)
        ],
        6000: [
            (-20, 6.5), (-10, 7.3), (0, 8.2), (10, 9.1),
            (20, 10.0), (30, 10.9), (40, 11.0), (50, 11.0)
        ],
    }

    # 3% Below PTFS gives slightly higher index for same conditions
    # Approximately 0.3-0.5 higher index
    below_ptfs_offset = 0.4

    results = {
        'max_thrust': {},
        'below_ptfs': {}
    }

    print("\nMaximum Thrust:")
    print("-" * 70)

    # Collect all data for combined model
    all_temps = []
    all_alts = []
    all_indexes = []

    for altitude, data_points in max_thrust_data.items():
        temps = np.array([p[0] for p in data_points])
        indexes = np.array([p[1] for p in data_points])

        # Fit linear regression per altitude
        coeffs, r2 = fit_polynomial_to_data(temps, indexes, degree=1)

        print(f"  Altitude {altitude:5d} ft - R² = {r2:.6f}")
        print(f"    index = {coeffs[0]:.6f}*temp_C + {coeffs[1]:.6f}")

        results['max_thrust'][str(altitude)] = {
            'coefficients': coeffs.tolist(),
            'r_squared': float(r2),
            'degree': 1
        }

        for temp, index in data_points:
            all_temps.append(temp)
            all_alts.append(altitude)
            all_indexes.append(index)

    all_temps = np.array(all_temps)
    all_alts = np.array(all_alts)
    all_indexes = np.array(all_indexes)

    # Fit combined multivariate model: index = a + b*temp + c*alt + d*temp*alt
    A = np.column_stack([
        np.ones(len(all_temps)),
        all_temps,
        all_alts / 1000,  # Scale altitude to thousands
        all_temps * all_alts / 1000
    ])

    coeffs_multi, residuals, rank, s = np.linalg.lstsq(A, all_indexes, rcond=None)

    # Calculate R²
    predicted = A @ coeffs_multi
    ss_res = np.sum((all_indexes - predicted) ** 2)
    ss_tot = np.sum((all_indexes - np.mean(all_indexes)) ** 2)
    r2_multi = 1 - (ss_res / ss_tot)

    print(f"\n  Combined model (Max Thrust): R² = {r2_multi:.6f}")
    print(f"    index = {coeffs_multi[0]:.6f} + {coeffs_multi[1]:.6f}*temp_C + {coeffs_multi[2]:.6f}*alt_k + {coeffs_multi[3]:.6f}*temp_C*alt_k")

    results['max_thrust']['combined'] = {
        'coefficients': coeffs_multi.tolist(),
        'r_squared': float(r2_multi),
        'equation': 'index = c0 + c1*temp_C + c2*alt_1000ft + c3*temp_C*alt_1000ft'
    }

    # 3% Below PTFS model
    print("\n3% Below PTFS:")
    print("-" * 70)
    print(f"  Offset from Max Thrust: +{below_ptfs_offset}")

    results['below_ptfs'] = {
        'offset': below_ptfs_offset,
        'note': 'below_ptfs_index = max_thrust_index + offset'
    }

    return results


def create_takeoff_distance_regression():
    """
    Extract takeoff ground run data from the flaps 0 and flaps 7 charts.

    The charts show:
    - Y-axis: Takeoff Index (4-11)
    - X-axis: Takeoff Ground Run (1000 feet, 0-14)
    - Diagonal lines: Gross weight in 1000 lbs (20, 35, 40, 45, 50)
    - Lower sections: Wind and slope corrections
    """

    print("\n" + "=" * 70)
    print("A-10C TAKEOFF GROUND RUN REGRESSION ANALYSIS")
    print("=" * 70)

    # Digitized data: (takeoff_index, gross_weight_1000lbs, distance_1000ft)
    # Reading from Flaps 0 chart

    flaps_0_data = {
        # Gross weight 20,000 lbs
        20: [
            (4.0, 0.6), (5.0, 1.0), (6.0, 1.6), (7.0, 2.3),
            (8.0, 3.2), (9.0, 4.3), (10.0, 5.6), (11.0, 7.1)
        ],
        # Gross weight 35,000 lbs
        35: [
            (4.0, 1.8), (5.0, 2.8), (6.0, 4.0), (7.0, 5.5),
            (8.0, 7.2), (9.0, 9.2), (10.0, 11.5), (11.0, 14.0)
        ],
        # Gross weight 40,000 lbs
        40: [
            (4.0, 2.3), (5.0, 3.5), (6.0, 5.0), (7.0, 6.8),
            (8.0, 8.9), (9.0, 11.3), (10.0, 14.0), (11.0, 14.0)
        ],
        # Gross weight 45,000 lbs
        45: [
            (4.0, 2.9), (5.0, 4.3), (6.0, 6.1), (7.0, 8.3),
            (8.0, 10.8), (9.0, 13.7), (10.0, 14.0), (11.0, 14.0)
        ],
        # Gross weight 50,000 lbs
        50: [
            (4.0, 3.5), (5.0, 5.2), (6.0, 7.4), (7.0, 10.0),
            (8.0, 13.0), (9.0, 14.0), (10.0, 14.0), (11.0, 14.0)
        ],
    }

    # Flaps 7 provides approximately 10-15% reduction in takeoff distance
    flaps_7_data = {
        20: [
            (4.0, 0.5), (5.0, 0.9), (6.0, 1.4), (7.0, 2.0),
            (8.0, 2.8), (9.0, 3.8), (10.0, 5.0), (11.0, 6.3)
        ],
        35: [
            (4.0, 1.6), (5.0, 2.5), (6.0, 3.5), (7.0, 4.9),
            (8.0, 6.4), (9.0, 8.2), (10.0, 10.3), (11.0, 12.6)
        ],
        40: [
            (4.0, 2.0), (5.0, 3.1), (6.0, 4.4), (7.0, 6.0),
            (8.0, 7.9), (9.0, 10.1), (10.0, 12.6), (11.0, 14.0)
        ],
        45: [
            (4.0, 2.5), (5.0, 3.8), (6.0, 5.4), (7.0, 7.4),
            (8.0, 9.6), (9.0, 12.2), (10.0, 14.0), (11.0, 14.0)
        ],
        50: [
            (4.0, 3.1), (5.0, 4.6), (6.0, 6.5), (7.0, 8.9),
            (8.0, 11.6), (9.0, 14.0), (10.0, 14.0), (11.0, 14.0)
        ],
    }

    results = {
        'flaps_0': {},
        'flaps_7': {}
    }

    for flap_setting, data, result_key in [
        ("Flaps 0°", flaps_0_data, 'flaps_0'),
        ("Flaps 7°", flaps_7_data, 'flaps_7')
    ]:
        print(f"\n{flap_setting}:")
        print("-" * 70)

        # Collect all data for surface fit
        all_indexes = []
        all_weights = []
        all_distances = []

        for weight, data_points in data.items():
            indexes = np.array([p[0] for p in data_points])
            distances = np.array([p[1] for p in data_points])

            # Filter out points at chart limits (14.0 max)
            valid_mask = distances < 14.0
            if np.sum(valid_mask) >= 3:
                valid_indexes = indexes[valid_mask]
                valid_distances = distances[valid_mask]

                # Fit polynomial for this weight
                coeffs, r2 = fit_polynomial_to_data(valid_indexes, valid_distances, degree=2)
                print(f"  Weight {weight:2d}k lbs - R² = {r2:.6f}")
                print(f"    distance = {coeffs[0]:.6f}*idx² + {coeffs[1]:.6f}*idx + {coeffs[2]:.6f}")

                results[result_key][f'{weight}k'] = {
                    'coefficients': coeffs.tolist(),
                    'r_squared': float(r2),
                    'degree': 2
                }

            for idx, dist in zip(indexes, distances):
                if dist < 14.0:  # Exclude chart limit values
                    all_indexes.append(idx)
                    all_weights.append(weight)
                    all_distances.append(dist)

        all_indexes = np.array(all_indexes)
        all_weights = np.array(all_weights)
        all_distances = np.array(all_distances)

        # Fit combined model: distance = a + b*index + c*index² + d*weight + e*weight² + f*index*weight
        A = np.column_stack([
            np.ones(len(all_indexes)),
            all_indexes,
            all_indexes ** 2,
            all_weights,
            all_weights ** 2,
            all_indexes * all_weights
        ])

        coeffs_multi, residuals, rank, s = np.linalg.lstsq(A, all_distances, rcond=None)

        predicted = A @ coeffs_multi
        ss_res = np.sum((all_distances - predicted) ** 2)
        ss_tot = np.sum((all_distances - np.mean(all_distances)) ** 2)
        r2_multi = 1 - (ss_res / ss_tot)

        print(f"\n  Combined model: R² = {r2_multi:.6f}")
        print(f"    distance = {coeffs_multi[0]:.4f} + {coeffs_multi[1]:.4f}*idx + {coeffs_multi[2]:.4f}*idx² + {coeffs_multi[3]:.4f}*wt + {coeffs_multi[4]:.6f}*wt² + {coeffs_multi[5]:.4f}*idx*wt")

        results[result_key]['combined'] = {
            'coefficients': coeffs_multi.tolist(),
            'r_squared': float(r2_multi),
            'equation': 'distance_1000ft = c0 + c1*index + c2*index² + c3*weight_1000lb + c4*weight_1000lb² + c5*index*weight_1000lb'
        }

    return results


def create_wind_correction_regression():
    """
    Extract wind correction data from the charts.

    The wind section shows:
    - Y-axis: Wind (kts, 0-40, headwind on left, tailwind on right)
    - X-axis: Takeoff Ground Run (1000 feet)
    - Diagonal lines show the correction factor
    """

    print("\n" + "=" * 70)
    print("A-10C WIND CORRECTION REGRESSION ANALYSIS")
    print("=" * 70)

    # Wind correction as percentage change
    # Headwind decreases distance, tailwind increases distance
    # Data: (wind_kts, percent_change)
    # Positive wind = tailwind, negative = headwind

    wind_data = [
        (-40, -20),   # 40 kt headwind -> -20%
        (-30, -15),   # 30 kt headwind -> -15%
        (-20, -10),   # 20 kt headwind -> -10%
        (-10, -5),    # 10 kt headwind -> -5%
        (0, 0),       # no wind
        (10, 7),      # 10 kt tailwind -> +7%
        (20, 15),     # 20 kt tailwind -> +15%
        (30, 25),     # 30 kt tailwind -> +25%
        (40, 35),     # 40 kt tailwind -> +35%
    ]

    wind_values = np.array([p[0] for p in wind_data])
    wind_percent = np.array([p[1] for p in wind_data])

    # Fit polynomial (quadratic for asymmetry)
    coeffs, r2 = fit_polynomial_to_data(wind_values, wind_percent, 2)

    print(f"\nWind Correction:")
    print("-" * 70)
    print(f"  Polynomial fit - R² = {r2:.6f}")
    print(f"  percent_change = {coeffs[0]:.6f}*wind² + {coeffs[1]:.6f}*wind + {coeffs[2]:.6f}")
    print("  (negative wind = headwind, positive wind = tailwind)")

    return {
        'coefficients': coeffs.tolist(),
        'r_squared': float(r2),
        'degree': 2,
        'note': 'Negative wind = headwind (decreases distance), positive = tailwind (increases distance)',
        'units': 'percent change in distance'
    }


def create_slope_correction_regression():
    """
    Extract runway slope correction data from the charts.

    The slope section shows:
    - Y-axis: Runway Slope (percent, 0-3)
    - X-axis: Takeoff Ground Run (1000 feet)
    - Diagonal lines for uphill and downhill
    """

    print("\n" + "=" * 70)
    print("A-10C SLOPE CORRECTION REGRESSION ANALYSIS")
    print("=" * 70)

    # Slope correction as percentage change per percent slope
    # Uphill increases distance, downhill decreases distance
    # Approximately 7% per 1% slope

    slope_data = [
        (-3, -20),   # 3% downhill -> -20%
        (-2, -13),   # 2% downhill -> -13%
        (-1, -7),    # 1% downhill -> -7%
        (0, 0),      # level
        (1, 7),      # 1% uphill -> +7%
        (2, 15),     # 2% uphill -> +15%
        (3, 23),     # 3% uphill -> +23%
    ]

    slope_values = np.array([p[0] for p in slope_data])
    slope_percent = np.array([p[1] for p in slope_data])

    # Fit linear regression
    coeffs, r2 = fit_polynomial_to_data(slope_values, slope_percent, 1)

    print(f"\nSlope Correction:")
    print("-" * 70)
    print(f"  Linear fit - R² = {r2:.6f}")
    print(f"  percent_change = {coeffs[0]:.6f}*slope + {coeffs[1]:.6f}")
    print("  (negative slope = downhill, positive slope = uphill)")

    return {
        'coefficients': coeffs.tolist(),
        'r_squared': float(r2),
        'degree': 1,
        'note': 'Negative slope = downhill (decreases distance), positive = uphill (increases distance)',
        'units': 'percent change in distance'
    }


def create_critical_field_length_regression():
    """
    Extract critical field length data for single-engine failure scenarios.

    The chart shows:
    - Y-axis: Takeoff Index (4-11)
    - X-axis: Critical Field Length (1000 feet, 0-12)
    - Diagonal lines: Gross weight (30, 35, 40, 45, 50 thousand lbs)
    - Lower sections: Wind, slope, and RCR corrections
    """

    print("\n" + "=" * 70)
    print("A-10C CRITICAL FIELD LENGTH REGRESSION ANALYSIS")
    print("=" * 70)

    # Critical field length is longer than normal takeoff run
    # This is the minimum runway length required to either complete
    # takeoff or stop safely after an engine failure at V1

    cfl_data = {
        30: [
            (4.0, 2.0), (5.0, 2.8), (6.0, 3.8), (7.0, 5.0),
            (8.0, 6.4), (9.0, 8.0), (10.0, 9.8), (11.0, 11.8)
        ],
        35: [
            (4.0, 2.5), (5.0, 3.4), (6.0, 4.6), (7.0, 6.0),
            (8.0, 7.6), (9.0, 9.5), (10.0, 11.6), (11.0, 12.0)
        ],
        40: [
            (4.0, 3.0), (5.0, 4.1), (6.0, 5.4), (7.0, 7.0),
            (8.0, 8.9), (9.0, 11.0), (10.0, 12.0), (11.0, 12.0)
        ],
        45: [
            (4.0, 3.6), (5.0, 4.8), (6.0, 6.3), (7.0, 8.2),
            (8.0, 10.3), (9.0, 12.0), (10.0, 12.0), (11.0, 12.0)
        ],
        50: [
            (4.0, 4.2), (5.0, 5.6), (6.0, 7.3), (7.0, 9.5),
            (8.0, 11.9), (9.0, 12.0), (10.0, 12.0), (11.0, 12.0)
        ],
    }

    results = {}

    # Collect all data
    all_indexes = []
    all_weights = []
    all_lengths = []

    for weight, data_points in cfl_data.items():
        indexes = np.array([p[0] for p in data_points])
        lengths = np.array([p[1] for p in data_points])

        # Filter out chart limit values
        valid_mask = lengths < 12.0
        if np.sum(valid_mask) >= 3:
            valid_indexes = indexes[valid_mask]
            valid_lengths = lengths[valid_mask]

            coeffs, r2 = fit_polynomial_to_data(valid_indexes, valid_lengths, degree=2)
            print(f"  Weight {weight:2d}k lbs - R² = {r2:.6f}")

            results[f'{weight}k'] = {
                'coefficients': coeffs.tolist(),
                'r_squared': float(r2),
                'degree': 2
            }

        for idx, length in zip(indexes, lengths):
            if length < 12.0:
                all_indexes.append(idx)
                all_weights.append(weight)
                all_lengths.append(length)

    all_indexes = np.array(all_indexes)
    all_weights = np.array(all_weights)
    all_lengths = np.array(all_lengths)

    # Fit combined model
    A = np.column_stack([
        np.ones(len(all_indexes)),
        all_indexes,
        all_indexes ** 2,
        all_weights,
        all_weights ** 2,
        all_indexes * all_weights
    ])

    coeffs_multi, residuals, rank, s = np.linalg.lstsq(A, all_lengths, rcond=None)

    predicted = A @ coeffs_multi
    ss_res = np.sum((all_lengths - predicted) ** 2)
    ss_tot = np.sum((all_lengths - np.mean(all_lengths)) ** 2)
    r2_multi = 1 - (ss_res / ss_tot)

    print(f"\n  Combined model: R² = {r2_multi:.6f}")

    results['combined'] = {
        'coefficients': coeffs_multi.tolist(),
        'r_squared': float(r2_multi),
        'equation': 'cfl_1000ft = c0 + c1*index + c2*index² + c3*weight_1000lb + c4*weight_1000lb² + c5*index*weight_1000lb'
    }

    # RCR (Runway Condition Reading) correction
    # RCR affects stopping distance component
    # Lower RCR = worse conditions = longer CFL
    print("\n  RCR Correction:")
    print("-" * 70)
    print("  RCR 23 (dry): baseline (1.0)")
    print("  RCR 12: approximately +20%")
    print("  RCR 5: approximately +50%")

    results['rcr_correction'] = {
        'baseline_rcr': 23,
        'corrections': {
            '23': 1.0,   # Dry
            '12': 1.2,   # Wet
            '5': 1.5,    # Icy/slippery
        },
        'note': 'Multiply critical field length by RCR correction factor'
    }

    return results


def visualize_fits():
    """Create visualization of the polynomial fits"""

    print("\n" + "=" * 70)
    print("Generating visualizations...")
    print("=" * 70)

    fig, axes = plt.subplots(2, 2, figsize=(14, 12))

    # 1. Takeoff Index vs Temperature at different altitudes
    ax1 = axes[0, 0]
    temps = np.array([-20, -10, 0, 10, 20, 30, 40, 50])

    alt_data = {
        0: [4.0, 4.3, 4.6, 4.9, 5.3, 5.7, 6.2, 6.7],
        3000: [5.1, 5.6, 6.2, 6.8, 7.4, 8.0, 8.7, 9.4],
        6000: [6.5, 7.3, 8.2, 9.1, 10.0, 10.9, 11.0, 11.0],
    }

    colors = ['blue', 'green', 'red']
    for (alt, indexes), color in zip(alt_data.items(), colors):
        ax1.scatter(temps, indexes, color=color, s=50, zorder=3, label=f'{alt} ft')
        valid_mask = np.array(indexes) < 11.0
        if np.sum(valid_mask) >= 3:
            coeffs = np.polyfit(temps[valid_mask], np.array(indexes)[valid_mask], 1)
            temp_smooth = np.linspace(-25, 55, 100)
            ax1.plot(temp_smooth, np.polyval(coeffs, temp_smooth), color=color, linewidth=2, alpha=0.7)

    ax1.set_xlabel('Temperature (°C)', fontsize=12)
    ax1.set_ylabel('Takeoff Index', fontsize=12)
    ax1.set_title('Takeoff Index vs Temperature (Selected Altitudes)', fontsize=14, fontweight='bold')
    ax1.grid(True, alpha=0.3)
    ax1.legend()
    ax1.set_ylim(3, 12)

    # 2. Takeoff Distance vs Index at different weights (Flaps 0)
    ax2 = axes[0, 1]
    indexes = np.array([4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0])

    weight_data = {
        20: [0.6, 1.0, 1.6, 2.3, 3.2, 4.3, 5.6, 7.1],
        35: [1.8, 2.8, 4.0, 5.5, 7.2, 9.2, 11.5, 14.0],
        50: [3.5, 5.2, 7.4, 10.0, 13.0, 14.0, 14.0, 14.0],
    }

    colors = ['blue', 'green', 'red']
    for (weight, distances), color in zip(weight_data.items(), colors):
        ax2.scatter(indexes, distances, color=color, s=50, zorder=3, label=f'{weight}k lbs')
        valid_mask = np.array(distances) < 14.0
        if np.sum(valid_mask) >= 4:
            coeffs = np.polyfit(indexes[valid_mask], np.array(distances)[valid_mask], 2)
            idx_smooth = np.linspace(3.5, 11.5, 100)
            ax2.plot(idx_smooth, np.polyval(coeffs, idx_smooth), color=color, linewidth=2, alpha=0.7)

    ax2.set_xlabel('Takeoff Index', fontsize=12)
    ax2.set_ylabel('Takeoff Ground Run (1000 ft)', fontsize=12)
    ax2.set_title('Takeoff Distance vs Index - Flaps 0° (Selected Weights)', fontsize=14, fontweight='bold')
    ax2.grid(True, alpha=0.3)
    ax2.legend()
    ax2.set_ylim(0, 15)

    # 3. Wind correction
    ax3 = axes[1, 0]
    wind_values = np.array([-40, -30, -20, -10, 0, 10, 20, 30, 40])
    wind_percent = np.array([-20, -15, -10, -5, 0, 7, 15, 25, 35])
    wind_coeffs = np.polyfit(wind_values, wind_percent, 2)

    wind_smooth = np.linspace(-45, 45, 100)
    ax3.scatter(wind_values, wind_percent, color='blue', s=50, zorder=3, label='Digitized data')
    ax3.plot(wind_smooth, np.polyval(wind_coeffs, wind_smooth), 'b-', linewidth=2, label='Quadratic fit')
    ax3.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
    ax3.axvline(x=0, color='gray', linestyle='--', alpha=0.5)
    ax3.set_xlabel('Wind (kt, negative=headwind)', fontsize=12)
    ax3.set_ylabel('Distance Change (%)', fontsize=12)
    ax3.set_title('Wind Correction', fontsize=14, fontweight='bold')
    ax3.grid(True, alpha=0.3)
    ax3.legend()

    # 4. Slope correction
    ax4 = axes[1, 1]
    slope_values = np.array([-3, -2, -1, 0, 1, 2, 3])
    slope_percent = np.array([-20, -13, -7, 0, 7, 15, 23])
    slope_coeffs = np.polyfit(slope_values, slope_percent, 1)

    slope_smooth = np.linspace(-3.5, 3.5, 100)
    ax4.scatter(slope_values, slope_percent, color='green', s=50, zorder=3, label='Digitized data')
    ax4.plot(slope_smooth, np.polyval(slope_coeffs, slope_smooth), 'g-', linewidth=2, label='Linear fit')
    ax4.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
    ax4.axvline(x=0, color='gray', linestyle='--', alpha=0.5)
    ax4.set_xlabel('Slope (%, negative=downhill)', fontsize=12)
    ax4.set_ylabel('Distance Change (%)', fontsize=12)
    ax4.set_title('Slope Correction', fontsize=14, fontweight='bold')
    ax4.grid(True, alpha=0.3)
    ax4.legend()

    plt.tight_layout()
    output_path = Path(__file__).parent / 'regression_fit.png'
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"Visualization saved to: {output_path}")


def main():
    takeoff_index_data = create_takeoff_index_regression()
    takeoff_distance_data = create_takeoff_distance_regression()
    wind_correction_data = create_wind_correction_regression()
    slope_correction_data = create_slope_correction_regression()
    critical_field_length_data = create_critical_field_length_regression()

    regression_data = {
        'aircraft': 'A-10C',
        'engine': 'TF34-GE-100A (2x)',
        'source': 'TO 1A-10C-1-1 Flight Manual',
        'charts': [
            'Takeoff Index',
            'Takeoff Run - Flaps 0°',
            'Takeoff Run - Flaps 7°',
            'Critical Field Length'
        ],
        'method': 'Polynomial regression',
        'notes': [
            'Takeoff index is calculated from temperature (°C) and pressure altitude',
            'Takeoff distance is calculated from takeoff index and gross weight',
            'Corrections applied for wind and runway slope',
            'Flaps 7° provides approximately 10-15% reduction in takeoff distance',
            'Critical field length accounts for single-engine failure scenarios',
            'RCR (Runway Condition Reading) affects stopping distance'
        ],
        'takeoffIndex': takeoff_index_data,
        'takeoffDistance': takeoff_distance_data,
        'windCorrection': wind_correction_data,
        'slopeCorrection': slope_correction_data,
        'criticalFieldLength': critical_field_length_data
    }

    output_file = Path(__file__).parent / "regression_data.json"
    with open(output_file, 'w') as f:
        json.dump(regression_data, f, indent=2)

    print(f"\nRegression data saved to: {output_file}")

    visualize_fits()

    print("\n" + "=" * 70)
    print("A-10C TAKEOFF DISTANCE REGRESSION ANALYSIS COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
