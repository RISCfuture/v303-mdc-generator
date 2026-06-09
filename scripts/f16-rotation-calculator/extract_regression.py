#!/usr/bin/env python3
"""
Extract F-16C chart data using polynomial regression.
Convert from lookup tables to regression equations.
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
    r_squared = 1 - (ss_res / ss_tot)
    return coefficients, r_squared


def create_takeoff_regression():
    """Fit polynomial to F-16C takeoff speed data"""

    # Digitized from Figure B2-2
    gw_points = np.array([15, 20, 25, 30, 35, 40, 45])
    speed_points = np.array([120, 135, 147, 158, 168, 178, 188])

    print("=" * 70)
    print("F-16C TAKEOFF SPEED REGRESSION ANALYSIS")
    print("=" * 70)

    for degree in [1, 2, 3]:
        coeffs, r2 = fit_polynomial_to_data(gw_points, speed_points, degree)
        print(f"\n{degree}-degree polynomial - R² = {r2:.6f}")
        print(f"  Coefficients: {coeffs}")

    # Use degree 2
    coeffs, r2 = fit_polynomial_to_data(gw_points, speed_points, 2)

    return {
        "coefficients": coeffs.tolist(),
        "r_squared": float(r2),
        "degree": 2,
        "equation": f"{coeffs[0]:.6f}*gw² + {coeffs[1]:.6f}*gw + {coeffs[2]:.6f}",
    }


def create_refusal_regression():
    """Fit polynomial to F-16C refusal speed data"""

    print("\n" + "=" * 70)
    print("F-16C REFUSAL SPEED REGRESSION ANALYSIS")
    print("=" * 70)

    # Sample gross weights
    gw_points = np.array([15, 20, 25, 30, 35, 40, 45])

    # Refusal speeds for different conditions (digitized from charts)
    conditions = {
        "nonAB": {
            "dry": np.array([90, 105, 118, 130, 140, 150, 160]),
            "wet": np.array([105, 122, 137, 150, 162, 173, 184]),
            "snow": np.array([140, 160, 178, 193, 206, 218, 230]),
            "ice": np.array([165, 188, 207, 223, 237, 250, 262]),
        },
        "AB": {
            "dry": np.array([75, 88, 100, 110, 120, 128, 136]),
            "wet": np.array([88, 103, 116, 127, 137, 146, 155]),
            "snow": np.array([120, 138, 154, 168, 180, 191, 202]),
            "ice": np.array([143, 164, 182, 197, 211, 223, 235]),
        },
    }

    results = {"nonAB": {}, "AB": {}}

    for power_setting in ["nonAB", "AB"]:
        print(f"\n{power_setting}:")
        print("-" * 70)

        for condition, speeds in conditions[power_setting].items():
            coeffs, r2 = fit_polynomial_to_data(gw_points, speeds, 2)

            print(f"{condition.capitalize():<6} - R² = {r2:.6f}")
            print(f"  Coefficients: {coeffs}")

            results[power_setting][condition] = {
                "coefficients": coeffs.tolist(),
                "r_squared": float(r2),
                "degree": 2,
                "rcr": {"dry": 23, "wet": 18, "snow": 8, "ice": 4}[condition],
            }

    return results


def visualize_f16_fits():
    """Create visualization for F-16C regression fits"""

    print("\n" + "=" * 70)
    print("Generating F-16C visualization...")
    print("=" * 70)

    # Takeoff speed
    gw_points = np.array([15, 20, 25, 30, 35, 40, 45])
    speed_points = np.array([120, 135, 147, 158, 168, 178, 188])
    coeffs_takeoff = np.polyfit(gw_points, speed_points, 2)

    # Refusal speeds
    dry_ab = np.array([75, 88, 100, 110, 120, 128, 136])
    wet_ab = np.array([88, 103, 116, 127, 137, 146, 155])
    snow_ab = np.array([120, 138, 154, 168, 180, 191, 202])
    ice_ab = np.array([143, 164, 182, 197, 211, 223, 235])

    coeffs_dry = np.polyfit(gw_points, dry_ab, 2)
    coeffs_wet = np.polyfit(gw_points, wet_ab, 2)
    coeffs_snow = np.polyfit(gw_points, snow_ab, 2)
    coeffs_ice = np.polyfit(gw_points, ice_ab, 2)

    # Generate smooth curves
    gw_smooth = np.linspace(15, 45, 100)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

    # Takeoff speed
    ax1.scatter(gw_points, speed_points, color="blue", s=50, zorder=3, label="Sampled data")
    ax1.plot(
        gw_smooth, np.polyval(coeffs_takeoff, gw_smooth), "b-", linewidth=2, label="Quadratic fit"
    )
    ax1.set_xlabel("Gross Weight (1,000 lbs)", fontsize=12)
    ax1.set_ylabel("Takeoff Speed (KIAS)", fontsize=12)
    ax1.set_title("F-16C Takeoff Speed - Polynomial Regression", fontsize=14, fontweight="bold")
    ax1.grid(True, alpha=0.3)
    ax1.legend()

    # Refusal speed (AB)
    ax2.scatter(gw_points, dry_ab, color="green", s=50, zorder=3, label="Dry (RCR 23)")
    ax2.plot(gw_smooth, np.polyval(coeffs_dry, gw_smooth), color="green", linewidth=2)

    ax2.scatter(gw_points, wet_ab, color="blue", s=50, zorder=3, label="Wet (RCR 18)")
    ax2.plot(gw_smooth, np.polyval(coeffs_wet, gw_smooth), color="blue", linewidth=2)

    ax2.scatter(gw_points, snow_ab, color="orange", s=50, zorder=3, label="Snow (RCR 8)")
    ax2.plot(gw_smooth, np.polyval(coeffs_snow, gw_smooth), color="orange", linewidth=2)

    ax2.scatter(gw_points, ice_ab, color="red", s=50, zorder=3, label="Ice (RCR 4)")
    ax2.plot(gw_smooth, np.polyval(coeffs_ice, gw_smooth), color="red", linewidth=2)

    ax2.set_xlabel("Gross Weight (1,000 lbs)", fontsize=12)
    ax2.set_ylabel("Refusal Speed (KIAS)", fontsize=12)
    ax2.set_title(
        "F-16C Refusal Speed (AB) - Polynomial Regression", fontsize=14, fontweight="bold"
    )
    ax2.grid(True, alpha=0.3)
    ax2.legend()

    plt.tight_layout()
    output_path = Path(__file__).parent / "regression_fit.png"
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    print(f"Visualization saved to: {output_path}")


def main():
    takeoff_data = create_takeoff_regression()
    refusal_data = create_refusal_regression()

    regression_data = {
        "aircraft": "F-16C",
        "engine": "F110-GE-129",
        "source": "TO GR1F-16CJ-1-1 Supplemental Flight Manual, pages 284-293",
        "method": "Polynomial regression (degree 2)",
        "notes": [
            "Polynomial regression provides better fit for slightly curved chart lines",
            "Quadratic fit (degree 2) provides R² > 0.999 for all curves",
            "Coefficients in descending order: [a, b, c] for a*x² + b*x + c",
            "For all equations: x = gross weight in thousands of lbs",
            "Power corrections (MIL -10, AB -15) still applied after base calculation",
            "CG, pitch, wind, slope corrections applied as documented",
        ],
        "takeoffSpeed": takeoff_data,
        "refusalSpeed": refusal_data,
    }

    output_file = Path(__file__).parent / "regression_data.json"
    with open(output_file, "w") as f:
        json.dump(regression_data, f, indent=2)

    print(f"\n✅ Regression data saved to: {output_file}")

    visualize_f16_fits()

    print("\n" + "=" * 70)
    print("✅ F-16C REGRESSION ANALYSIS COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
