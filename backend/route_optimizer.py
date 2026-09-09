"""
Picking Route Optimization — models the warehouse as a grid graph and computes
optimized picking paths using a nearest-neighbor heuristic.

The warehouse zones have grid_x/grid_y coordinates. We model adjacency as a
simple Manhattan-distance graph and compute:
  1. A naive path (zones visited in item-list order)
  2. An optimized path (nearest-neighbor heuristic from the starting zone)
"""
import math
from db import db


def manhattan_distance(z1: dict, z2: dict) -> float:
    """Manhattan distance between two zones on the grid."""
    return abs(z1["grid_x"] - z2["grid_x"]) + abs(z1["grid_y"] - z2["grid_y"])


def compute_path_distance(path: list[dict]) -> float:
    """Total Manhattan distance of a path (sum of consecutive zone distances)."""
    total = 0.0
    for i in range(1, len(path)):
        total += manhattan_distance(path[i - 1], path[i])
    return total


def nearest_neighbor_path(start: dict, stops: list[dict]) -> list[dict]:
    """
    Nearest-neighbor TSP heuristic: from the start zone, repeatedly visit the
    nearest unvisited stop. Returns the full path including start.
    """
    path = [start]
    remaining = list(stops)
    current = start

    while remaining:
        nearest = min(remaining, key=lambda z: manhattan_distance(current, z))
        path.append(nearest)
        remaining.remove(nearest)
        current = nearest

    return path


async def optimize_route(order_id: int) -> dict:
    """
    Compute optimized vs. naive picking path for an order.

    Returns:
      {
        "order_id": int,
        "optimized_path": [{"zone_id", "name", "type", "grid_x", "grid_y"}, ...],
        "naive_path": [...],
        "optimized_distance": float,
        "naive_distance": float,
        "distance_saved": float,
        "distance_saved_pct": float,
        "estimated_time_saved_s": float
      }
    """
    # Fetch the order
    orders = await db.select("orders", "*", filters={"id": order_id}, limit=1)
    if not orders:
        raise ValueError(f"Order {order_id} not found")

    order = orders[0]
    item_ids = order.get("item_ids", [])

    if not item_ids:
        raise ValueError(f"Order {order_id} has no items")

    # Fetch items and their current zones
    all_zones = await db.select("warehouse_zones", "*")
    zone_map = {z["id"]: z for z in all_zones}

    # Get unique zones for items in this order
    stop_zone_ids = []
    for item_id in item_ids:
        items = await db.select("items", "current_zone_id", filters={"id": item_id}, limit=1)
        if items and items[0]["current_zone_id"]:
            zid = items[0]["current_zone_id"]
            if zid not in stop_zone_ids:
                stop_zone_ids.append(zid)

    if not stop_zone_ids:
        raise ValueError("No valid zones found for order items")

    stops = [zone_map[zid] for zid in stop_zone_ids if zid in zone_map]

    # Starting point: the receiving zone (entry point of the warehouse)
    start_zone = next((z for z in all_zones if z["type"] == "receiving"), all_zones[0])

    # Naive path: start + stops in item-list order
    naive_path = [start_zone] + stops

    # Optimized path: nearest-neighbor from start
    optimized_path = nearest_neighbor_path(start_zone, stops)

    # Compute distances
    naive_dist = compute_path_distance(naive_path)
    optimized_dist = compute_path_distance(optimized_path)
    distance_saved = naive_dist - optimized_dist
    distance_saved_pct = (distance_saved / naive_dist * 100) if naive_dist > 0 else 0

    # Estimate time: assume 2 seconds per grid unit of travel
    time_saved_s = distance_saved * 2.0

    def serialize_path(path: list[dict]) -> list[dict]:
        return [
            {
                "zone_id": z["id"],
                "name": z["name"],
                "type": z["type"],
                "grid_x": z["grid_x"],
                "grid_y": z["grid_y"],
            }
            for z in path
        ]

    return {
        "order_id": order_id,
        "optimized_path": serialize_path(optimized_path),
        "naive_path": serialize_path(naive_path),
        "optimized_distance": round(optimized_dist, 1),
        "naive_distance": round(naive_dist, 1),
        "distance_saved": round(distance_saved, 1),
        "distance_saved_pct": round(distance_saved_pct, 1),
        "estimated_time_saved_s": round(time_saved_s, 1),
    }
