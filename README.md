# BhuRakshak — Final Demo

BhuRakshak is a presentation-ready geotechnical hazard monitoring prototype with separate Admin and Community User dashboards. The current phase uses a FastAPI simulator that generates ESP32/MPU6050-style telemetry. It is structured so the simulator can later be replaced by a real ESP32 data stream and MongoDB.

## Features

- Admin and Community User login portals
- Live simulated telemetry refreshed every 2.5 seconds
- SAFE / WATCH / ALERT / CRITICAL risk thresholds
- Scenario controls: normal, developing, alert, critical
- Live risk heat map with heat/roads/labels/zoom/fullscreen controls
- Telemetry history for 1H / 6H / 24H
- Sensor node operations and incident triage
- Functional advisory Acknowledge / Dismiss / Reopen controls
- Structured PDF incident report export
- **SMS Notifications demo module**
  - Send SMS button
  - Recipient validation
  - Realistic emergency message generation
  - Simulated SENT/DELIVERED response
  - Backend SMS delivery log
  - No paid provider or secret exposed in the browser
- Deployment configuration for Render (FastAPI) + Vercel (React/Vite)

## Demo credentials

- Admin: `admin@bhurakshak.demo` / `Admin@123`
- User: `user@bhurakshak.demo` / `User@123`

## Local setup

### Backend

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

From the project root, in another terminal:

```bat
npm install
npm run dev
```

Open `http://localhost:5173`.

The local Vite configuration proxies `/api` to `http://127.0.0.1:8000`, so `VITE_API_BASE_URL` can remain empty locally.

## SMS demo behavior

The current SMS implementation is intentionally **demo-only**. `POST /api/notifications/sms` does not call Twilio, MSG91, or another paid provider. It validates the phone number, creates a message ID, marks the event as `sent`/`delivered`, and stores the event in an in-memory backend log.

This lets the presentation demonstrate:

```text
Live sensor data -> risk score -> incident -> Send SMS -> SENT/DELIVERED log
```

Later, the same endpoint/service layer can be connected to Twilio or MSG91 without exposing provider credentials in React.

> Note: the in-memory log resets when the Render service restarts/redeploys. MongoDB can be added in the next phase for persistent users, incidents, telemetry and SMS logs.

## Render deployment — FastAPI backend

This repository includes `render.yaml`.

1. Push the project to GitHub.
2. In Render, create a Blueprint from the repository, or create a Web Service manually.
3. If creating manually, use:
   - Runtime: Python
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/api/health`
4. After Vercel is deployed, set the Render environment variable:
   - `FRONTEND_URL=https://YOUR-PROJECT.vercel.app`

Render should provide a public URL such as `https://bhurakshak-api.onrender.com`.

## Vercel deployment — React frontend

The repository root contains the workspace `package.json` and `vercel.json`.

1. Import the GitHub repository into Vercel.
2. Keep the project root at the repository root.
3. Vercel will use `npm install` and `npm run build`.
4. Add the production environment variable:
   - `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com`
5. Deploy/redeploy.

After deployment, the browser calls the Render backend using that environment variable. Do not put Twilio/MSG91 credentials in Vercel frontend environment variables; browser-visible `VITE_*` variables are not secret.

## API endpoints

- `GET /api/health`
- `GET /api/telemetry/latest`
- `GET /api/telemetry/history/{node_id}?hours=1|6|24`
- `GET /api/simulation/state`
- `POST /api/simulation/scenario/{scenario}`
- `POST /api/simulation/step`
- `GET /api/notifications/status`
- `GET /api/notifications/logs`
- `GET /api/notifications/inbox`
- `POST /api/notifications/sms`
- `POST /api/reports/incident`

## Important disclaimer

This is a demonstration prototype. The telemetry is simulated and the risk thresholds are demo logic. It must not be treated as an operational mine-safety prediction or emergency warning system.

## SMS demo workflow
The Admin dashboard's SMS Notifications module now dispatches a three-message, node-specific emergency bundle in demo mode. Severity templates are generated from the selected node's live risk, displacement, tilt, and crack-width values. The FastAPI backend stores each message as SENT/DELIVERED and exposes the same messages through `/api/notifications/inbox`; the Community User dashboard polls this endpoint and shows a notification badge, notification center, and Emergency Messages section. No Twilio/MSG91 credentials are required for this demo version.


### SMS demo persistence
SMS dispatches are stored in `data/sms_logs.json` so Admin delivery logs and Community User notifications survive browser refreshes while the backend instance retains its filesystem. Demo mode does not call a paid SMS provider.


### Admin → User SMS demo flow
1. Admin opens **Alerts & Incident Dispatch** and clicks **Details** or **Send SMS**.
2. **Send SMS** opens a node-specific composer with three predefined safety messages based on SAFE/WATCH/ALERT/CRITICAL severity.
3. Dispatch creates three `sent/delivered` demo SMS records in FastAPI.
4. **SMS Delivery Log** refreshes automatically and survives browser refreshes.
5. The Community User portal polls the same notification store and shows a notification badge, notification center, and emergency messages.
6. No paid SMS provider is called in demo mode.
