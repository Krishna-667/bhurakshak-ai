
import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './styles.css'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function StatusBadge({status}) {
  return <span className={`badge ${status}`}>{status.toUpperCase()}</span>
}

function App() {
  const [dashboard, setDashboard] = useState(null)
  const [nodes, setNodes] = useState([])
  const [alerts, setAlerts] = useState([])
  const [selected, setSelected] = useState('N-03')
  const [readings, setReadings] = useState([])
  const [demoMessage, setDemoMessage] = useState('')

  async function load() {
    const [d, n, a, r] = await Promise.all([
      fetch(`${API}/api/dashboard`).then(x=>x.json()),
      fetch(`${API}/api/nodes`).then(x=>x.json()),
      fetch(`${API}/api/alerts`).then(x=>x.json()),
      fetch(`${API}/api/readings/${selected}`).then(x=>x.json()),
    ])
    setDashboard(d)
    setNodes(n)
    setAlerts(a)
    setReadings(r.readings.map((x,i)=>({...x, hour:i+1})))
  }

  useEffect(()=>{ load().catch(e=>setDemoMessage('Backend not reachable. Start FastAPI on port 8000.')) }, [selected])

  async function fireDemoAlert() {
    const res = await fetch(`${API}/api/alerts/test`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({severity:'critical', node_id:selected})
    })
    const data = await res.json()
    setDemoMessage(data.message)
    await load()
  }

  const nodeCounts = useMemo(()=>({
    safe: nodes.filter(n=>n.status==='safe').length,
    watch: nodes.filter(n=>n.status==='watch').length,
    alert: nodes.filter(n=>n.status==='alert').length
  }), [nodes])

  if (!dashboard) return <div className="loading">Loading BhuRakshak mission control…</div>

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><div className="brandMark">◈</div><div><strong>BhuRakshak</strong><small>AI Early Warning</small></div></div>
        <div className="nav active">Overview</div>
        <div className="nav">Risk Map</div>
        <div className="nav">Nodes</div>
        <div className="nav">Alerts</div>
        <div className="nav">Digital Twin</div>
        <div className="sideBottom">
          <div className="mini"><span className="dot live"></span> Demo environment</div>
          <div className="mini">Panel <b>{dashboard.panel}</b></div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">MINE SAFETY / LIVE MONITORING</div>
            <h1>{dashboard.mine}</h1>
          </div>
          <div className="topActions"><span className="livePill"><span className="dot live"></span> LIVE</span><span className="updated">Updated just now</span></div>
        </header>

        <section className="hero">
          <div>
            <div className="eyebrow">CURRENT RISK</div>
            <div className="riskRow"><div className="riskTitle">{dashboard.risk_level}</div><div className="confidence">{Math.round(dashboard.confidence*100)}% confidence</div></div>
            <p>{dashboard.insight}</p>
            <button onClick={fireDemoAlert}>Trigger Demo Alert</button>
            {demoMessage && <div className="toast">{demoMessage}</div>}
          </div>
          <div className="countdown"><div className="countLabel">EST. TIME TO THRESHOLD</div><div className="hours">{dashboard.predicted_threshold_hours}<span> hrs</span></div><div className="countSub">Inverse-velocity demo estimate</div></div>
        </section>

        <section className="kpis">
          <div className="card"><span>ACTIVE ALERTS</span><strong>{dashboard.active_alerts}</strong><em>requires review</em></div>
          <div className="card"><span>NODES ONLINE</span><strong>{dashboard.nodes_online}/{dashboard.nodes_total}</strong><em>mesh healthy</em></div>
          <div className="card"><span>MONITORED AREA</span><strong>{dashboard.coverage_km2}</strong><em>km²</em></div>
          <div className="card"><span>NODE STATES</span><strong>{nodeCounts.safe}/{nodeCounts.watch}/{nodeCounts.alert}</strong><em>safe / watch / alert</em></div>
        </section>

        <section className="grid2">
          <div className="panel">
            <div className="panelHead"><div><h2>Deformation trend</h2><p>Selected node: {selected}</p></div>
              <select value={selected} onChange={e=>setSelected(e.target.value)}>{nodes.map(n=><option key={n.id}>{n.id}</option>)}</select>
            </div>
            <div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={readings}><XAxis dataKey="hour" hide/><YAxis hide domain={['dataMin - 1','dataMax + 1']}/><Tooltip/><Line type="monotone" dataKey="displacement" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="tilt" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>
            <div className="legend"><span><i className="l1"></i> displacement</span><span><i className="l2"></i> tilt</span></div>
          </div>

          <div className="panel">
            <div className="panelHead"><div><h2>Risk zones</h2><p>Spatially correlated demo state</p></div></div>
            <div className="riskMap">
              <div className="gridLines"></div>
              <div className="zone zone1"><b>HIGH</b><span>P3 West</span></div>
              <div className="zone zone2"><b>WATCH</b><span>P3 South</span></div>
              {nodes.map(n=><button key={n.id} className={`node ${n.status}`} style={{left:`${18+(n.lng-86.432)*1000}%`,top:`${22+(23.749-n.lat)*500}%`}} onClick={()=>setSelected(n.id)} title={n.name}>{n.id.replace('N-','')}</button>)}
              <div className="mapLabel">DEMO GEO-MAP</div>
            </div>
          </div>
        </section>

        <section className="grid2">
          <div className="panel">
            <div className="panelHead"><div><h2>Node health</h2><p>Telemetry and mesh status</p></div></div>
            <div className="table">
              {nodes.map(n=><div className="row" key={n.id} onClick={()=>setSelected(n.id)}>
                <div><b>{n.id}</b><small>{n.name}</small></div><StatusBadge status={n.status}/><div>{n.battery}%</div><div>{n.rssi} dBm</div>
              </div>)}
            </div>
          </div>

          <div className="panel">
            <div className="panelHead"><div><h2>Latest alerts</h2><p>Explainable event feed</p></div></div>
            <div className="alerts">
              {alerts.map(a=><div className="alertItem" key={a.id}><div className={`alertIcon ${a.severity}`}>!</div><div><b>{a.title}</b><small>{a.node} · {a.time} · {Math.round(a.confidence*100)}% confidence</small><p>{a.message}</p></div></div>)}
            </div>
          </div>
        </section>

        <footer><b>BhuRakshak AI</b> · Prototype Phase 1 · Dummy data only · Built around the blueprint's node → gateway → AI → risk → alert flow.</footer>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
