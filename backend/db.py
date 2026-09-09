"""Supabase REST client wrapper using httpx for async access to Postgres via the Supabase REST API with robust in-memory fallback."""
import httpx
import logging
from datetime import datetime, timezone
from config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

logger = logging.getLogger("db")


class SupabaseClient:
    """Async wrapper over Supabase PostgREST API with transparent in-memory fallback."""

    def __init__(self):
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self._supabase_enabled = bool(SUPABASE_URL and SUPABASE_ANON_KEY)
        self._client = httpx.AsyncClient(
            base_url=f"{SUPABASE_URL}/rest/v1" if self._supabase_enabled else "http://localhost",
            headers=headers,
            timeout=5.0,
        )
        # In-memory storage fallback for local/offline execution
        self._memory_db: dict[str, list[dict]] = {
            "warehouse_zones": [],
            "items": [],
            "workers": [],
            "events": [],
            "environment_readings": [],
            "anomalies": [],
            "orders": [],
        }
        self._auto_id: dict[str, int] = {k: 1 for k in self._memory_db.keys()}

    async def insert(self, table: str, data: dict) -> list[dict]:
        if self._supabase_enabled:
            try:
                resp = await self._client.post(f"/{table}", json=data)
                if resp.status_code < 400:
                    res = resp.json()
                    # Also keep memory sync
                    record = res[0] if isinstance(res, list) and res else res
                    self._mem_insert(table, record)
                    return res if isinstance(res, list) else [res]
            except Exception as e:
                logger.warning(f"Supabase insert error on table {table}: {e}. Falling back to in-memory store.")
                self._supabase_enabled = False

        record = dict(data)
        if "id" not in record:
            record["id"] = self._auto_id[table]
            self._auto_id[table] += 1
        now = datetime.now(timezone.utc).isoformat()
        if table in ("items", "orders") and "created_at" not in record:
            record["created_at"] = now
        if table in ("events", "environment_readings") and "timestamp" not in record:
            record["timestamp"] = now
        if table == "anomalies" and "detected_at" not in record:
            record["detected_at"] = now
        if "updated_at" not in record:
            record["updated_at"] = now

        self._mem_insert(table, record)
        return [record]

    def _mem_insert(self, table: str, record: dict):
        if table not in self._memory_db:
            self._memory_db[table] = []
        # Update if ID exists or append
        rid = record.get("id")
        if rid:
            for i, r in enumerate(self._memory_db[table]):
                if r.get("id") == rid:
                    self._memory_db[table][i] = record
                    return
        self._memory_db[table].append(record)

    async def select(self, table: str, columns: str = "*", filters: dict | None = None,
                     order: str | None = None, limit: int | None = None) -> list[dict]:
        if self._supabase_enabled:
            try:
                params: dict[str, str] = {"select": columns}
                if filters:
                    for key, val in filters.items():
                        if val is not None:
                            params[key] = f"eq.{val}"
                if order:
                    params["order"] = order
                if limit:
                    params["limit"] = str(limit)
                resp = await self._client.get(f"/{table}", params=params)
                if resp.status_code < 400:
                    return resp.json()
            except Exception as e:
                logger.warning(f"Supabase select error on table {table}: {e}. Falling back to in-memory store.")
                self._supabase_enabled = False

        records = self._memory_db.get(table, [])
        if filters:
            filtered = []
            for r in records:
                match = True
                for k, v in filters.items():
                    if v is not None and r.get(k) != v:
                        match = False
                        break
                if match:
                    filtered.append(r)
            records = filtered

        if order:
            field = order.split(".")[0]
            desc = "desc" in order
            records = sorted(records, key=lambda x: str(x.get(field, "")), reverse=desc)

        if limit:
            records = records[:limit]

        return [dict(r) for r in records]

    async def update(self, table: str, filters: dict, data: dict) -> list[dict]:
        if self._supabase_enabled:
            try:
                params = {k: f"eq.{v}" for k, v in filters.items() if v is not None}
                resp = await self._client.patch(f"/{table}", params=params, json=data)
                if resp.status_code < 400:
                    updated = resp.json()
                    for r in (updated if isinstance(updated, list) else [updated]):
                        self._mem_insert(table, r)
                    return updated if isinstance(updated, list) else [updated]
            except Exception as e:
                logger.warning(f"Supabase update error on table {table}: {e}. Falling back to in-memory store.")
                self._supabase_enabled = False

        updated_records = []
        records = self._memory_db.get(table, [])
        for r in records:
            match = True
            for k, v in filters.items():
                if v is not None and r.get(k) != v:
                    match = False
                    break
            if match:
                r.update(data)
                r["updated_at"] = datetime.now(timezone.utc).isoformat()
                updated_records.append(dict(r))

        return updated_records

    async def rpc(self, func: str, params: dict) -> dict:
        if self._supabase_enabled:
            try:
                resp = await self._client.post(f"/rpc/{func}", json=params)
                if resp.status_code < 400:
                    return resp.json()
            except Exception:
                pass
        return {}

    async def close(self):
        await self._client.aclose()


db = SupabaseClient()
