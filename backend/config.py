"""Configuration for the warehouse monitoring backend."""
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_ANON_KEY)

# Simulator settings
ANOMALY_RATE = float(os.getenv("ANOMALY_RATE", "0.08"))
EVENT_INTERVAL_MIN = float(os.getenv("EVENT_INTERVAL_MIN", "1.0"))
EVENT_INTERVAL_MAX = float(os.getenv("EVENT_INTERVAL_MAX", "3.0"))
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

# Environment thresholds
TEMP_MIN = 15.0
TEMP_MAX = 25.0
HUMIDITY_MIN = 30.0
HUMIDITY_MAX = 60.0

# Dwell time threshold multiplier (2x average -> stuck)
DWELL_MULTIPLIER = 2.0

# Zone flow sequence for sequence checking
ZONE_FLOW = ["receiving", "storage", "picking", "packing", "dispatch"]

# Backend server port
API_PORT = int(os.getenv("API_PORT", "8001"))
