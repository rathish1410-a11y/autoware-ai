# 🏭 AutoWare AI — Autonomous Warehouse Monitoring System

> **AI-Powered Warehouse Monitoring & Inventory Automation System**  
> Built for Hackathon 2026 · Full-stack · Real-time · No physical sensors required

![Tech Stack](https://img.shields.io/badge/Backend-Python%20FastAPI-009688?style=for-the-badge&logo=fastapi)
![Tech Stack](https://img.shields.io/badge/Frontend-React%20TypeScript-61DAFB?style=for-the-badge&logo=react)
![Tech Stack](https://img.shields.io/badge/Database-PostgreSQL%20Supabase-3ECF8E?style=for-the-badge&logo=supabase)
![Tech Stack](https://img.shields.io/badge/Realtime-WebSocket-FF6B6B?style=for-the-badge)

---

## 📌 Problem Statement

Warehouses require continuous monitoring of inventory, storage locations, product movement, and worker activity. Manual inventory verification leads to:
- Misplaced or missing products
- Incorrect stock records
- Inefficient picking routes
- Delayed detection of damaged goods

## ✅ Our Solution

An intelligent warehouse automation system that:
- **Tracks products** from receiving → storage → picking → packing → dispatch
- **Detects anomalies** in real-time using an AI rule engine
- **Optimizes picker routes** using TSP Nearest-Neighbour algorithm
- **Monitors environment** (temperature & humidity) per zone
- **Streams all events** live via WebSocket to a cyberpunk command-center dashboard

---

## 🧠 Features

| Feature | Description |
|---------|-------------|
| 🗺️ **2D Warehouse Grid** | Interactive spatial map with zone capacity heatbars |
| 🚨 **AI Anomaly Detection** | 4 anomaly types: stuck, misplaced, quantity mismatch, temperature spike |
| 📦 **Live Inventory Table** | Searchable, sortable SKU catalog with real-time status |
| 📍 **Item Timeline Modal** | Full chronological movement history per item |
| 🗺️ **Route Optimizer** | TSP algorithm comparing naive vs optimized picker paths |
| 🌡️ **Environment Monitor** | Per-zone temperature & humidity safety gauges |
| 👷 **Worker Activity Log** | Live roster + operational event stream |
| ⚡ **WebSocket Live Stream** | 1-3 second real-time updates across all panels |
| 🎬 **Demo Mode** | One-click scripted anomaly sequence for presentations |

---

## 🛠️ Tech Stack

### Backend (Python)
- **FastAPI** — REST API + WebSocket server
- **asyncio** — Async event simulator running in background
- **Supabase (PostgreSQL)** — Primary database with in-memory fallback
- **Pydantic** — Data validation
- **Uvicorn** — ASGI server

### Frontend (TypeScript)
- **React 18** — Component-based UI
- **TypeScript** — Type-safe development
- **Tailwind CSS** — Utility-first styling
- **Vite** — Ultra-fast build tool
- **Lucide React** — Icon library

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/autoware-ai.git
cd autoware-ai
```

### 2. Set up Python virtual environment
```bash
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r backend/requirements.txt
```

### 3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your Supabase credentials (optional — works without them)
```

### 4. Install frontend dependencies
```bash
npm install
```

### 5. Run both servers with ONE command
```bash
npm start
```

This starts:
- 🐍 Python FastAPI backend at `http://localhost:8001`
- ⚡ React frontend at `http://localhost:5173`

Then open **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
autoware-ai/
├── backend/
│   ├── main.py              # FastAPI app — REST + WebSocket endpoints
│   ├── simulator.py         # Async event generator (warehouse activity)
│   ├── anomaly_engine.py    # AI rule-based anomaly detection
│   ├── route_optimizer.py   # TSP Nearest-Neighbour algorithm
│   ├── db.py                # Database layer (Supabase + in-memory fallback)
│   ├── config.py            # Configuration constants
│   └── requirements.txt     # Python dependencies
│
├── src/
│   ├── App.tsx              # Main app — KPI bar + tab router
│   ├── components/
│   │   ├── Header.tsx           # Top nav with live status + demo trigger
│   │   ├── WarehouseGrid.tsx    # 2D zone map
│   │   ├── AnomalyFeed.tsx      # Live anomaly stream
│   │   ├── InventoryTable.tsx   # Searchable item catalog
│   │   ├── ItemHistoryModal.tsx # Item movement timeline
│   │   ├── RouteOptimizerPanel.tsx # TSP route comparison
│   │   ├── EnvironmentPanel.tsx # Sensor gauges
│   │   └── WorkerActivityLog.tsx# Worker roster + events
│   ├── hooks/
│   │   └── useWebSocket.ts  # WebSocket live stream hook
│   ├── services/
│   │   └── api.ts           # REST API client
│   └── types/
│       └── index.ts         # TypeScript interfaces
│
├── supabase/
│   └── migrations/          # PostgreSQL schema
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/zones` | All warehouse zones with item counts |
| `GET` | `/items` | All items (searchable) |
| `GET` | `/items/{id}/history` | Item movement timeline |
| `GET` | `/workers` | All workers with current zone |
| `GET` | `/anomalies` | Recent anomalies (paginated) |
| `GET` | `/orders` | All orders |
| `POST` | `/orders` | Create new order |
| `POST` | `/orders/{id}/optimize-route` | Run TSP optimizer |
| `POST` | `/demo/trigger-step` | Trigger demo anomaly step |
| `WS` | `/ws/live` | Live event WebSocket stream |

---

## 🎬 Demo Mode

Press the **"Trigger Pitch Demo"** button in the header to fire a scripted sequence:
1. ⚠️ Misplaced item detected
2. ⚠️ Quantity mismatch found
3. 🔴 Stuck item alert
4. 🌡️ Temperature spike warning

All 4 anomaly types appear within ~60 seconds — perfect for live presentations.

---

## 🏗️ Architecture

```
Browser (React) ←──WebSocket──→ FastAPI Backend
      ↕ REST API                      ↕
  6 Dashboard Tabs            Async Simulator
  • Grid Map                  Anomaly Engine
  • Anomaly Feed              Route Optimizer
  • Inventory Table                 ↕
  • Route Optimizer           PostgreSQL DB
  • Environment               (+ In-Memory Fallback)
  • Workers
```

---

## 👥 Team

Built for **Hackathon 2026** — AI-Powered Autonomous Warehouse Monitoring

---

## 📄 License

MIT License — feel free to use and modify.
