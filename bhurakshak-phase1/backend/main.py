
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="BhuRakshak AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NODES = [
    {"id": "N-01", "name": "North Ridge", "lat": 23.739, "lng": 86.432, "status": "safe", "battery": 91, "rssi": -62},
    {"id": "N-02", "name": "Panel P3-West", "lat": 23.736, "lng": 86.438, "status": "watch", "battery": 78, "rssi": -69},
    {"id": "N-03", "name": "Panel P3-Center", "lat": 23.733, "lng": 86.441, "status": "alert", "battery": 84, "rssi": -71},
    {"id": "N-04", "name": "South Boundary", "lat": 23.729, "lng": 86.437, "status": "safe", "battery": 95, "rssi": -58},
    {"id": "N-05", "name": "Village Edge", "lat": 23.726, "lng": 86.444, "status": "safe", "battery": 88, "rssi": -66},
    {"id": "N-06", "name": "Haul Road", "lat": 23.731, "lng": 86.449, "status": "watch", "battery": 67, "rssi": -78},
]

class AlertTest(BaseModel):
    severity: str = "high"
    node_id: str = "N-03"

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "bhurakshak-backend"}

@app.get("/api/dashboard")
def dashboard():
    return {
        "mine": "BhuRakshak Demo Mine",
        "panel": "Panel P3",
        "risk_level": "HIGH",
        "active_alerts": 1,
        "nodes_online": 6,
        "nodes_total": 6,
        "coverage_km2": 1.8,
        "predicted_threshold_hours": 18,
        "confidence": 0.82,
        "last_update": datetime.now(timezone.utc).isoformat(),
        "insight": "Sustained displacement increase detected across neighbouring nodes."
    }

@app.get("/api/nodes")
def nodes():
    return NODES

@app.get("/api/risk-zones")
def risk_zones():
    return [
        {
            "id": "Z-01",
            "label": "P3 West",
            "risk": "high",
            "predicted_subsidence_mm": 42.8,
            "confidence": 0.82,
            "time_to_threshold_hours": 18,
            "center": [23.735, 86.440],
        },
        {
            "id": "Z-02",
            "label": "P3 South",
            "risk": "watch",
            "predicted_subsidence_mm": 18.4,
            "confidence": 0.69,
            "time_to_threshold_hours": 41,
            "center": [23.730, 86.439],
        },
    ]

@app.get("/api/readings/{node_id}")
def readings(node_id: str):
    now = datetime.now(timezone.utc)
    base_tilt = 11.0 if node_id != "N-03" else 11.8
    base_disp = 5.0 if node_id != "N-03" else 8.6
    data = []
    for i in range(24):
        t = now - timedelta(hours=23-i)
        drift = i * (0.06 if node_id == "N-03" else 0.015)
        data.append({
            "timestamp": t.isoformat(),
            "tilt": round(base_tilt + drift, 3),
            "displacement": round(base_disp + drift * 2.6, 3),
            "vibration": round(0.28 + (0.018 * i if node_id == "N-03" else 0.006 * i), 3),
            "crack_width": round(0.9 + (0.03 * i if node_id == "N-03" else 0.006 * i), 3),
        })
    return {"node_id": node_id, "readings": data}

@app.get("/api/alerts")
def alerts():
    return [
        {
            "id": "A-102",
            "severity": "critical",
            "title": "Accelerating deformation",
            "node": "N-03",
            "time": "08:42",
            "message": "Displacement and tilt are increasing together. Two neighbouring nodes corroborate the trend.",
            "confidence": 0.82,
        },
        {
            "id": "A-099",
            "severity": "watch",
            "title": "Vibration above baseline",
            "node": "N-02",
            "time": "08:17",
            "message": "Transient vibration increase detected; no multi-node confirmation yet.",
            "confidence": 0.61,
        }
    ]

@app.post("/api/alerts/test")
def test_alert(payload: AlertTest):
    return {
        "success": True,
        "message": f"Demo {payload.severity.upper()} alert generated for {payload.node_id}.",
        "next_action": "Operator review required."
    }
