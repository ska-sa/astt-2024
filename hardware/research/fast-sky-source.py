"""Print a synthetic above-horizon source; never post commands or change the Sun source."""

import argparse
from datetime import datetime, timezone
import json
import math


def fast_sky_source(year: int, longitude: float, period_minutes: float = 1.0) -> dict:
    """Use existing RA/DEC fields for a repeating arc above the local horizon.

    Match RA's slope to sidereal time to hold hour angle at 30 degrees.
    Oscillate DEC between -15 and +15 degrees over the requested period.
    At latitude -33.94448 this gives EL 33.33..56.98 and AZ -62.41..-35.31.
    This is a synthetic pattern, not a Sun prediction. Regenerate for another
    year/longitude and recheck the arc before using a different latitude.
    """
    if not math.isfinite(period_minutes) or period_minutes <= 0:
        raise ValueError('period_minutes must be positive and finite')
    if not math.isfinite(longitude) or not -180 <= longitude <= 180:
        raise ValueError('longitude must be between -180 and 180 degrees')
    jan1 = datetime(year, 1, 1, tzinfo=timezone.utc)
    days_j2000 = (jan1.timestamp() - 946728000.0) / 86400.0
    sidereal_degrees_per_day = 360.98564736629
    lst_hours = ((280.46061837 + sidereal_degrees_per_day * days_j2000 + longitude) % 360) / 15
    slope = sidereal_degrees_per_day / 15
    # Firmware uses day 1 at January 1 midnight, rather than elapsed minutes.
    intercept = (lst_hours - 2 - slope) % 24
    return dict(name=f'Fast sky sweep ({period_minutes:g} min, {year})',
                m_1=slope, m_2=slope, c_1=intercept, c_2=intercept,
                T_ra=366.0, A=15.0, phi=0.0, D=0.0, T_dec=period_minutes / (1440 * 2 * math.pi))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--year', type=int, default=datetime.now(timezone.utc).year)
    parser.add_argument('--longitude', type=float, default=18.47869)
    parser.add_argument('--period-minutes', type=float, default=1.0)
    args = parser.parse_args()
    print(json.dumps(fast_sky_source(args.year, args.longitude, args.period_minutes), indent=2))
