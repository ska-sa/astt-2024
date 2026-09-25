"""
python mimic_hardware.py --mode live --interval 2
"""
import math
import time
import random
import sqlite3
import argparse
from datetime import datetime, timedelta, timezone

import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"
DB_PATH = "databases/development.db"
TELESCOPE_ID = 1


def build_reading(az, el):
    return {
        "telescope_id": TELESCOPE_ID,
        "azimuth_angle": round(az, 2),
        "elevation_angle": round(el, 2),
        "latitude": -30.72,
        "longitude": 21.41,
        "altitude": 1000.0,
        "gyroscope_x": 0,
        "gyroscope_y": 0,
        "gyroscope_z": 0,
        "acceleration_x": 0,
        "acceleration_y": 0,
        "acceleration_z": 0,
        "magnetic_field_x": 0,
        "magnetic_field_y": 0,
        "magnetic_field_z": 0,
        "health_status": "OK",
        "movement_status": "MOVING",
    }


def live(interval):
    print(f"posting every {interval}s, ctrl c to stop")
    t = 0
    while True:
        az = 180 + 170 * math.sin(t / 60.0)
        el = 45 + 40 * math.sin(t / 90.0)
        payload = build_reading(az, el)

        try:
            r = requests.post(f"{BASE_URL}/readings", json=payload, timeout=5)
            print(f"POST {r.status_code}  az={payload['azimuth_angle']}  el={payload['elevation_angle']}")
        except Exception as e:
            print("post failed:", e)

        # poll the command endpoint like the esp does
        try:
            c = requests.get(f"{BASE_URL}/commands/{TELESCOPE_ID}/latest", timeout=5)
            if c.status_code == 200:
                cmd = c.json()
                if cmd.get("command_type") == "point":
                    print("  cmd point ->", cmd["point"])
                elif cmd.get("command_type") == "track":
                    print("  cmd track ->", cmd["track"]["source"]["name"])
        except Exception:
            pass

        t += interval
        time.sleep(interval)


def backfill(hours, step):
    # writes straight to sqlite so created_at can be in the past, api cannot do that
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start = now - timedelta(hours=hours)

    rows = 0
    t = start
    i = 0
    while t < now:
        az = 180 + 170 * math.sin(i / 60.0) + random.uniform(-1, 1)
        el = 45 + 40 * math.sin(i / 90.0) + random.uniform(-1, 1)

        cur.execute(
            "INSERT INTO reading ("
            "telescope_id, azimuth_angle, elevation_angle, latitude, longitude, altitude,"
            "gyroscope_x, gyroscope_y, gyroscope_z,"
            "acceleration_x, acceleration_y, acceleration_z,"
            "magnetic_field_x, magnetic_field_y, magnetic_field_z,"
            "health_status, movement_status, created_at"
            ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                TELESCOPE_ID, round(az, 2), round(el, 2), -30.72, 21.41, 1000.0,
                0, 0, 0,
                0, 0, 0,
                0, 0, 0,
                "OK", "MOVING", t.strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )

        rows += 1
        i += 1
        t += timedelta(seconds=step)

    conn.commit()
    conn.close()
    print(f"inserted {rows} rows covering the last {hours}h")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=["live", "backfill"], default="live")
    p.add_argument("--interval", type=int, default=2)
    p.add_argument("--hours", type=int, default=6)
    p.add_argument("--step", type=int, default=30)
    args = p.parse_args()

    if args.mode == "live":
        live(args.interval)
    else:
        backfill(args.hours, args.step)