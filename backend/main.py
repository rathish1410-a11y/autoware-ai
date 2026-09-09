"""
FastAPI main application — REST endpoints + WebSocket for live warehouse monitoring.

Endpoints:
  GET  /zones                          — list all warehouse zones
  GET  /items                          — list all items
  GET  /items/{id}/history             — event history for an item
  GET  /workers                        — list all workers
  GET  /anomalies                      — recent anomalies (paginated)
  GET  /environment/{zone_id}          — recent environment readings for a zone
  POST /orders/{order_id}/optimize-route — optimized vs. naive picking path
  WS   /ws/live                        — real-time event/anomaly/environment stream
  GET  /orders                         — list all orders
  POST /orders                         — create a new order
  GET  /health                         — health check
"""
import asyncio
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from db import db
from simulator import run_simulator, set_broadcast_fn, _run_demo_step
from route_optimizer import optimize_route


# ============ WebSocket Connection Manager ============

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        text = json.dumps(message, default=str)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


# ============ App Lifespan ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    set_broadcast_fn(manager.broadcast)
    task = asyncio.create_task(run_simulator())
    yield
    task.cancel()
    await db.close()


app = FastAPI(title="Warehouse Monitoring API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Models ============

class OrderCreate(BaseModel):
    item_ids: list[int]
    assigned_worker_id: Optional[int] = None


# ============ REST Endpoints ============

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/zones")
async def get_zones():
    zones = await db.select("warehouse_zones", "*")
    items = await db.select("items", "current_zone_id")
    counts: dict[int, int] = {}
    for item in items:
        zid = item.get("current_zone_id")
        if zid:
            counts[zid] = counts.get(zid, 0) + 1
    for z in zones:
        z["item_count"] = counts.get(z["id"], 0)
    return zones


@app.get("/items")
async def get_items(search: Optional[str] = None, limit: int = 100):
    items = await db.select("items", "*", limit=limit)
    if search:
        s = search.lower()
        items = [
            i for i in items
            if s in i.get("sku", "").lower() or s in i.get("name", "").lower() or s in i.get("category", "").lower()
        ]
    zones = await db.select("warehouse_zones", "id,name,type")
    zone_map = {z["id"]: z for z in zones}
    for item in items:
        zid = item.get("current_zone_id")
        if zid and zid in zone_map:
            item["zone_name"] = zone_map[zid]["name"]
            item["zone_type"] = zone_map[zid]["type"]
        else:
            item["zone_name"] = None
            item["zone_type"] = None
    return items


@app.get("/items/{item_id}/history")
async def get_item_history(item_id: int):
    item = await db.select("items", "*", filters={"id": item_id}, limit=1)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    events = await db.select("events", "*", filters={"item_id": item_id}, order="timestamp.asc")
    zones = await db.select("warehouse_zones", "id,name,type")
    workers = await db.select("workers", "id,name")
    zone_map = {z["id"]: z for z in zones}
    worker_map = {w["id"]: w for w in workers}
    for e in events:
        zid = e.get("zone_id")
        e["zone_name"] = zone_map.get(zid, {}).get("name") if zid else None
        e["zone_type"] = zone_map.get(zid, {}).get("type") if zid else None
        wid = e.get("worker_id")
        e["worker_name"] = worker_map.get(wid, {}).get("name") if wid else None
    return {"item": item[0], "events": events}


@app.get("/workers")
async def get_workers():
    workers = await db.select("workers", "*")
    zones = await db.select("warehouse_zones", "id,name,type")
    zone_map = {z["id"]: z for z in zones}
    for w in workers:
        zid = w.get("current_zone_id")
        if zid and zid in zone_map:
            w["zone_name"] = zone_map[zid]["name"]
            w["zone_type"] = zone_map[zid]["type"]
        else:
            w["zone_name"] = None
            w["zone_type"] = None
    return workers


@app.get("/anomalies")
async def get_anomalies(page: int = 1, limit: int = 50):
    anomalies = await db.select("anomalies", "*", order="detected_at.desc", limit=limit)
    items = await db.select("items", "id,sku,name")
    item_map = {i["id"]: i for i in items}
    for a in anomalies:
        iid = a.get("item_id")
        if iid and iid in item_map:
            a["item_sku"] = item_map[iid]["sku"]
            a["item_name"] = item_map[iid]["name"]
        else:
            a["item_sku"] = None
            a["item_name"] = None
    return anomalies


@app.get("/environment/{zone_id}")
async def get_environment(zone_id: int, limit: int = 20):
    readings = await db.select("environment_readings", "*",
                               filters={"zone_id": zone_id},
                               order="timestamp.desc", limit=limit)
    return readings


@app.get("/orders")
async def get_orders():
    orders = await db.select("orders", "*", order="created_at.desc")
    return orders


@app.post("/orders")
async def create_order(order: OrderCreate):
    total_expected = 0
    for item_id in order.item_ids:
        items = await db.select("items", "expected_quantity", filters={"id": item_id}, limit=1)
        if items:
            total_expected += items[0]["expected_quantity"]
    result = await db.insert("orders", {
        "item_ids": order.item_ids,
        "expected_quantity": total_expected,
        "assigned_worker_id": order.assigned_worker_id,
        "status": "pending",
    })
    return result[0]


@app.post("/orders/{order_id}/optimize-route")
async def optimize_order_route(order_id: int):
    try:
        result = await optimize_route(order_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/demo/trigger-step")
async def trigger_demo_step():
    triggered = await _run_demo_step()
    return {"status": "triggered" if triggered else "completed"}


# ============ WebSocket ============

@app.websocket("/ws/live")
async def ws_live(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
