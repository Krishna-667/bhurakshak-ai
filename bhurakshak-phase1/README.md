
# BhuRakshak AI — Phase 1 Prototype

This phase is a deliberately lightweight software prototype for the idea-presentation stage.

## Scope

- FastAPI backend with dummy mine/node/alert/risk data
- React + Vite frontend
- Dashboard KPI cards
- Simulated risk level and time-to-threshold
- Dummy node health table
- Dummy risk-zone visualization
- Deformation trend chart
- Explainable alert feed
- Demo alert button
- No database, authentication, cloud deployment, or hardware dependency yet

## Run backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

## Run frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally http://127.0.0.1:5173).

## Important

All values are DEMO/DUMMY DATA. Do not present them as measurements from a real mine.

## Phase 1 judging narrative

1. "BhuRakshak continuously watches distributed points over a mine panel."
2. "Each point reports tilt, vibration, displacement and health information."
3. "The backend aggregates the information into spatial risk."
4. "The prototype surfaces an explainable risk state and estimated time to a defined critical threshold."
5. "The same data contract will later accept real LoRa gateway telemetry."

## Hardware track in parallel

Build in this order:

ESP32 → MPU6050 → LoRa point-to-point → 2nd node → 3rd node → multi-hop relay → gateway → MQTT bridge.

Do not connect the hardware to this Phase 1 backend yet. Freeze the JSON telemetry contract first, then connect it in the next integration step.
