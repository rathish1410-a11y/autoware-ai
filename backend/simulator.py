"""
Event Simulator — async background task that generates a continuous stream of
realistic warehouse events and broadcasts them over WebSocket.

Generates:
  - Items arriving at receiving, moving through the zone sequence
  - Workers performing actions in zones
  - Environment readings drifting normally
  - Controlled anomalies at a configurable rate (~5-10% of items)

In DEMO_MODE, a pre-scripted sequence reliably produces:
  - One misplaced/duplicate-scan item within ~15s
  - One stuck item within ~45s
  - One quantity mismatch within ~30s
  - One environment alert within ~60s
"""
import asyncio
import random
from datetime import datetime, timezone
import json
from db import db
from config import (
    ANOMALY_RATE, EVENT_INTERVAL_MIN, EVENT_INTERVAL_MAX, DEMO_MODE,
    TEMP_MIN, TEMP_MAX, HUMIDITY_MIN, HUMIDITY_MAX,
)
from anomaly_engine import run_checks, check_environment_reading, reset_tracker, check_stuck_items

# Connection manager reference (set by main.py)
_broadcast_fn = None

# In-memory state for the simulator
_zones: list[dict] = []
_zone_map: dict[int, dict] = {}
_workers: list[dict] = []
_items: list[dict] = []
_sku_counter = 4800

# Environment state per zone: {zone_id: {"temp": float, "humidity": float}}
_env_state: dict[int, dict[str, float]] = {}

# Track which items are in which zone and when they arrived
_item_zone: dict[int, tuple[int, datetime]] = {}

# Demo script state
_demo_step = 0
_demo_item_misplaced: int | None = None
_demo_item_stuck: int | None = None
_demo_item_quantity: int | None = None


def set_broadcast_fn(fn):
    global _broadcast_fn
    _broadcast_fn = fn


async def _broadcast(message: dict):
    if _broadcast_fn:
        await _broadcast_fn(message)


async def _seed_database():
    """Seed the database with initial zones, workers, and items if empty."""
    global _zones, _zone_map, _workers, _items, _sku_counter

    # Check if zones exist
    existing = await db.select("warehouse_zones", "*")
    if existing:
        _zones = existing
        _zone_map = {z["id"]: z for z in _zones}
        _workers = await db.select("workers", "*")
        _items = await db.select("items", "*", limit=100)
        if _items:
            skus = [int(i["sku"].split("-")[1]) for i in _items if i["sku"].startswith("SKU-")]
            _sku_counter = max(skus) + 1 if skus else 4800
        # Initialize env state
        for z in _zones:
            _env_state[z["id"]] = {"temp": 20.0, "humidity": 45.0}
        return

    # Create zones in a grid layout
    zone_defs = [
        ("Receiving A", "receiving", 0, 0),
        ("Storage B", "storage", 1, 0),
        ("Storage C", "storage", 2, 0),
        ("Picking D", "picking", 0, 1),
        ("Packing E", "packing", 1, 1),
        ("Dispatch F", "dispatch", 2, 1),
    ]
    for name, ztype, gx, gy in zone_defs:
        result = await db.insert("warehouse_zones", {
            "name": name, "type": ztype, "grid_x": gx, "grid_y": gy
        })
        zone = result[0]
        _zones.append(zone)
        _zone_map[zone["id"]] = zone
        _env_state[zone["id"]] = {"temp": 20.0, "humidity": 45.0}

    # Create workers
    worker_names = ["Alice Chen", "Bob Martinez", "Carol Singh", "David Kim", "Eve Patel"]
    for name in worker_names:
        result = await db.insert("workers", {
            "name": name,
            "current_zone_id": random.choice(_zones)["id"],
            "shift": random.choice(["day", "night"]),
        })
        _workers.append(result[0])

    # Create initial items
    categories = ["Electronics", "Apparel", "Food", "Industrial", "Books"]
    item_names = {
        "Electronics": ["Wireless Mouse", "USB Cable", "Bluetooth Speaker", "Power Bank"],
        "Apparel": ["Cotton T-Shirt", "Denim Jacket", "Running Shoes"],
        "Food": ["Organic Coffee", "Dark Chocolate", "Green Tea"],
        "Industrial": ["Wrench Set", "Safety Gloves", "Adhesive Tape"],
        "Books": ["Python Guide", "Sci-Fi Novel", "Cookbook"],
    }
    for i in range(20):
        cat = random.choice(categories)
        name = random.choice(item_names[cat])
        _sku_counter += 1
        sku = f"SKU-{_sku_counter}"
        zone = random.choice([z for z in _zones if z["type"] in ("storage", "receiving")])
        result = await db.insert("items", {
            "sku": sku,
            "name": name,
            "category": cat,
            "current_zone_id": zone["id"],
            "status": "in_stock",
            "expected_quantity": random.randint(5, 50),
            "scanned_quantity": random.randint(5, 50),
        })
        item = result[0]
        _items.append(item)
        _item_zone[item["id"]] = (zone["id"], datetime.now(timezone.utc))


async def _create_item() -> dict:
    """Create a new item arriving at the receiving zone."""
    global _sku_counter
    categories = ["Electronics", "Apparel", "Food", "Industrial", "Books"]
    item_names = {
        "Electronics": ["Wireless Mouse", "USB Cable", "Bluetooth Speaker", "Power Bank", "HDMI Cable"],
        "Apparel": ["Cotton T-Shirt", "Denim Jacket", "Running Shoes", "Wool Scarf"],
        "Food": ["Organic Coffee", "Dark Chocolate", "Green Tea", "Almond Granola"],
        "Industrial": ["Wrench Set", "Safety Gloves", "Adhesive Tape", "LED Bulb"],
        "Books": ["Python Guide", "Sci-Fi Novel", "Cookbook", "Art History"],
    }
    cat = random.choice(categories)
    name = random.choice(item_names[cat])
    _sku_counter += 1
    sku = f"SKU-{_sku_counter}"
    receiving = next(z for z in _zones if z["type"] == "receiving")
    expected_qty = random.randint(5, 50)

    result = await db.insert("items", {
        "sku": sku,
        "name": name,
        "category": cat,
        "current_zone_id": receiving["id"],
        "status": "in_stock",
        "expected_quantity": expected_qty,
        "scanned_quantity": 0,
    })
    item = result[0]
    _items.append(item)
    _item_zone[item["id"]] = (receiving["id"], datetime.now(timezone.utc))
    return item


def _next_zone_in_flow(current_zone: dict) -> dict | None:
    """Get the next zone in the standard flow sequence."""
    flow_order = ["receiving", "storage", "picking", "packing", "dispatch"]
    try:
        idx = flow_order.index(current_zone["type"])
    except ValueError:
        return None
    if idx + 1 >= len(flow_order):
        return None
    next_type = flow_order[idx + 1]
    candidates = [z for z in _zones if z["type"] == next_type]
    return random.choice(candidates) if candidates else None


async def _create_event(item: dict, zone: dict, worker: dict,
                        event_type: str, quantity: int = 1,
                        expected_quantity: int | None = None) -> dict:
    """Create an event, write to DB, and return it."""
    event_data = {
        "item_id": item["id"],
        "worker_id": worker["id"],
        "zone_id": zone["id"],
        "event_type": event_type,
        "quantity": quantity,
    }
    if expected_quantity is not None:
        event_data["expected_quantity"] = expected_quantity

    result = await db.insert("events", event_data)
    event = result[0]
    return event


async def _move_item(item: dict, from_zone: dict, to_zone: dict,
                     worker: dict, event_type: str = "moved") -> dict:
    """Move an item to a new zone and create the corresponding event."""
    # Update item's current zone
    await db.update("items", {"id": item["id"]}, {
        "current_zone_id": to_zone["id"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    item["current_zone_id"] = to_zone["id"]
    _item_zone[item["id"]] = (to_zone["id"], datetime.now(timezone.utc))

    # Reset dwell tracker for the old zone
    reset_tracker(item["id"], from_zone["id"])

    # Create event
    event = await _create_event(item, to_zone, worker, event_type)

    # Run anomaly checks
    anomalies = await run_checks(event, item, to_zone)

    # Broadcast the event
    await _broadcast({
        "type": "event",
        "data": {
            "id": event["id"],
            "item_id": event["item_id"],
            "item_sku": item["sku"],
            "item_name": item["name"],
            "worker_id": worker["id"],
            "worker_name": worker["name"],
            "zone_id": to_zone["id"],
            "zone_name": to_zone["name"],
            "zone_type": to_zone["type"],
            "event_type": event_type,
            "quantity": event.get("quantity", 1),
            "timestamp": event["timestamp"],
        }
    })

    # Broadcast any anomalies
    for anomaly in anomalies:
        await _save_and_broadcast_anomaly(anomaly, event, item)

    return event


async def _save_and_broadcast_anomaly(anomaly: dict, event: dict,
                                      item: dict | None = None):
    """Save an anomaly to the database and broadcast it."""
    anomaly_data = {
        "anomaly_type": anomaly["anomaly_type"],
        "severity": anomaly["severity"],
        "explanation": anomaly["explanation"],
        "event_id": event.get("id") if event else None,
    }
    if item:
        anomaly_data["item_id"] = item["id"]

    result = await db.insert("anomalies", anomaly_data)
    saved = result[0]

    await _broadcast({
        "type": "anomaly_detected",
        "data": {
            "id": saved["id"],
            "anomaly_type": saved["anomaly_type"],
            "severity": saved["severity"],
            "explanation": saved["explanation"],
            "item_id": saved.get("item_id"),
            "item_sku": item["sku"] if item else None,
            "event_id": saved.get("event_id"),
            "detected_at": saved["detected_at"],
        }
    })


async def _scan_item(item: dict, zone: dict, worker: dict,
                     scanned_qty: int | None = None,
                     expected_qty: int | None = None) -> dict:
    """Simulate a scan event for an item."""
    if scanned_qty is None:
        scanned_qty = item.get("expected_quantity", random.randint(5, 50))
    if expected_qty is None:
        expected_qty = item.get("expected_quantity", scanned_qty)

    event = await _create_event(item, zone, worker, "scanned",
                                quantity=scanned_qty,
                                expected_quantity=expected_qty)

    # Update item's scanned quantity
    await db.update("items", {"id": item["id"]}, {
        "scanned_quantity": scanned_qty,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    item["scanned_quantity"] = scanned_qty

    # Run anomaly checks
    anomalies = await run_checks(event, item, zone)

    await _broadcast({
        "type": "event",
        "data": {
            "id": event["id"],
            "item_id": event["item_id"],
            "item_sku": item["sku"],
            "item_name": item["name"],
            "worker_id": worker["id"],
            "worker_name": worker["name"],
            "zone_id": zone["id"],
            "zone_name": zone["name"],
            "zone_type": zone["type"],
            "event_type": "scanned",
            "quantity": scanned_qty,
            "expected_quantity": expected_qty,
            "timestamp": event["timestamp"],
        }
    })

    for anomaly in anomalies:
        await _save_and_broadcast_anomaly(anomaly, event, item)

    return event


async def _generate_environment_reading():
    """Generate an environment reading for a random zone with normal drift."""
    zone = random.choice(_zones)
    state = _env_state[zone["id"]]

    # Normal drift: small random walk
    state["temp"] += random.gauss(0, 0.3)
    state["temp"] = max(10, min(35, state["temp"]))
    state["humidity"] += random.gauss(0, 0.5)
    state["humidity"] = max(15, min(85, state["humidity"]))

    result = await db.insert("environment_readings", {
        "zone_id": zone["id"],
        "temperature": round(state["temp"], 1),
        "humidity": round(state["humidity"], 1),
    })
    reading = result[0]

    # Check for environment anomalies
    anomaly = await check_environment_reading(
        zone["id"], zone["name"], state["temp"], state["humidity"]
    )

    await _broadcast({
        "type": "environment",
        "data": {
            "id": reading["id"],
            "zone_id": zone["id"],
            "zone_name": zone["name"],
            "temperature": round(state["temp"], 1),
            "humidity": round(state["humidity"], 1),
            "timestamp": reading["timestamp"],
            "alert": anomaly is not None,
        }
    })

    if anomaly:
        # Save environment anomaly (no item/event context)
        anomaly_data = {
            "anomaly_type": anomaly["anomaly_type"],
            "severity": anomaly["severity"],
            "explanation": anomaly["explanation"],
        }
        result = await db.insert("anomalies", anomaly_data)
        saved = result[0]
        await _broadcast({
            "type": "anomaly_detected",
            "data": {
                "id": saved["id"],
                "anomaly_type": saved["anomaly_type"],
                "severity": saved["severity"],
                "explanation": saved["explanation"],
                "item_id": None,
                "item_sku": None,
                "event_id": None,
                "detected_at": saved["detected_at"],
            }
        })


async def _update_worker_position(worker: dict, zone: dict):
    """Move a worker to a new zone."""
    await db.update("workers", {"id": worker["id"]}, {"current_zone_id": zone["id"]})
    worker["current_zone_id"] = zone["id"]


async def _process_normal_event():
    """Generate a single normal warehouse event."""
    # Sometimes create a new item (20% chance)
    if random.random() < 0.20 and len(_items) < 50:
        item = await _create_item()
        receiving = next(z for z in _zones if z["type"] == "receiving")
        worker = random.choice(_workers)
        await _update_worker_position(worker, receiving)
        await _create_event(item, receiving, worker, "received", quantity=item["expected_quantity"])
        await _broadcast({
            "type": "event",
            "data": {
                "id": None,
                "item_id": item["id"],
                "item_sku": item["sku"],
                "item_name": item["name"],
                "worker_id": worker["id"],
                "worker_name": worker["name"],
                "zone_id": receiving["id"],
                "zone_name": receiving["name"],
                "zone_type": receiving["type"],
                "event_type": "received",
                "quantity": item["expected_quantity"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        })
        return

    # Pick an existing item and move it forward in the flow
    if not _items:
        item = await _create_item()
        return

    item = random.choice(_items[-30:])
    current_zone_id = _item_zone.get(item["id"], (None, None))[0]
    if not current_zone_id:
        receiving = next(z for z in _zones if z["type"] == "receiving")
        current_zone_id = receiving["id"]
        _item_zone[item["id"]] = (current_zone_id, datetime.now(timezone.utc))

    current_zone = _zone_map.get(current_zone_id)
    if not current_zone:
        return

    # If item is at dispatch, mark as dispatched and remove from active tracking
    if current_zone["type"] == "dispatch":
        await db.update("items", {"id": item["id"]}, {
            "status": "dispatched",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        worker = random.choice(_workers)
        event = await _create_event(item, current_zone, worker, "dispatched")
        await _broadcast({
            "type": "event",
            "data": {
                "id": event["id"],
                "item_id": item["id"],
                "item_sku": item["sku"],
                "item_name": item["name"],
                "worker_id": worker["id"],
                "worker_name": worker["name"],
                "zone_id": current_zone["id"],
                "zone_name": current_zone["name"],
                "zone_type": current_zone["type"],
                "event_type": "dispatched",
                "quantity": 1,
                "timestamp": event["timestamp"],
            }
        })
        _item_zone.pop(item["id"], None)
        if item in _items:
            _items.remove(item)
        return

    # Move to next zone in flow
    next_zone = _next_zone_in_flow(current_zone)
    if not next_zone:
        return

    worker = random.choice(_workers)
    await _update_worker_position(worker, next_zone)

    # Determine event type based on destination zone
    event_type_map = {
        "receiving": "received",
        "storage": "moved",
        "picking": "picked",
        "packing": "packed",
        "dispatch": "dispatched",
    }
    event_type = event_type_map.get(next_zone["type"], "moved")

    # Update item status based on event
    status_map = {
        "picked": "picked",
        "packed": "packed",
        "dispatched": "dispatched",
    }
    if event_type in status_map:
        await db.update("items", {"id": item["id"]}, {
            "status": status_map[event_type],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        item["status"] = status_map[event_type]

    # Sometimes scan the item (30% chance during picking/packing)
    if event_type in ("picked", "packed") and random.random() < 0.30:
        await _scan_item(item, next_zone, worker)
    else:
        await _move_item(item, current_zone, next_zone, worker, event_type)


# ============ DEMO MODE SCRIPTED ANOMALIES ============

async def _run_demo_step():
    """Execute scripted demo anomalies at specific times for predictable demos."""
    global _demo_step, _demo_item_misplaced, _demo_item_stuck, _demo_item_quantity

    if _demo_step >= 4:
        return False  # Demo script complete

    # Step 0 (~10s): Create items for duplicate scan AND stuck anomalies
    if _demo_step == 0:
        # Create item for the misplaced/duplicate scan anomaly
        item = await _create_item()
        _demo_item_misplaced = item["id"]
        receiving = next(z for z in _zones if z["type"] == "receiving")
        worker = random.choice(_workers)
        await _create_event(item, receiving, worker, "received",
                            quantity=item["expected_quantity"])
        await _broadcast({
            "type": "event",
            "data": {
                "id": None,
                "item_id": item["id"],
                "item_sku": item["sku"],
                "item_name": item["name"],
                "worker_id": worker["id"],
                "worker_name": worker["name"],
                "zone_id": receiving["id"],
                "zone_name": receiving["name"],
                "zone_type": receiving["type"],
                "event_type": "received",
                "quantity": item["expected_quantity"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        })

        # Create stuck item: move to storage now, it will dwell and get flagged later
        stuck_item = await _create_item()
        _demo_item_stuck = stuck_item["id"]
        storage = next(z for z in _zones if z["type"] == "storage")
        _item_zone[stuck_item["id"]] = (receiving["id"], datetime.now(timezone.utc))
        await _move_item(stuck_item, receiving, storage, worker, "moved")

        _demo_step = 1
        return True

    # Step 1 (~20s): Trigger duplicate scan — scan the item in two different zones rapidly
    if _demo_step == 1:
        if _demo_item_misplaced:
            item = next((i for i in _items if i["id"] == _demo_item_misplaced), None)
            if item:
                worker = random.choice(_workers)
                receiving = next(z for z in _zones if z["type"] == "receiving")
                storage = next(z for z in _zones if z["type"] == "storage")
                # Scan in receiving
                await _scan_item(item, receiving, worker,
                                 scanned_qty=item["expected_quantity"],
                                 expected_qty=item["expected_quantity"])
                # Immediately scan in storage (implausible time window)
                await _update_worker_position(worker, storage)
                await _scan_item(item, storage, worker,
                                 scanned_qty=item["expected_quantity"],
                                 expected_qty=item["expected_quantity"])
        _demo_step = 2
        return True

    # Step 2 (~35s): Trigger quantity mismatch
    if _demo_step == 2:
        item = await _create_item()
        _demo_item_quantity = item["id"]
        picking = next(z for z in _zones if z["type"] == "picking")
        worker = random.choice(_workers)
        await _update_worker_position(worker, picking)
        # Move item to picking first
        receiving = next(z for z in _zones if z["type"] == "receiving")
        _item_zone[item["id"]] = (receiving["id"], datetime.now(timezone.utc))
        await _move_item(item, receiving, picking, worker, "picked")
        # Scan with wrong quantity (off by 5)
        wrong_qty = max(1, item["expected_quantity"] - 5)
        await _scan_item(item, picking, worker,
                         scanned_qty=wrong_qty,
                         expected_qty=item["expected_quantity"])
        _demo_step = 3
        return True

    # Step 3 (~50s): Trigger environment alert — spike temperature in a zone
    if _demo_step == 3:
        zone = next(z for z in _zones if z["type"] == "storage")
        state = _env_state[zone["id"]]
        state["temp"] = TEMP_MAX + 4.0  # Spike above safe range
        state["humidity"] = HUMIDITY_MAX + 8.0

        result = await db.insert("environment_readings", {
            "zone_id": zone["id"],
            "temperature": round(state["temp"], 1),
            "humidity": round(state["humidity"], 1),
        })
        reading = result[0]

        anomaly = await check_environment_reading(
            zone["id"], zone["name"], state["temp"], state["humidity"]
        )

        await _broadcast({
            "type": "environment",
            "data": {
                "id": reading["id"],
                "zone_id": zone["id"],
                "zone_name": zone["name"],
                "temperature": round(state["temp"], 1),
                "humidity": round(state["humidity"], 1),
                "timestamp": reading["timestamp"],
                "alert": True,
            }
        })

        if anomaly:
            anomaly_data = {
                "anomaly_type": anomaly["anomaly_type"],
                "severity": anomaly["severity"],
                "explanation": anomaly["explanation"],
            }
            result = await db.insert("anomalies", anomaly_data)
            saved = result[0]
            await _broadcast({
                "type": "anomaly_detected",
                "data": {
                    "id": saved["id"],
                    "anomaly_type": saved["anomaly_type"],
                    "severity": saved["severity"],
                    "explanation": saved["explanation"],
                    "item_id": None,
                    "item_sku": None,
                    "event_id": None,
                    "detected_at": saved["detected_at"],
                }
            })

        _demo_step = 4
        return True

    return False


async def run_simulator():
    """Main simulator loop — runs as a background task on FastAPI startup."""
    await _seed_database()

    # In demo mode, run scripted anomalies first, then normal events
    demo_timer = 0
    demo_interval = 12  # seconds between demo steps
    stuck_check_counter = 0

    while True:
        try:
            if DEMO_MODE and _demo_step < 4:
                if demo_timer <= 0:
                    await _run_demo_step()
                    demo_timer = demo_interval
                else:
                    await _process_normal_event()
                    demo_timer -= 1
            else:
                # Normal operation: generate events + occasional environment readings
                await _process_normal_event()

                # Environment readings every ~5 events
                if random.random() < 0.2:
                    await _generate_environment_reading()

            # Randomly inject anomalies in normal mode too
            if not DEMO_MODE and random.random() < ANOMALY_RATE:
                await _inject_random_anomaly()

            # Periodically check for stuck items (every ~15 events)
            stuck_check_counter += 1
            if stuck_check_counter >= 10:
                stuck_check_counter = 0
                stuck_anomalies = await check_stuck_items(_item_zone, _zone_map)
                for sa in stuck_anomalies:
                    item = next((i for i in _items if i["id"] == sa["item_id"]), None)
                    # Only flag items not already flagged as stuck
                    existing = await db.select("anomalies", "id",
                        filters={"item_id": sa["item_id"], "anomaly_type": "stuck"},
                        order="detected_at.desc", limit=1)
                    if not existing:
                        await _save_and_broadcast_anomaly(sa, {}, item)
                        # Remove from tracking so it doesn't re-fire
                        _item_zone.pop(sa["item_id"], None)

        except Exception as e:
            # Log but don't crash the simulator
            print(f"[Simulator] Error: {e}")

        # Wait 1-3 seconds between events
        await asyncio.sleep(random.uniform(EVENT_INTERVAL_MIN, EVENT_INTERVAL_MAX))


async def _inject_random_anomaly():
    """Inject a random anomaly during normal (non-demo) operation."""
    if not _items:
        return
    item = random.choice(_items[-15:])
    zone_id = _item_zone.get(item["id"], (None, None))[0]
    if not zone_id:
        return
    zone = _zone_map.get(zone_id)
    if not zone:
        return
    worker = random.choice(_workers)

    anomaly_type = random.choice(["duplicate_scan", "quantity_mismatch", "unusual_movement"])
    if anomaly_type == "duplicate_scan":
        # Scan in a different zone immediately
        other_zone = random.choice([z for z in _zones if z["id"] != zone_id])
        await _scan_item(item, other_zone, worker,
                         scanned_qty=item.get("expected_quantity", 10),
                         expected_qty=item.get("expected_quantity", 10))
    elif anomaly_type == "quantity_mismatch":
        wrong_qty = max(1, item.get("expected_quantity", 10) - random.randint(2, 8))
        await _scan_item(item, zone, worker,
                         scanned_qty=wrong_qty,
                         expected_qty=item.get("expected_quantity", 10))
