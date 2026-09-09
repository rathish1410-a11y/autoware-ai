"""
Anomaly Detection Engine — rule-based, runs synchronously after each event.

Detection rules:
  1. Dwell-time check: item in a zone longer than 2x average -> "stuck"
  2. Sequence check: event history skips an expected zone or goes in reverse -> "unusual_movement"
  3. Duplicate check: same item scanned in two zones within an implausible time window -> "misplaced" / "duplicate_scan"
  4. Quantity check: scanned quantity doesn't match expected -> "quantity_mismatch"
  5. Damage check: simulated random flag on scan events (placeholder for vision-based damage classifier)
  6. Environment check: temperature/humidity outside safe range -> "environment"

Each detected anomaly produces a human-readable explanation string.
"""
from datetime import datetime, timedelta, timezone
import random
from config import TEMP_MIN, TEMP_MAX, HUMIDITY_MIN, HUMIDITY_MAX, DWELL_MULTIPLIER, ZONE_FLOW
from db import db


# In-memory dwell-time tracking: {(item_id, zone_id): first_seen_timestamp}
_dwell_tracker: dict[tuple[int, int], datetime] = {}

# Track last scan per item for duplicate detection: {item_id: (zone_id, timestamp)}
_last_scan: dict[int, tuple[int, datetime]] = {}


async def check_dwell_time(item_id: int, zone_id: int, zone_name: str,
                           zone_type: str, now: datetime) -> dict | None:
    """Check if an item has been in a zone longer than 2x the average dwell time."""
    key = (item_id, zone_id)
    if key not in _dwell_tracker:
        _dwell_tracker[key] = now
        return None

    dwell_seconds = (now - _dwell_tracker[key]).total_seconds()

    # Average dwell times per zone type (seconds) — tuned for the simulator's pace
    avg_dwell = {
        "receiving": 30,
        "storage": 60,
        "picking": 25,
        "packing": 35,
        "dispatch": 20,
    }
    threshold = avg_dwell.get(zone_type, 30) * DWELL_MULTIPLIER

    if dwell_seconds > threshold:
        _dwell_tracker.pop(key, None)
        return {
            "anomaly_type": "stuck",
            "severity": "high" if dwell_seconds > threshold * 1.5 else "medium",
            "explanation": (
                f"Item #{item_id} has been in Zone {zone_name} ({zone_type}) for "
                f"{int(dwell_seconds)}s — exceeds 2x the average dwell time of "
                f"{int(threshold/2)}s for {zone_type} zones. Flagged as stuck."
            ),
        }
    return None


async def check_sequence(item_id: int, zone_type: str, zone_name: str,
                         sku: str) -> dict | None:
    """Check if the item's event history skips an expected zone or goes in reverse."""
    events = await db.select("events", "zone_id,event_type,timestamp",
                             filters={"item_id": item_id},
                             order="timestamp.asc", limit=50)

    if len(events) < 2:
        return None

    # Get zone types for each event
    zone_ids = [e["zone_id"] for e in events if e["zone_id"]]
    if not zone_ids:
        return None

    zones = await db.select("warehouse_zones", "id,type,name",
                            filters=None)
    zone_map = {z["id"]: z for z in zones}

    visited_types = []
    for zid in zone_ids:
        z = zone_map.get(zid)
        if z:
            visited_types.append(z["type"])

    # Check for reverse movement (going backwards in the flow)
    for i in range(1, len(visited_types)):
        prev_idx = ZONE_FLOW.index(visited_types[i-1]) if visited_types[i-1] in ZONE_FLOW else -1
        curr_idx = ZONE_FLOW.index(visited_types[i]) if visited_types[i] in ZONE_FLOW else -1
        if prev_idx >= 0 and curr_idx >= 0 and curr_idx < prev_idx:
            return {
                "anomaly_type": "unusual_movement",
                "severity": "high",
                "explanation": (
                    f"Item {sku} moved from {visited_types[i-1]} to {visited_types[i]} — "
                    f"reverse flow detected. Expected sequence: "
                    f"{' → '.join(ZONE_FLOW)}. Flagged as unusual movement."
                ),
            }

    # Check for skipped zones (only check last step)
    if len(visited_types) >= 2:
        prev_type = visited_types[-2]
        curr_type = visited_types[-1]
        if prev_type in ZONE_FLOW and curr_type in ZONE_FLOW:
            prev_idx = ZONE_FLOW.index(prev_type)
            curr_idx = ZONE_FLOW.index(curr_type)
            if curr_idx > prev_idx + 1:
                skipped = ZONE_FLOW[prev_idx + 1:curr_idx]
                return {
                    "anomaly_type": "unusual_movement",
                    "severity": "medium",
                    "explanation": (
                        f"Item {sku} moved from {prev_type} to {curr_type}, "
                        f"skipping {', '.join(skipped)} zone(s). "
                        f"Expected sequence: {' → '.join(ZONE_FLOW)}."
                    ),
                }
    return None


async def check_duplicate_scan(item_id: int, zone_id: int, zone_name: str,
                               sku: str, now: datetime) -> dict | None:
    """Check if the same item was scanned in two different zones within an implausible time window."""
    if item_id in _last_scan:
        prev_zone, prev_time = _last_scan[item_id]
        if prev_zone != zone_id:
            time_diff = (now - prev_time).total_seconds()
            # Implausible: less than 30 seconds between scans in different zones
            if time_diff < 30:
                zones = await db.select("warehouse_zones", "id,name",
                                        filters=None)
                zone_map = {z["id"]: z["name"] for z in zones}
                prev_name = zone_map.get(prev_zone, f"Zone {prev_zone}")
                return {
                    "anomaly_type": "duplicate_scan",
                    "severity": "critical",
                    "explanation": (
                        f"Item {sku} scanned in Zone {prev_name} and Zone {zone_name} "
                        f"within {int(time_diff)}s — physically implausible. "
                        f"Flagged as duplicate scan / misplaced."
                    ),
                }
    _last_scan[item_id] = (zone_id, now)
    return None


async def check_quantity_mismatch(item_id: int, scanned_qty: int,
                                  expected_qty: int, sku: str) -> dict | None:
    """Check if scanned quantity doesn't match expected quantity."""
    if expected_qty > 0 and scanned_qty != expected_qty:
        severity = "high" if abs(scanned_qty - expected_qty) >= 3 else "medium"
        return {
            "anomaly_type": "quantity_mismatch",
            "severity": severity,
            "explanation": (
                f"Item {sku}: scanned quantity ({scanned_qty}) does not match "
                f"expected quantity ({expected_qty}). "
                f"Discrepancy of {abs(scanned_qty - expected_qty)} unit(s)."
            ),
        }
    return None


def check_damage(item_id: int, sku: str) -> dict | None:
    """
    Simulated damage detection — placeholder for a real vision-based damage classifier.
    In production, this would be replaced by a CV model analyzing camera feeds.
    """
    # 2% chance of damage detection on any scan event (configurable)
    if random.random() < 0.02:
        return {
            "anomaly_type": "damaged",
            "severity": "high",
            "explanation": (
                f"Item {sku} flagged as damaged during scan. "
                f"[SIMULATED — placeholder for vision-based damage classifier. "
                f"In production, a CV model would analyze camera feeds at the scan station.]"
            ),
        }
    return None


def check_environment(zone_id: int, zone_name: str, temperature: float,
                      humidity: float) -> dict | None:
    """Check if temperature or humidity is outside safe operating range."""
    alerts = []
    if temperature > TEMP_MAX:
        alerts.append(f"temperature {temperature:.1f}°C exceeds safe max of {TEMP_MAX}°C")
    elif temperature < TEMP_MIN:
        alerts.append(f"temperature {temperature:.1f}°C below safe min of {TEMP_MIN}°C")

    if humidity > HUMIDITY_MAX:
        alerts.append(f"humidity {humidity:.1f}% exceeds safe max of {HUMIDITY_MAX}%")
    elif humidity < HUMIDITY_MIN:
        alerts.append(f"humidity {humidity:.1f}% below safe min of {HUMIDITY_MIN}%")

    if alerts:
        severity = "critical" if temperature > TEMP_MAX + 5 or humidity > HUMIDITY_MAX + 10 else "high"
        return {
            "anomaly_type": "environment",
            "severity": severity,
            "explanation": (
                f"Zone {zone_name}: {'; '.join(alerts)}. "
                f"Environmental conditions outside safe operating range."
            ),
        }
    return None


async def run_checks(event: dict, item: dict | None, zone: dict | None) -> list[dict]:
    """
    Run all anomaly checks for a newly generated event.
    Returns a list of anomaly dicts (may be empty).
    """
    anomalies = []
    now = datetime.now(timezone.utc)
    item_id = event.get("item_id")
    zone_id = event.get("zone_id")
    sku = item.get("sku", f"#{item_id}") if item else f"#{item_id}"
    zone_name = zone.get("name", f"Zone {zone_id}") if zone else f"Zone {zone_id}"
    zone_type = zone.get("type", "") if zone else ""

    if item_id and zone_id:
        # Dwell time check
        result = await check_dwell_time(item_id, zone_id, zone_name, zone_type, now)
        if result:
            anomalies.append(result)

        # Sequence check (only for move-type events, not scans)
        if event.get("event_type") in ("moved", "picked", "packed", "dispatched"):
            result = await check_sequence(item_id, zone_type, zone_name, sku)
            if result:
                anomalies.append(result)

        # Duplicate scan check (only for scan events)
        if event.get("event_type") == "scanned":
            result = await check_duplicate_scan(item_id, zone_id, zone_name, sku, now)
            if result:
                anomalies.append(result)

    # Quantity mismatch check
    if item and event.get("event_type") == "scanned":
        scanned = event.get("quantity", 0)
        expected = event.get("expected_quantity") or item.get("expected_quantity", 0)
        result = await check_quantity_mismatch(item_id, scanned, expected, sku)
        if result:
            anomalies.append(result)

        # Damage check (simulated)
        result = check_damage(item_id, sku)
        if result:
            anomalies.append(result)

    return anomalies


async def check_environment_reading(zone_id: int, zone_name: str,
                                     temperature: float, humidity: float) -> dict | None:
    """Run environment checks for a new environment reading."""
    return check_environment(zone_id, zone_name, temperature, humidity)


def reset_tracker(item_id: int, zone_id: int):
    """Clear dwell tracker when an item leaves a zone."""
    _dwell_tracker.pop((item_id, zone_id), None)


async def check_stuck_items(item_zones: dict[int, tuple[int, datetime]],
                             zone_map: dict[int, dict]) -> list[dict]:
    """
    Periodically check all tracked items for stuck conditions.
    item_zones: {item_id: (zone_id, arrival_time)}
    zone_map: {zone_id: zone_dict}
    Returns list of anomaly dicts.
    """
    anomalies = []
    now = datetime.now(timezone.utc)
    avg_dwell = {
        "receiving": 30, "storage": 60, "picking": 25,
        "packing": 35, "dispatch": 20,
    }

    checked = list(item_zones.items())
    for item_id, (zone_id, arrival) in checked:
        zone = zone_map.get(zone_id)
        if not zone:
            continue
        zone_type = zone["type"]
        threshold = avg_dwell.get(zone_type, 30) * DWELL_MULTIPLIER
        dwell_seconds = (now - arrival).total_seconds()

        if dwell_seconds > threshold:
            anomalies.append({
                "item_id": item_id,
                "anomaly_type": "stuck",
                "severity": "high" if dwell_seconds > threshold * 1.5 else "medium",
                "explanation": (
                    f"Item #{item_id} has been in Zone {zone['name']} ({zone_type}) for "
                    f"{int(dwell_seconds)}s — exceeds 2x the average dwell time of "
                    f"{int(threshold/2)}s for {zone_type} zones. Flagged as stuck."
                ),
            })
    return anomalies
