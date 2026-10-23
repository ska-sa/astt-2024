# pip install numpy matplotlib pygeomag
from datetime import date

import numpy as np
import matplotlib.pyplot as plt
from pygeomag import GeoMag

# ---------- Configuration ----------
LAT = -33.944440
LON = 18.479819
ALT_KM = 0.006  # 6 metres.
YEAR = date.today().year  # Set to 2026 to keep this experiment reproducible.

wmm = GeoMag(coefficients_file="wmm/WMM_2025.COF")


def wmm_declination(year: float) -> float:
    return wmm.calculate(
        glat=LAT, glon=LON, alt=ALT_KM, time=float(year)
    ).d


def polynomial_declination(year, coefficients):
    """Return declination in degrees, using YEAR as the time reference."""
    t = np.asarray(year, dtype=float) - YEAR
    a, b, c = coefficients
    return (a * t + b) * t + c


def main() -> None:
    if not 2025 <= YEAR <= 2028:
        raise ValueError(
            "Both years must be within WMM2025's 2025-2029 range."
        )

    # Full current year + next year.
    # WMM supplies model values, not actual field measurements.
    years = np.linspace(YEAR, YEAR + 2, 240, endpoint=False)
    reference = np.array([wmm_declination(y) for y in years])

    this_year = years < YEAR + 1
    next_year = ~this_year

    # Fit THIS year only. Do not fit next year's reference values.
    coefficients = np.polyfit(
        years[this_year] - YEAR,
        reference[this_year],
        2,
    )
    predicted = polynomial_declination(years, coefficients)

    # Print errors instead of adding another plot.
    for label, mask in (
        (f"{YEAR} fitting error", this_year),
        (f"{YEAR + 1} difference from WMM projection", next_year),
    ):
        error = np.abs(predicted[mask] - reference[mask])
        print(
            f"{label}: "
            f"MAE={error.mean():.8f} deg, "
            f"max={error.max():.8f} deg"
        )

    a, b, c = coefficients
    print(
        f"\nD(year) = ({a:.12e} * t + ({b:.12e})) * t + ({c:.12e})"
    )
    print(f"t = year - {YEAR}")

    print(f"""
// Arduino C++: same coefficients and time reference.
// Fixed location; compared against WMM for {YEAR}-{YEAR + 1}.
float magneticDeclination(float year) {{
    const float t = year - {YEAR}.0f;
    return ({a:.12e}f * t + ({b:.12e}f)) * t + ({c:.12e}f);
}}
""")

    # One graph: WMM reference points and our quadratic.
    plt.figure(figsize=(10, 5))
    plt.plot(
        years[::10], reference[::10], "o",
        markersize=4, label="WMM reference",
    )
    plt.plot(
        years, predicted, "--",
        label="Quadratic approximation",
    )

    # Separates this year's fit from next year's prediction.
    plt.axvline(YEAR + 1, linestyle=":", linewidth=1)

    plt.title(f"Magnetic declination: fit {YEAR}, predict {YEAR + 1}")
    plt.xlabel("Decimal year")
    plt.ylabel("Declination (degrees, east-positive)")
    plt.xlim(YEAR, YEAR + 2)
    plt.ticklabel_format(axis="both", style="plain", useOffset=False)
    plt.grid(alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    main()


# ---------- Future integration ----------
# TESTING ONLY: keep this experiment separate from the ASTT app/firmware.
# Later, implement the equation as a standalone utility called by the app
# layer, using the same coefficients and reference year when porting to C++.
# For the demo, hardcode the coefficients after checking the error budget.
# Recheck annually and before changing location or extending the date range.
# Agreement with WMM does not establish real-world heading accuracy.
# True heading = (magnetic heading + east-positive declination) modulo 360.
# Magnetometer calibration and interference checks are still required.