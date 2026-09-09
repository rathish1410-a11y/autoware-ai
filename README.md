# 🏭 AutoWare AI — Autonomous Warehouse Monitoring System

> **AI-Powered Warehouse Monitoring & Inventory Automation System**
> Built for Hackathon 2026 · Full-stack · Real-time · No physical sensors required

![Backend](https://img.shields.io/badge/Backend-Python%20FastAPI-009688?style=for-the-badge&logo=fastapi)
![Frontend](https://img.shields.io/badge/Frontend-React%20TypeScript-61DAFB?style=for-the-badge&logo=react)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20Supabase-3ECF8E?style=for-the-badge&logo=supabase)
![Realtime](https://img.shields.io/badge/Realtime-WebSocket-FF6B6B?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## 📌 Problem Statement

Warehouses require continuous monitoring of inventory, storage locations, product movement, and worker activity. Manual inventory verification leads to:

- 📦 Misplaced or missing products
- 📋 Incorrect stock records
- 🔄 Inefficient picking routes
- 🕒 Delayed detection of damaged goods

---

## ✅ Our Solution

An intelligent warehouse automation system that:

- **Tracks products** in real-time from Receiving → Storage → Picking → Packing → Dispatch
- **Detects anomalies** automatically using a rule-based AI engine
- **Optimizes picker routes** using the TSP Nearest-Neighbour algorithm
- **Monitors environment** (temperature & humidity) per zone with safety alerts
- **Streams all events live** via WebSocket to a cyberpunk command-center dashboard
- **Requires zero physical hardware** — fully simulated event layer for demo/hackathon

---

## 🧠 Features

| Feature | Description |
|---------|-------------|
| 🗺️ **2D Warehouse Grid** | Interactive spatial map of 6 zones with capacity heatbars and item density % |
| 🚨 **AI Anomaly Detection** | 4 anomaly types detected in real-time: stuck, misplaced, quantity mismatch, environment spike |
| 📦 **Live Inventory Table** | Searchable, sortable SKU catalog with real-time status badges and qty mismatch highlights |
| 📍 **Item Journey Timeline** | Full chronological movement history per item with zone flow progress map |
| 🗺️ **TSP Route Optimizer** | Compares naive vs optimized picker paths with distance & time savings metrics |
| 🌡️ **Environment Monitor** | Per-zone temperature & humidity animated gauges with ALERT vs NOMINAL status |
| 👷 **Worker Activity Log** | Live worker roster (shift/zone) + real-time operational event stream |
| 📊 **KPI Metrics Bar** | Live counters: Total Zones · Tracked SKUs · AI Anomalies · Event Count |
| ⚡ **WebSocket Live Stream** | 1–3 second real-time updates pushed to all connected clients simultaneously |
| 🎬 **Demo Mode** | One-click scripted 4-step anomaly sequence for hackathon presentations |

---

## 🛠️ Tech Stack

### Backend — Python
| Library | Purpose |
|---------|---------|
| **FastAPI** | REST API server + WebSocket hub |
| **asyncio** | Async background event simulator |
| **Uvicorn** | ASGI production server |
| **Pydantic** | Request/response data validation |
| **Supabase (PostgreSQL)** | Primary database (with in-memory fallback) |

### Frontend — TypeScript
| Library | Purpose |
|---------|---------|
| **React 18** | Component-based UI framework |
| **TypeScript** | Full type safety across all components |
| **Tailwind CSS** | Utility-first cyberpunk design system |
| **Vite** | Ultra-fast HMR dev server + build tool |
| **Lucide React** | Icon library |
| **concurrently** | Runs backend + frontend with one command |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone the repository
```bash
git clone https://github.com/rathish1410-a11y/autoware-ai.git
cd autoware-ai
```

### 2. Set up Python virtual environment
```bash
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r backend/requirements.txt
```

### 3. Set up environment variables
```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env

# Edit .env with your Supabase credentials (optional — app works fully without them)
```

### 4. Install frontend dependencies
```bash
npm install
```

### 5. ▶️ Run everything with ONE command
```bash
npm start
```

This launches **both servers simultaneously**:
| Server | URL | Role |
|--------|-----|------|
| 🐍 Python FastAPI | `http://localhost:8001` | Backend — data, AI, WebSocket |
| ⚡ React (Vite) | `http://localhost:5173` | Frontend — dashboard UI |

Then open **[http://localhost:5173](http://localhost:5173)** in your browser.

> **Why two ports?** Vite is a build tool that serves the UI files. Python is the actual brain. In production they'd be merged into one URL.

---

## 📁 Project Structure

```
autoware-ai/
│
├── backend/                        ← Python FastAPI backend
│   ├── main.py                     # REST endpoints + WebSocket hub (238 lines)
│   ├── simulator.py                # Async warehouse event generator (728 lines)
│   ├── anomaly_engine.py           # AI rule-based anomaly detection (305 lines)
│   ├── route_optimizer.py          # TSP Nearest-Neighbour algorithm
│   ├── db.py                       # Supabase REST + in-memory fallback
│   ├── config.py                   # Tunable settings (rates, thresholds)
│   └── requirements.txt            # Python dependencies
│
├── src/                            ← React TypeScript frontend
│   ├── App.tsx                     # Main app — KPI bar + 6-tab router
│   ├── components/
│   │   ├── Header.tsx              # Nav bar — live clock, WS status, demo button
│   │   ├── WarehouseGrid.tsx       # 2D interactive zone map
│   │   ├── AnomalyFeed.tsx         # Real-time anomaly stream with AI reasoning
│   │   ├── InventoryTable.tsx      # Searchable/sortable inventory catalog
│   │   ├── ItemHistoryModal.tsx    # Item movement timeline + journey map
│   │   ├── RouteOptimizerPanel.tsx # TSP route comparison panel
│   │   ├── EnvironmentPanel.tsx    # Animated temperature/humidity gauges
│   │   └── WorkerActivityLog.tsx   # Worker roster + live event stream
│   ├── hooks/
│   │   └── useWebSocket.ts         # WebSocket live stream React hook
│   ├── services/
│   │   └── api.ts                  # Typed REST API client
│   └── types/
│       └── index.ts                # All TypeScript interfaces
│
├── supabase/
│   └── migrations/                 # PostgreSQL schema (zones, items, events…)
│
├── .env.example                    # Environment variable template
├── .gitignore                      # Excludes venv, node_modules, .env
├── package.json                    # npm scripts including npm start
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check + timestamp |
| `GET` | `/zones` | All 6 warehouse zones with live item counts |
| `GET` | `/items` | All items — supports `?search=` query |
| `GET` | `/items/{id}/history` | Full event timeline for a specific item |
| `GET` | `/workers` | All workers with current zone assignment |
| `GET` | `/anomalies` | Recent anomalies, newest first (paginated) |
| `GET` | `/environment/{zone_id}` | Temperature/humidity readings for a zone |
| `GET` | `/orders` | All orders |
| `POST` | `/orders` | Create a new picking order |
| `POST` | `/orders/{id}/optimize-route` | Run TSP optimizer on an order |
| `POST` | `/demo/trigger-step` | Fire one step of the demo anomaly sequence |
| `WS` | `/ws/live` | WebSocket — live events, anomalies, environment |

---

## 🤖 AI Anomaly Detection Engine

The `anomaly_engine.py` runs automatically after every warehouse event and checks for 4 types of problems:

| Anomaly Type | Detection Logic |
|-------------|----------------|
| 🔴 **Stuck Item** | Item in same zone longer than 2× the average dwell time for that zone type |
| 🟠 **Misplaced Item** | Item scanned in a zone that breaks the expected flow sequence (e.g. skips Storage) |
| 🟡 **Quantity Mismatch** | Scanned quantity ≠ expected quantity on record (e.g. found 8, expected 10) |
| 🔴 **Environment Alert** | Temperature > 25°C or < 15°C, or humidity > 60% or < 30% in any zone |

Each anomaly generates a **human-readable explanation** string shown in the Anomaly Feed panel.

---

## 🗺️ Warehouse Zone Flow

Every item follows this journey through the warehouse:

```
RECEIVING  ──►  STORAGE  ──►  PICKING  ──►  PACKING  ──►  DISPATCH
  Zone A          Zone B        Zone C        Zone D        Zone E
(arrives)       (stored)      (worker       (boxed &      (leaves
                              picks it)      labelled)   warehouse)
```

The simulator automatically moves items through this pipeline and generates realistic scan events every 1–3 seconds.

---

## 🎬 Demo Mode

Click **"Trigger Pitch Demo"** in the dashboard header to fire a scripted 4-step sequence:

| Step | Anomaly Triggered | Panel Affected |
|------|------------------|----------------|
| 1 | ⚠️ Misplaced item detected | Anomaly Feed + Grid highlights |
| 2 | ⚠️ Quantity mismatch (8 found, 10 expected) | Inventory Table row turns amber |
| 3 | 🔴 Stuck item alert | Anomaly Feed + Grid zone glows |
| 4 | 🌡️ Temperature spike (32°C in Storage) | Environment Panel turns red |

All 4 anomaly types fire within ~60 seconds — perfect for live presentations.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   BROWSER (port 5173)                   │
│                                                         │
│  ┌──────────┐  ┌─────────┐  ┌──────────────────────┐  │
│  │  Header  │  │ KPI Bar │  │   6 Dashboard Tabs    │  │
│  │(nav+demo)│  │(metrics)│  │ Grid · Anomalies      │  │
│  └──────────┘  └─────────┘  │ Inventory · Route     │  │
│                              │ Environment · Workers  │  │
│                              └──────────────────────┘  │
│                    ↕ REST (HTTP) + WebSocket            │
└─────────────────────────────────────────────────────────┘
                           ↕ port 8001
┌─────────────────────────────────────────────────────────┐
│                  PYTHON FASTAPI BACKEND                 │
│                                                         │
│  simulator.py ──generates events──► anomaly_engine.py   │
│       │  every 1–3 seconds                    │         │
│       │  broadcasts via WebSocket             │         │
│       ▼                                       ▼         │
│  All connected browsers             saves to database   │
│  get live updates instantly                             │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL / In-Memory)          │
│                                                         │
│  Tables: warehouse_zones · items · events · workers     │
│          anomalies · environment_readings · orders      │
└─────────────────────────────────────────────────────────┘
```

---

## 👥 Team

Built for **Hackathon 2026** — AI-Powered Autonomous Warehouse Monitoring System

---

## 📄 License

MIT License — feel free to use and modify.
