from datetime import datetime, timezone
import io
from threading import Lock
import math
import random
import os
import re
import json

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

app = FastAPI(title="BhuRakshak Live Sensor Simulator", version="3.0.0")

# Local development + deployed Vercel frontend. Set FRONTEND_URL on Render.
frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NODES = [
    {"node_id":"NODE-001","location":"Panel A Bench 2","x":18,"y":27,"base_risk":12},
    {"node_id":"NODE-002","location":"Panel A Bench 4","x":32,"y":55,"base_risk":18},
    {"node_id":"NODE-003","location":"Highwall Bench C-East","x":52,"y":46,"base_risk":72},
    {"node_id":"NODE-004","location":"Drainage Borehole","x":22,"y":72,"base_risk":45},
    {"node_id":"NODE-005","location":"North Waste Dump","x":72,"y":28,"base_risk":15},
    {"node_id":"NODE-006","location":"South Portal Shaft","x":68,"y":72,"base_risk":58},
    {"node_id":"NODE-007","location":"Shear Bench West","x":79,"y":48,"base_risk":64},
    {"node_id":"NODE-008","location":"Panel B Bench 1","x":87,"y":24,"base_risk":10},
    {"node_id":"NODE-009","location":"East Haul Road","x":91,"y":62,"base_risk":25},
    {"node_id":"NODE-010","location":"South Bench 3","x":56,"y":82,"base_risk":34},
]

SCENARIOS = {"normal":0.10, "developing":0.35, "alert":0.68, "critical":0.95}
state = {"scenario":"alert", "sequence":0, "last":None}
lock = Lock()

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def level_for(risk):
    if risk >= 80: return "critical"
    if risk >= 55: return "alert"
    if risk >= 30: return "watch"
    return "safe"

def generate_reading(node):
    scenario = state["scenario"]
    intensity = SCENARIOS[scenario]
    # NODE-003 is the demo highwall lead node; other nodes have natural variation.
    lead = 1.0 if node["node_id"] == "NODE-003" else (0.78 if node["node_id"] in {"NODE-006","NODE-007"} else 0.35)
    wave = math.sin(state["sequence"] / 3.0 + len(node["node_id"])) * 2.2
    noise = random.uniform(-3.2, 3.2)

    risk = clamp(node["base_risk"] * 0.55 + intensity * 55 * lead + wave + noise, 4, 98)
    roll = clamp(0.18 + risk / 30 * lead + random.uniform(-0.12, 0.12), 0.05, 5.8)
    pitch = clamp(0.14 + risk / 38 * lead + random.uniform(-0.10, 0.10), 0.03, 4.9)
    yaw = random.uniform(-1.2, 1.2)
    displacement = clamp(1.2 + risk / 8.5 + random.uniform(-0.35, 0.35), 0.4, 14.8)
    crack = clamp(0.8 + risk / 12 + random.uniform(-0.18, 0.18), 0.2, 9.8)
    battery = clamp(4.20 - state["sequence"] * 0.00045 - random.uniform(0.0, 0.035), 3.55, 4.20)
    rssi = int(random.uniform(-78, -49))
    status = level_for(risk)

    return {
        "node_id": node["node_id"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": node["location"],
        "x": node["x"],
        "y": node["y"],
        "status": status,
        "risk": round(risk),
        "risk_score": round(risk / 100, 3),
        "tilt": {
            "roll_deg": round(roll, 2),
            "pitch_deg": round(pitch, 2),
            "yaw_deg": round(yaw, 2),
        },
        "displacement_mm": round(displacement, 2),
        "crack_width_mm": round(crack, 2),
        "battery_v": round(battery, 2),
        "rssi_dbm": rssi,
        "sample_rate_hz": 10,
        "source": "ESP32-MPU6050 SIMULATOR",
    }

def generate_all():
    with lock:
        state["sequence"] += 1
        readings = [generate_reading(n) for n in NODES]
        state["last"] = readings
        return readings

# Initial readings are generated immediately.
generate_all()

@app.get("/api/health")
def health():
    return {
        "status":"ok",
        "service":"bhurakshak-live-sensor-simulator",
        "mode":"SIMULATION",
        "source":"ESP32 + MPU6050 simulated stream",
        "timestamp":datetime.now(timezone.utc).isoformat(),
    }

@app.get("/api/telemetry/latest")
def latest():
    return generate_all()

@app.get("/api/telemetry/history/{node_id}")
def history(node_id: str, hours: int = Query(24, ge=1, le=24)):
    node = next((n for n in NODES if n["node_id"] == node_id), NODES[2])
    base = next((n for n in (state["last"] or []) if n["node_id"] == node_id), generate_all()[0])
    samples = {1: 13, 6: 25, 24: 49}.get(hours, 49)
    history = []
    for i in range(samples):
        minutes_ago = (samples - 1 - i) * (hours * 60 / (samples - 1))
        risk = clamp(base["risk"] + math.sin(i/2.3)*4 + random.uniform(-2,2), 3, 98)
        history.append({
            "time": "now" if i == samples-1 else f"-{int(round(minutes_ago))}m",
            "displacement": round(clamp(base["displacement_mm"] - (samples-1-i)*0.09 + random.uniform(-0.12,0.12), .2, 15),2),
            "tilt": round(clamp(base["tilt"]["roll_deg"] - (samples-1-i)*0.025 + random.uniform(-0.05,0.05), .05, 6),2),
            "crack": round(clamp(base["crack_width_mm"] - (samples-1-i)*0.02 + random.uniform(-0.05,0.05), .1, 10),2),
            "risk": round(risk)
        })
    return {"node_id":node_id,"hours":hours,"history":history}

@app.get("/api/simulation/state")
def simulation_state():
    with lock:
        return {"scenario":state["scenario"],"sequence":state["sequence"],"mode":"SIMULATION"}

@app.post("/api/simulation/scenario/{scenario}")
def set_scenario(scenario: str):
    scenario = scenario.lower()
    if scenario not in SCENARIOS:
        return {"success":False,"message":"Scenario must be normal, developing, alert or critical."}
    with lock:
        state["scenario"] = scenario
    readings = generate_all()
    return {"success":True,**simulation_state(),"readings":readings}

@app.post("/api/simulation/step")
def step():
    readings = generate_all()
    return {"success":True,**simulation_state(),"readings":readings}


# -----------------------------------------------------------------------------
# Demo SMS notification service
# -----------------------------------------------------------------------------
# Demo-only provider: records realistic SMS bundles in the backend and exposes
# them to both Admin and Community User dashboards. No paid SMS provider is called.
SMS_LOGS = []
SMS_LOCK = Lock()
MAX_SMS_LOGS = 150
SMS_STORE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "sms_logs.json")

def load_sms_logs():
    global SMS_LOGS
    try:
        os.makedirs(os.path.dirname(SMS_STORE_PATH), exist_ok=True)
        if os.path.exists(SMS_STORE_PATH):
            with open(SMS_STORE_PATH, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, list):
                    SMS_LOGS = data[-MAX_SMS_LOGS:]
    except Exception:
        SMS_LOGS = []

def save_sms_logs():
    try:
        os.makedirs(os.path.dirname(SMS_STORE_PATH), exist_ok=True)
        tmp = SMS_STORE_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(SMS_LOGS[-MAX_SMS_LOGS:], fh, ensure_ascii=False, indent=2)
        os.replace(tmp, SMS_STORE_PATH)
    except Exception:
        # Demo mode should continue even if the deployment filesystem is read-only.
        pass

load_sms_logs()

class SmsRequest(BaseModel):
    phone_number: str
    message: str = ""
    severity: str = "alert"
    zone: str = "Sector 4"
    incident_id: str = "MANUAL"
    node_id: str = "NODE-003"
    location: str = "Monitored Zone"
    risk: int = 0
    displacement_mm: float = 0
    roll_deg: float = 0
    pitch_deg: float = 0
    crack_width_mm: float = 0


def normalize_phone(phone: str):
    return re.sub(r"\s+", "", phone.strip())


def valid_phone(phone: str):
    return bool(re.fullmatch(r"\+?[1-9]\d{9,14}", phone))


def sms_templates(node_id: str, severity: str, location: str, risk: int, displacement: float, roll: float, pitch: float, crack: float):
    level = severity.lower()
    if level == "critical":
        return [
            f"BhuRakshak CRITICAL ALERT: Significant ground movement detected near {node_id} at {location}. Risk {risk}%.",
            f"BhuRakshak DANGER: {node_id} reports {displacement} mm displacement, {roll}° roll and {crack} mm crack width. Ground instability may be developing.",
            f"BhuRakshak SAFETY ACTION: Avoid the danger zone around {node_id}, stay outside marked buffers and follow mine emergency instructions immediately.",
        ]
    if level == "alert":
        return [
            f"BhuRakshak ALERT: Increased ground movement detected near {node_id} at {location}. Risk {risk}%.",
            f"BhuRakshak WARNING: {node_id} shows {displacement} mm displacement, {roll}° roll and {crack} mm crack width. Please remain alert.",
            f"BhuRakshak SAFETY ACTION: Avoid the affected area around {node_id} and follow official mine safety instructions.",
        ]
    if level == "watch":
        return [
            f"BhuRakshak ADVISORY: Ground movement indicators increased near {node_id} at {location}. Risk {risk}%.",
            f"BhuRakshak MONITORING: {node_id} currently reports {displacement} mm displacement and {crack} mm crack width. Conditions are being monitored.",
            f"BhuRakshak PRECAUTION: Stay clear of marked inspection buffers near {node_id} and watch for further safety updates.",
        ]
    return [
        f"BhuRakshak UPDATE: {node_id} at {location} is currently within the normal monitoring range. Risk {risk}%.",
        f"BhuRakshak MONITORING: {node_id} reports {displacement} mm displacement and {crack} mm crack width. No emergency action is currently required.",
        f"BhuRakshak STATUS: Continue normal precautions and monitor this safety portal for changes around {node_id}.",
    ]


@app.get("/api/notifications/status")
def notification_status():
    with SMS_LOCK:
        return {
            "mode": "DEMO",
            "provider": "BhuRakshak Demo SMS",
            "connected": True,
            "real_sms_enabled": False,
            "log_count": len(SMS_LOGS),
        }


@app.get("/api/notifications/logs")
def notification_logs():
    with SMS_LOCK:
        return {"logs": list(reversed(SMS_LOGS))[:40]}


@app.get("/api/notifications/inbox")
def notification_inbox():
    # Global demo inbox: an Admin dispatch is intentionally visible to the
    # Community User dashboard so the complete emergency workflow can be shown.
    with SMS_LOCK:
        return {"messages": list(reversed(SMS_LOGS))[:40], "unread_count": len(SMS_LOGS)}


@app.post("/api/notifications/sms")
def send_demo_sms(request: SmsRequest):
    phone = normalize_phone(request.phone_number)
    if not valid_phone(phone):
        return {"success": False, "message": "Enter a valid international phone number."}

    severity = request.severity.lower()
    if severity not in {"safe", "watch", "alert", "critical"}:
        severity = "alert"

    now = datetime.now(timezone.utc)
    bundle_id = f"DEMO-BUNDLE-{now.strftime('%Y%m%d%H%M%S')}-{random.randint(1000,9999)}"
    custom = request.message.strip()
    if custom:
        messages = [custom]
    else:
        messages = sms_templates(
            request.node_id,
            severity,
            request.location or request.zone,
            request.risk,
            request.displacement_mm,
            request.roll_deg,
            request.pitch_deg,
            request.crack_width_mm,
        )

    # The frontend normally sends live measurements in the message-free path.
    # If the endpoint is called directly without measurements, still provide a
    # meaningful template rather than an empty notification.
    created = []
    for idx, text in enumerate(messages, start=1):
        message_id = f"DEMO-SMS-{now.strftime('%Y%m%d%H%M%S')}-{random.randint(1000,9999)}"
        entry = {
            "message_id": message_id,
            "bundle_id": bundle_id,
            "sequence": idx,
            "recipient": phone,
            "message": text,
            "severity": severity,
            "zone": request.zone,
            "node_id": request.node_id,
            "location": request.location or request.zone,
            "incident_id": request.incident_id,
            "status": "sent",
            "delivery_status": "delivered",
            "provider": "BhuRakshak Demo SMS",
            "created_at": now.isoformat(),
        }
        created.append(entry)

    with SMS_LOCK:
        SMS_LOGS.extend(created)
        del SMS_LOGS[:-MAX_SMS_LOGS]
        save_sms_logs()

    return {
        "success": True,
        "bundle_id": bundle_id,
        "recipient": phone,
        "status": "sent",
        "delivery_status": "delivered",
        "provider": "BhuRakshak Demo SMS",
        "message_count": len(created),
        "messages": created,
    }


class IncidentReport(BaseModel):
    scenario: str
    nodes: list[dict]

@app.post("/api/reports/incident")
def incident_report(report: IncidentReport):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, rightMargin=15*mm, leftMargin=15*mm,
        topMargin=14*mm, bottomMargin=14*mm,
        title="BhuRakshak Incident Report"
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold",
                            fontSize=20, leading=24, textColor=colors.HexColor("#102a2e"),
                            alignment=TA_CENTER, spaceAfter=6)
    sub = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=9, leading=13,
                         textColor=colors.HexColor("#66787c"), alignment=TA_CENTER, spaceAfter=14)
    h = ParagraphStyle("H", parent=styles["Heading2"], fontSize=12, leading=15,
                       textColor=colors.HexColor("#006c4c"), spaceBefore=8, spaceAfter=6)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=8.5, leading=12,
                          textColor=colors.HexColor("#35484c"))

    now = datetime.now(timezone.utc)
    critical = sum(1 for n in report.nodes if n.get("risk", 0) >= 80)
    alerts = sum(1 for n in report.nodes if 55 <= n.get("risk", 0) < 80)
    watch = sum(1 for n in report.nodes if 30 <= n.get("risk", 0) < 55)

    story = [
        Paragraph("BhuRakshak", title),
        Paragraph("GEOTECHNICAL HAZARD · INCIDENT ASSESSMENT REPORT", sub),
        Paragraph(f"<b>Generated:</b> {now.strftime('%d %B %Y, %H:%M UTC')} &nbsp;&nbsp; "
                  f"<b>Simulation:</b> {report.scenario.upper()} &nbsp;&nbsp; <b>Source:</b> ESP32 + MPU6050 Simulator", body),
        Spacer(1, 7),
        Paragraph("Executive Summary", h),
        Paragraph(
            f"This presentation report summarizes the current simulated telemetry stream. "
            f"{len(report.nodes)} nodes were evaluated. The current stream contains "
            f"<b>{critical} critical</b>, <b>{alerts} alert</b> and <b>{watch} watch</b> risk states. "
            f"All readings are demonstration data and must not be treated as operational mine-safety predictions.",
            body
        ),
        Paragraph("Node Telemetry Snapshot", h),
    ]
    data = [["Node","Status","Risk","Roll","Pitch","Disp. mm","Crack mm","Battery","RSSI"]]
    for n in report.nodes:
        t=n.get("tilt",{})
        data.append([
            n.get("node_id","-"), str(n.get("status","-")).upper(), f'{n.get("risk",0)}%',
            f'{t.get("roll_deg",0)}°', f'{t.get("pitch_deg",0)}°',
            str(n.get("displacement_mm",0)), str(n.get("crack_width_mm",0)),
            f'{n.get("battery_v",0)}V', f'{n.get("rssi_dbm",0)}'
        ])
    table=Table(data, repeatRows=1, colWidths=[20*mm,18*mm,13*mm,14*mm,14*mm,17*mm,17*mm,17*mm,14*mm])
    table.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#102a2e")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("FONTSIZE",(0,0),(-1,-1),6.8),
        ("ALIGN",(2,1),(-1,-1),"CENTER"),
        ("GRID",(0,0),(-1,-1),0.35,colors.HexColor("#d9eaee")),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#f1fafc")]),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
    ]))
    story += [table, Spacer(1,10), Paragraph("Risk Interpretation", h)]
    story += [Paragraph(
        "SAFE &lt; 30% · WATCH 30–54% · ALERT 55–79% · CRITICAL ≥ 80%. "
        "These thresholds are demo logic used by the prototype only.", body)]
    story += [Paragraph("System Notes", h), Paragraph(
        "Telemetry is generated by the FastAPI simulation service and delivered to the React dashboards. "
        "The architecture is prepared for the next phase: MPU6050 → ESP32 → Wi-Fi → FastAPI → MongoDB → dashboards.",
        body)]
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition":"attachment; filename=bhurakshak-incident-report.pdf"})
