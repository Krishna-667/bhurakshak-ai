import React, {useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid} from "recharts";
import "./styles.css";

const ADMIN={email:"admin@bhurakshak.demo",password:"Admin@123",name:"Col. R. Vardhan",role:"admin"};
const USER={email:"user@bhurakshak.demo",password:"User@123",name:"Aarav Sharma",role:"user"};

const fallbackNodes=[
 {node_id:"NODE-001",location:"Panel A Bench 2",x:18,y:27,risk:12,status:"safe",tilt:{roll_deg:.42,pitch_deg:.31,yaw_deg:.2},displacement_mm:2.4,crack_width_mm:1.2,battery_v:4.12,rssi_dbm:-58},
 {node_id:"NODE-002",location:"Panel A Bench 4",x:32,y:55,risk:18,status:"safe",tilt:{roll_deg:.58,pitch_deg:.44,yaw_deg:.1},displacement_mm:2.8,crack_width_mm:1.5,battery_v:4.08,rssi_dbm:-64},
 {node_id:"NODE-003",location:"Highwall Bench C-East",x:52,y:46,risk:87,status:"critical",tilt:{roll_deg:3.1,pitch_deg:2,yaw_deg:.4},displacement_mm:12.4,crack_width_mm:7.9,battery_v:3.91,rssi_dbm:-62},
 {node_id:"NODE-004",location:"Drainage Borehole",x:22,y:72,risk:45,status:"watch",tilt:{roll_deg:1.4,pitch_deg:1.1,yaw_deg:-.2},displacement_mm:5.7,crack_width_mm:4.2,battery_v:3.85,rssi_dbm:-71},
 {node_id:"NODE-005",location:"North Waste Dump",x:72,y:28,risk:15,status:"safe",tilt:{roll_deg:.5,pitch_deg:.38,yaw_deg:.1},displacement_mm:2.5,crack_width_mm:1.3,battery_v:4.18,rssi_dbm:-55},
 {node_id:"NODE-006",location:"South Portal Shaft",x:68,y:72,risk:68,status:"alert",tilt:{roll_deg:2,pitch_deg:1.5,yaw_deg:.2},displacement_mm:8.1,crack_width_mm:5.8,battery_v:3.98,rssi_dbm:-68},
 {node_id:"NODE-007",location:"Shear Bench West",x:79,y:48,risk:72,status:"alert",tilt:{roll_deg:2.2,pitch_deg:1.7,yaw_deg:.5},displacement_mm:8.7,crack_width_mm:6.2,battery_v:4.01,rssi_dbm:-60},
 {node_id:"NODE-008",location:"Panel B Bench 1",x:87,y:24,risk:10,status:"safe",tilt:{roll_deg:.36,pitch_deg:.28,yaw_deg:-.1},displacement_mm:2.1,crack_width_mm:1.1,battery_v:4.10,rssi_dbm:-57}
];

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/$/,"");
const api=async(path,opts={})=>{const r=await fetch(`${API_BASE}${path}`,opts);if(!r.ok){let msg="API "+r.status;try{const d=await r.json();msg=d.detail||d.message||msg}catch{}throw new Error(msg)}return r.json()};
const levelText=s=>s==="critical"?"CRITICAL":s==="alert"?"ALERT":s==="watch"?"WATCH":"SAFE";

function Icon({children}){return <span className="material-symbols-outlined">{children}</span>}
function Badge({status}){return <span className={`badge ${status}`}>{levelText(status)}</span>}
function Modal({title,children,onClose}){return <div className="modalBackdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modalHead"><h3>{title}</h3><button onClick={onClose}><Icon>close</Icon></button></div>{children}</div></div>}
function PageTitle({title,sub}){return <div className="pageTitle"><div><span className="eyebrow">COMMAND MODULE</span><h2>{title}</h2><p>{sub}</p></div><span className="livePill"><i className="liveDot"/> LIVE SIMULATION</span></div>}

function Login({onLogin}){
 const [role,setRole]=useState("admin"),[email,setEmail]=useState(ADMIN.email),[password,setPassword]=useState(ADMIN.password),[error,setError]=useState("");
 const select=r=>{setRole(r);setEmail(r==="admin"?ADMIN.email:USER.email);setPassword(r==="admin"?ADMIN.password:USER.password);setError("")};
 const submit=e=>{e.preventDefault();const err=onLogin(email,password);if(err)setError(err)};
 return <div className="loginPage"><div className="loginGlow"/><div className="loginCard">
  <div className="brand loginBrand"><div className="brandLogo"><Icon>terrain</Icon></div><div><b>BhuRakshak</b><small>GEOTECHNICAL HAZARD INTELLIGENCE</small></div></div>
  <div className="loginIntro"><span className="eyebrow">PHASE 1 DEMO ACCESS</span><h1>Secure monitoring portal</h1><p>Use the same demo credentials for the redesigned command console or community safety portal.</p></div>
  <div className="roleSwitch"><button className={role==="admin"?"active":""} onClick={()=>select("admin")}><Icon>shield_person</Icon> Admin</button><button className={role==="user"?"active":""} onClick={()=>select("user")}><Icon>person</Icon> Community User</button></div>
  <form onSubmit={submit}><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email"/></label><label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password"/></label>{error&&<div className="errorBox">{error}</div>}<button className="primaryBtn">Sign in to {role==="admin"?"Command Console":"Safety Portal"} <Icon>arrow_forward</Icon></button></form>
  <div className="demoCreds"><b>Demo credentials</b><span>{role==="admin"?ADMIN.email:USER.email}</span><span>{role==="admin"?ADMIN.password:USER.password}</span></div>
  <p className="disclaimer">Live demo stream: FastAPI generates random ESP32/MPU6050-style telemetry. MongoDB is reserved for the next phase.</p>
 </div></div>
}

function useLiveTelemetry(){
 const [nodes,setNodes]=useState(fallbackNodes),[connected,setConnected]=useState(false),[sequence,setSequence]=useState(0),[scenario,setScenario]=useState("alert");
 const refresh=async()=>{try{const data=await api("/api/telemetry/latest");setNodes(data);setConnected(true);setSequence(x=>x+1)}catch{setConnected(false)}};
 useEffect(()=>{refresh();const id=setInterval(refresh,2500);return()=>clearInterval(id)},[]);
 const setScenarioLive=async(s)=>{setScenario(s);try{const data=await api(`/api/simulation/scenario/${s}`,{method:"POST"});setNodes(data.readings||nodes);setConnected(true)}catch{}};
 return {nodes,connected,sequence,scenario,setScenario:setScenarioLive,refresh};
}

function Shell({user,onLogout,children,active,setActive,notifications,onNotifications,connected,adminModal,setAdminModal}){
 const nav=[["overview","grid_view","Overview"],["risk","map","Risk Geospatial Map"],["telemetry","vital_signs","Telemetry Streams"],["nodes","sensors","Sensor Nodes"],["alerts","fmd_bad","Alerts & Incident Dispatch"],["sms","sms","SMS Notifications"]];
 return <div className="adminShell"><aside className="sidebar"><div><div className="sideTop"><div className="brand"><div className="brandLogo"><Icon>terrain</Icon></div><div><b>BhuRakshak</b><small>Geotechnical Hazard Intelligence</small></div></div></div><div className="sideLabel">COMMAND MODULES</div><nav>{nav.map(([id,ic,label])=><button key={id} className={active===id?"active":""} onClick={()=>setActive(id)}><Icon>{ic}</Icon><span>{label}</span>{id==="alerts"&&notifications>0&&<b className="navCount">{notifications}</b>}</button>)}</nav></div><div className="sideBottom"><div className="statusBox"><span><i className={`liveDot ${connected?"":"offline"}`}/> API {connected?"Connected":"Fallback"}</span><b>{connected?"OPERATIONAL":"LOCAL"}</b></div><div className="profile"><div className="avatar"><Icon>shield_person</Icon></div><div><b>{user.name}</b><small>Chief Mine Geotech Dir.</small></div><button onClick={onLogout}><Icon>logout</Icon></button></div></div></aside><main className="adminMain"><header className="topbar"><div className="topTitle"><span className="eyebrow">OPERATIONAL NODE · LIVE MONITOR</span><h1>BhuRakshak <em>| Geotechnical Hazard Intelligence</em></h1></div><div className="topTools"><span className="livePill"><i className={`liveDot ${connected?"":"offline"}`}/> {connected?"LIVE":"LOCAL"}</span><span className="updated">Streaming every 2.5s</span><button className="iconBtn" onClick={onNotifications}><Icon>notifications</Icon>{notifications>0&&<i className="notifyDot"/>}</button><button className="avatar topAvatar" onClick={onLogout}><Icon>person</Icon></button></div></header>{children}</main>{adminModal&&<Modal title={adminModal.title} onClose={()=>setAdminModal(null)}>{adminModal.body}</Modal>}</div>
}

function HeatMap({nodes,selected,onSelect}){
 const [zoom,setZoom]=useState(1),[layers,setLayers]=useState({roads:true,heat:true,labels:true}),[fullscreen,setFullscreen]=useState(false);
 const spots=nodes.map(n=>({x:n.x,y:n.y,risk:n.risk}));
 const toggle=k=>setLayers(x=>({...x,[k]:!x[k]}));
 return <div className={`heatMap ${fullscreen?"mapFullscreen":""}`}><div className="mapToolbar"><button className={layers.heat?"on":""} onClick={()=>toggle("heat")}><Icon>blur_on</Icon> Heat</button><button className={layers.roads?"on":""} onClick={()=>toggle("roads")}><Icon>route</Icon> Roads</button><button className={layers.labels?"on":""} onClick={()=>toggle("labels")}><Icon>label</Icon> Labels</button><button onClick={()=>setZoom(z=>Math.min(1.8,+(z+.15).toFixed(2)))}><Icon>add</Icon></button><button onClick={()=>setZoom(z=>Math.max(.7,+(z-.15).toFixed(2)))}><Icon>remove</Icon></button><button onClick={()=>setZoom(1)}><Icon>my_location</Icon></button><button onClick={()=>setFullscreen(f=>!f)}><Icon>{fullscreen?"close_fullscreen":"fullscreen"}</Icon></button></div><div className="mapCanvas" style={{transform:`scale(${zoom})`}}><div className="mapTerrain"/><div className="mapGrid"/><div className="mapRoads" style={{display:layers.roads?"block":"none"}}><i className="road r1"/><i className="road r2"/><i className="road r3"/><i className="road r4"/><i className="road r5"/><i className="road r6"/></div><div className="heatField" style={{display:layers.heat?"block":"none"}}>{spots.map((n,i)=><i key={i} className={`heatSpot ${n.risk>=80?"critical":n.risk>=55?"high":n.risk>=30?"medium":"low"}`} style={{left:`${n.x}%`,top:`${n.y}%`}}/>)}</div><div className="mapLabels" style={{display:layers.labels?"block":"none"}}><span style={{left:"9%",top:"20%"}}>North Buffer</span><span style={{left:"40%",top:"18%"}}>Sector 4</span><span style={{left:"64%",top:"37%"}}>Highwall Bench C</span><span style={{left:"25%",top:"73%"}}>Residential Zone</span><span style={{left:"73%",top:"76%"}}>South Corridor</span><span style={{left:"47%",top:"55%"}}>Fault Line C-C'</span></div>{nodes.map(n=><button key={n.node_id} className={`heatPin ${n.status} ${selected===n.node_id?"selected":""}`} style={{left:`${n.x}%`,top:`${n.y}%`}} onClick={()=>onSelect(n.node_id)} title={`${n.node_id} · ${n.risk}% risk`}><span className="pinShape"><i>{n.status==="critical"?"!":""}</i></span><b>{n.node_id}</b><small>{n.risk}%</small></button>)}</div></div>
}

function Metric({label,value,note,green}){return <div><span>{label}</span><b className={green?"greenText":""}>{value}</b><small>{note}</small></div>}
function Kpi({title,value,note,icon}){return <div className="kpi panel"><div><span>{title}</span><strong>{value}</strong><small>{note}</small></div><Icon>{icon}</Icon></div>}

function TelemetryPanel({selected,setSelected,nodes,history}){
 const [range,setRange]=useState("6H");
 const n=nodes.find(x=>x.node_id===selected)||nodes[0];
 const ranges=["1H","6H","24H"];
 const points=range==="1H"?history.slice(-13):range==="6H"?history.slice(-25):history;
 return <section className="panel telemetry"><div className="panelTop"><div><h3>LIVE DEFORMATION TELEMETRY <b className="nodeTag">{selected}</b></h3><small>ESP32 + MPU6050 simulation · Inclinometer · Extensometer · Crack Gauge · Sample Rate: 10 Hz</small></div><div className="selector"><select value={selected} onChange={e=>setSelected(e.target.value)}>{nodes.map(x=><option key={x.node_id}>{x.node_id}</option>)}</select><div className="rangeBtns">{ranges.map(r=><button key={r} className={range===r?"active":""} onClick={()=>setRange(r)}>{r}</button>)}</div></div></div><div className="telemetryLegend"><span><i className="cyan"/> Ground Displacement: <b>{n?.displacement_mm} mm</b></span><span><i className="amber"/> Triaxial Tilt: <b>{n?.tilt?.roll_deg}°</b></span><span><i className="red"/> Crack Width: <b>{n?.crack_width_mm} mm</b></span><span className="threshold">Risk: <b>{n?.risk}%</b></span></div><div className="rangeNote">Showing <b>{range}</b> telemetry window · {points.length} samples · Select a time range to update the chart.</div><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={points}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/><Tooltip/><Line type="monotone" dataKey="displacement" stroke="#0891b2" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="tilt" stroke="#f59e0b" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="crack" stroke="#dc2626" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></section>
}
function useHistory(selected){
 const [history,setHistory]=useState([]);
 useEffect(()=>{let alive=true;const load=async()=>{try{const d=await api(`/api/telemetry/history/${selected}`);if(alive)setHistory(d.history)}catch{}};load();const id=setInterval(load,5000);return()=>{alive=false;clearInterval(id)}},[selected]);
 return history;
}

function ScenarioCard({scenario,setScenario,refresh}){
 return <section className="panel scenarioCard"><div className="panelTop"><h3><Icon>science</Icon> SCENARIO SIMULATION</h3><b className="refTag">LIVE API</b></div><p>Change the simulated field condition. New ESP32/MPU6050-style readings are generated continuously by FastAPI.</p><div className="scenarioButtons">{["normal","developing","alert","critical"].map(s=><button className={scenario===s?"active":""} key={s} onClick={()=>setScenario(s)}>{s}</button>)}</div><div className="scenarioBottom"><span>Stream Status<br/><b>2.5 sec refresh</b></span><button className="greenBtn" onClick={refresh}><Icon>refresh</Icon> NEW READING</button></div></section>
}

function Admin({user,onLogout}){
 const live=useLiveTelemetry(),{nodes,connected,scenario,setScenario,refresh}=live;
 const [active,setActive]=useState("overview"),[selected,setSelected]=useState("NODE-003"),[modal,setModal]=useState(null),[search,setSearch]=useState("");
 const history=useHistory(selected);
 const activeAlerts=nodes.filter(n=>n.risk>=55),critical=nodes.filter(n=>n.risk>=80).length,watch=nodes.filter(n=>n.risk>=30&&n.risk<55).length;
 const exportReport=async()=>{try{const res=await fetch(`${API_BASE}/api/reports/incident`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenario,nodes})});if(!res.ok)throw new Error("Report generation failed");const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`bhurakshak-incident-report-${new Date().toISOString().slice(0,10)}.pdf`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}catch(e){setModal({title:"Report generation failed",body:<p>Could not generate the PDF report. Make sure the FastAPI backend is running.</p>})}}; const openNode=n=>setModal({title:`${n.node_id} — Live Telemetry`,body:<NodeDetail n={n}/>});
 return <Shell user={user} onLogout={onLogout} active={active} setActive={setActive} notifications={activeAlerts.length} onNotifications={()=>setActive("alerts")} connected={connected} adminModal={modal} setAdminModal={setModal}><div className="page">
  {active==="overview"&&<AdminOverview nodes={nodes} scenario={scenario} setScenario={setScenario} refresh={refresh} selected={selected} setSelected={setSelected} history={history} setModal={setModal} exportReport={exportReport} alerts={activeAlerts} critical={critical} watch={watch}/>}
  {active==="risk"&&<><PageTitle title="Risk Geospatial Map" sub="Live spatial risk concentration from the simulated sensor stream."/><section className="panel largePanel"><HeatMap nodes={nodes} selected={selected} onSelect={setSelected}/></section></>}
  {active==="telemetry"&&<><PageTitle title="Telemetry Streams" sub="Live multi-sensor deformation data generated by the ESP32/MPU6050 simulator."/><TelemetryPanel selected={selected} setSelected={setSelected} nodes={nodes} history={history}/></>}
  {active==="nodes"&&<><PageTitle title="Sensor Nodes" sub="Every row below is refreshed from the live simulator."/><section className="panel largePanel"><div className="searchRow"><input placeholder="Search node or location..." value={search} onChange={e=>setSearch(e.target.value)}/></div><NodeTable nodes={nodes.filter(n=>(n.node_id+" "+n.location).toLowerCase().includes(search.toLowerCase()))} selected={selected} setSelected={setSelected} onView={openNode}/></section></>}
  {active==="alerts"&&<AlertsPage nodes={nodes} setModal={setModal}/>}
  {active==="sms"&&<SmsPage nodes={nodes} setModal={setModal}/>}
 </div></Shell>
}

function AdminOverview({nodes,scenario,setScenario,refresh,selected,setSelected,history,setModal,exportReport,alerts,critical,watch}){
 const [advisoryState,setAdvisoryState]=useState("active");
 const counts={safe:nodes.filter(n=>n.status==="safe").length,watch:nodes.filter(n=>n.status==="watch").length,alert:nodes.filter(n=>n.status==="alert").length,critical};
 const lead=nodes.find(n=>n.node_id==="NODE-003")||nodes[0];
 return <>{advisoryState!=="dismissed"&&<div className={`hazardBanner ${advisoryState==="acknowledged"?"acknowledged":""}`}><div className="bannerLeft"><span className="warningIcon"><Icon>{advisoryState==="acknowledged"?"check_circle":"warning"}</Icon></span><div><div className="bannerMeta"><b>{advisoryState==="acknowledged"?"ADVISORY ACKNOWLEDGED":"SYSTEM HAZARD ADVISORY"}</b><span>Node: {lead?.node_id} · Zone: Sector 4 North Buffer · Live stream</span></div><p>{lead?.displacement_mm} mm displacement · Roll {lead?.tilt?.roll_deg}° · Risk {lead?.risk}%. Values update automatically.</p></div></div><div className="bannerActions">{advisoryState==="active"&&<button className="amberBtn" onClick={()=>setAdvisoryState("acknowledged")}><Icon>done_all</Icon>Acknowledge</button>}<button className="lightBtn" onClick={()=>setAdvisoryState("dismissed")}>Dismiss</button>{advisoryState==="acknowledged"&&<button className="lightBtn" onClick={()=>setAdvisoryState("active")}><Icon>undo</Icon>Reopen</button>}</div></div>}
<div className="heroGrid"><section className="panel heroRisk"><div className="panelTop"><span className="sectionKicker"><Icon>radar</Icon> AGGREGATE ASSESSMENT MODULE</span><div className="riskTabs">{["normal","developing","alert","critical"].map(s=><button key={s} className={scenario===s?"active":""} onClick={()=>setScenario(s)}>{s}</button>)}</div></div><h2>{lead?.risk>=80?"CRITICAL":"ELEVATED"} · Live Shear Monitoring</h2><p>Current posture is calculated from the live simulated node stream. The lead node is {lead?.node_id} at {lead?.location}, with continuously changing displacement and tilt values.</p><div className="heroMetrics"><Metric label="Vector Trend" value={`${(lead?.displacement_mm/5).toFixed(1)} mm/hr ↑`} note="Simulated trend"/><Metric label="Basal Slip Risk" value={`Class ${lead?.risk>=80?"IV":lead?.risk>=55?"III":"II"}`} note={`${lead?.risk}% current risk`}/><Metric label="Hazard Protocol" value={lead?.risk>=80?"LEVEL-3":"LEVEL-2"} note="Demo response state" green/></div></section>
 <section className="panel projection"><div className="panelTop"><span className="sectionKicker">KINEMATIC PROJECTION MODEL</span><b className="refTag">LIVE #409</b></div><span className="smallLabel">ESTIMATED TIME TO THRESHOLD</span><div className="hours">{Math.max(2.1,25-lead?.risk/4).toFixed(1)} <small>HOURS</small></div><div className="progress"><i style={{width:`${Math.min(95,lead?.risk)}%`}}/></div><div className="confidence"><span>Model Confidence<br/><b>91.4% (Demo)</b></span><span>Safety Margin<br/><b className="dangerText">{(10-lead?.displacement_mm).toFixed(1)} mm</b></span></div></section></div>
 <div className="kpis"><Kpi title="ACTIVE ALERTS" value={alerts.length} note={`${critical} critical · ${alerts.filter(n=>n.status==="alert").length} alert`} icon="notifications_active"/><Kpi title="NODES ONLINE" value={`${nodes.length} / 20`} note="FastAPI telemetry stream" icon="sensors"/><Kpi title="MONITORED AREA" value="1.8 km²" note="Demo Pit Corridor SEC-04" icon="terrain"/><Kpi title="NODE BREAKDOWN" value={`${counts.safe}/${counts.watch}/${counts.alert+counts.critical}`} note="safe / watch / alert+" icon="monitor_heart"/></div>
 <div className="twoCol"><section className="panel mapPanel"><div className="panelTop"><div><h3>LIVE RISK GEOSPATIAL HEAT MAP <i className="liveDot"/><span className="streamText">streaming</span></h3><small>Risk intensity is derived directly from live node risk scores.</small></div></div><HeatMap nodes={nodes} selected={selected} onSelect={setSelected}/><div className="heatLegend"><span>Risk Gradient</span><i/><b>Safe</b><b>Watch</b><b>Alert</b><b>Critical</b></div></section><div className="rightStack"><ScenarioCard scenario={scenario} setScenario={setScenario} refresh={refresh}/></div></div>
 <TelemetryPanel selected={selected} setSelected={setSelected} nodes={nodes} history={history}/><div className="twoCol"><NodeTable nodes={nodes.slice(0,8)} selected={selected} setSelected={setSelected} onView={n=>setModal({title:`${n.node_id} — Node Detail`,body:<NodeDetail n={n}/>})}/><IncidentPanel nodes={nodes} onView={n=>setModal({title:`${n.node_id} — Alert Detail`,body:<NodeDetail n={n}/>})}/></div><div className="footerActions"><button className="darkBtn" onClick={exportReport}><Icon>file_download</Icon> Export Incident Report</button></div></>
}


function NodeTable({nodes,selected,setSelected,onView}){return <section className="panel nodeTable"><div className="panelTop"><div><h3>NODE OPERATIONS <b className="countTag">{nodes.length} Live Nodes</b></h3><small>Risk, tilt, displacement, power and signal from the simulator</small></div></div><div className="tableWrap"><table><thead><tr><th>Node</th><th>Status</th><th>Risk</th><th>Roll / Pitch</th><th>Displacement</th><th>Battery / RSSI</th><th>Action</th></tr></thead><tbody>{nodes.map(n=><tr key={n.node_id} className={selected===n.node_id?"rowSelected":""} onClick={()=>setSelected(n.node_id)}><td><b>{n.node_id}</b><small>{n.location}</small></td><td><Badge status={n.status}/></td><td className={n.status}>{n.risk}%</td><td className="mono">{n.tilt.roll_deg}° / {n.tilt.pitch_deg}°</td><td>{n.displacement_mm} mm</td><td className="mono">{n.battery_v}V / {n.rssi_dbm}dBm</td><td><button className="textBtn" onClick={e=>{e.stopPropagation();onView(n)}}>Inspect</button></td></tr>)}</tbody></table></div></section>}
function IncidentPanel({nodes,onView}){const alerts=nodes.filter(n=>n.risk>=55).slice(0,4);return <section className="panel incident"><div className="panelTop"><h3><Icon>e911_emergency</Icon> ACTIVE INCIDENT TRIAGE</h3><b className="dangerPill">{alerts.length} LIVE</b></div>{alerts.length?alerts.map(n=><div className={`incidentCard ${n.status}`} key={n.node_id}><div><Badge status={n.status}/><small>{n.node_id}</small></div><b>{n.status==="critical"?"Critical Threshold":"Elevated Risk"} · {n.risk}%</b><p>{n.location}: {n.displacement_mm} mm displacement and {n.tilt.roll_deg}° roll.</p><button className="amberBtn small" onClick={()=>onView(n)}>Take Action</button></div>):<div className="emptySmall">No active simulated incidents.</div>}</section>}
function AlertsPage({nodes,setModal}){const alerts=nodes.filter(n=>n.risk>=30).sort((a,b)=>b.risk-a.risk);return <><PageTitle title="Alerts & Incident Dispatch" sub="Live alerts are created from the current simulated risk score."/><section className="panel largePanel"><div className="alertList">{alerts.map(n=><div className={`fullAlert ${n.status}`} key={n.node_id}><div className="alertIcon"><Icon>{n.status==="critical"?"priority_high":"warning"}</Icon></div><div className="grow"><div className="bannerMeta"><Badge status={n.status}/><span>{n.node_id} · {n.location}</span></div><h3>{n.status==="critical"?"Critical Threshold Exceeded":"Ground Movement Advisory"}</h3><p>Risk {n.risk}% · Displacement {n.displacement_mm} mm · Roll {n.tilt.roll_deg}° · Pitch {n.tilt.pitch_deg}° · Signal {n.rssi_dbm} dBm.</p><div className="alertActions"><button className="textBtn" onClick={()=>setModal({title:`${n.node_id} — Live Alert`,body:<NodeDetail n={n}/>})}>Details</button><button className="amberBtn small" onClick={()=>setModal({title:"Send BhuRakshak SMS",body:<SmsComposer node={n} onSent={data=>setModal({title:"SMS Bundle Sent",body:<SmsResult data={data}/>})}/>})}><Icon>sms</Icon> Send SMS</button></div></div></div>)}</div></section></>}

function NodeDetail({n}){return <div className="detailGrid">{[["Status",levelText(n.status)],["Risk Score",n.risk+"%"],["Roll",n.tilt.roll_deg+"°"],["Pitch",n.tilt.pitch_deg+"°"],["Yaw",n.tilt.yaw_deg+"°"],["Displacement",n.displacement_mm+" mm"],["Crack Width",n.crack_width_mm+" mm"],["Battery / RSSI",n.battery_v+"V / "+n.rssi_dbm+" dBm"],["Location",n.location],["Source","ESP32 + MPU6050 Simulator"]].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div>}

function SmsComposer({node,onSent}){
 const [phone,setPhone]=useState("+91"),[sending,setSending]=useState(false),[result,setResult]=useState(null),[error,setError]=useState("");
 const severity=node?.status||"alert";
 const templates={
  critical:[`BhuRakshak CRITICAL ALERT: Significant ground movement detected near ${node?.node_id} at ${node?.location}. Risk ${node?.risk}%.`,`BhuRakshak DANGER: ${node?.node_id} reports ${node?.displacement_mm} mm displacement, ${node?.tilt?.roll_deg}° roll and ${node?.crack_width_mm} mm crack width. Ground instability may be developing.`,`BhuRakshak SAFETY ACTION: Avoid the danger zone around ${node?.node_id}, stay outside marked buffers and follow mine emergency instructions immediately.`],
  alert:[`BhuRakshak ALERT: Increased ground movement detected near ${node?.node_id} at ${node?.location}. Risk ${node?.risk}%.`,`BhuRakshak WARNING: ${node?.node_id} shows ${node?.displacement_mm} mm displacement, ${node?.tilt?.roll_deg}° roll and ${node?.crack_width_mm} mm crack width. Please remain alert.`,`BhuRakshak SAFETY ACTION: Avoid the affected area around ${node?.node_id} and follow official mine safety instructions.`],
  watch:[`BhuRakshak ADVISORY: Ground movement indicators increased near ${node?.node_id} at ${node?.location}. Risk ${node?.risk}%.`,`BhuRakshak MONITORING: ${node?.node_id} currently reports ${node?.displacement_mm} mm displacement and ${node?.crack_width_mm} mm crack width. Conditions are being monitored.`,`BhuRakshak PRECAUTION: Stay clear of marked inspection buffers near ${node?.node_id} and watch for further safety updates.`]
 };
 const messages=templates[severity]||templates.alert;
 const send=async()=>{setError("");setResult(null);const normalized=phone.replace(/\s+/g,"");if(!/^\+?[1-9]\d{9,14}$/.test(normalized)){setError("Enter a valid phone number in international format, e.g. +919876543210.");return}setSending(true);try{const data=await api("/api/notifications/sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone_number:normalized,severity,zone:"Sector 4",incident_id:node?.node_id||"MANUAL",node_id:node?.node_id||"NODE-003",location:node?.location||"Sector 4",risk:node?.risk||0,displacement_mm:node?.displacement_mm||0,roll_deg:node?.tilt?.roll_deg||0,pitch_deg:node?.tilt?.pitch_deg||0,crack_width_mm:node?.crack_width_mm||0,message:""})});if(!data.success)throw new Error(data.message||"Unable to send SMS");setResult(data);onSent&&onSent(data)}catch(e){setError(e.message||"Unable to send SMS")}finally{setSending(false)}};
 return <div className="smsComposer"><div className="smsDemoNotice"><Icon>campaign</Icon><span><b>Emergency SMS bundle · {levelText(severity)}</b><br/>One click sends a set of three realistic safety messages for this node. Demo mode records them as sent and makes them immediately visible in the Community User portal.</span></div><label>Recipient phone number<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+919876543210"/></label><div className="templatePreview"><b>Messages that will be sent</b>{messages.map((m,i)=><div key={i}><span>{i+1}</span><p>{m}</p></div>)}</div>{error&&<div className="errorBox">{error}</div>}{result&&<SmsResult data={result}/>}<button className="primaryBtn" onClick={send} disabled={sending}>{sending?<><Icon>progress_activity</Icon> Sending 3 messages…</>:<><Icon>sms</Icon> Send SMS Alert Bundle</>}</button></div>
}
function SmsResult({data}){return <div className="successBox"><b>✓ SMS ALERT BUNDLE SENT</b><br/>Recipient: {data?.recipient||data?.phone_number}<br/>Messages: {data?.message_count||data?.messages?.length||1}<br/>Status: {data?.delivery_status||data?.status||"delivered"}<br/>Bundle ID: {data?.bundle_id||"DEMO-BUNDLE"}<br/>Provider: {data?.provider||"BhuRakshak Demo SMS"}</div>}
function SmsPage({nodes,setModal}){
 const [logs,setLogs]=useState([]),[loading,setLoading]=useState(true),[selectedNode,setSelectedNode]=useState(nodes.find(n=>n.risk>=80)||nodes.find(n=>n.risk>=55)||nodes[0]);
 const load=async()=>{try{const d=await api("/api/notifications/logs");setLogs(d.logs||[])}catch{}finally{setLoading(false)}};
 useEffect(()=>{load();const id=setInterval(load,1500);return()=>clearInterval(id)},[]);
 useEffect(()=>{const current=nodes.find(n=>n.node_id===selectedNode?.node_id);if(current)setSelectedNode(current)},[nodes]);
 const critical=nodes.filter(n=>n.risk>=80).length;
 const openComposer=()=>selectedNode&&setModal({title:`Send SMS Alert — ${selectedNode.node_id}`,body:<SmsComposer node={selectedNode} onSent={data=>{load();setModal({title:"SMS Alert Bundle Sent",body:<SmsResult data={data}/>})}}/>});
 return <><PageTitle title="SMS Notifications" sub="Node-specific emergency message bundles. Each dispatch is mirrored in the Community User notification center."/><div className="smsGrid"><section className="panel smsControl"><div className="panelTop"><div><h3><Icon>sms</Icon> EMERGENCY SMS DISPATCH</h3><small>Select the affected node and send the predefined safety message bundle.</small></div><span className="demoStatus"><i className="liveDot"/> DEMO MODE</span></div><div className="smsStats"><div><span>Provider</span><b>Demo SMS</b></div><div><span>Active critical nodes</span><b>{critical}</b></div><div><span>Delivery</span><b>Sent + Delivered</b></div></div><label>Incident / Node<select value={selectedNode?.node_id||""} onChange={e=>setSelectedNode(nodes.find(n=>n.node_id===e.target.value))}>{[...nodes].sort((a,b)=>b.risk-a.risk).map(n=><option key={n.node_id} value={n.node_id}>{n.node_id} · {n.status.toUpperCase()} · {n.risk}%</option>)}</select></label>{selectedNode&&<div className={`smsNodeSummary ${selectedNode.status}`}><div><Badge status={selectedNode.status}/><b>{selectedNode.node_id}</b><small>{selectedNode.location}</small></div><span>Risk <strong>{selectedNode.risk}%</strong><br/>Disp. {selectedNode.displacement_mm} mm<br/>Crack {selectedNode.crack_width_mm} mm</span></div>}<button className="primaryBtn smsMainBtn" onClick={openComposer} disabled={!selectedNode}><Icon>send</Icon> Send SMS Alert Bundle</button><p className="smsFootnote">Demo mode only: no paid provider is called. The dispatch is stored by FastAPI and appears in the Community User notification center.</p></section><section className="panel smsLogs"><div className="panelTop"><div><h3>SMS DELIVERY LOG</h3><small>Live messages from Admin dispatch</small></div><button className="linkBtn" onClick={load}>Refresh <Icon>refresh</Icon></button></div>{loading?<div className="emptySmall">Loading logs…</div>:logs.length?logs.map(log=><div className="smsLogRow" key={log.message_id}><div className="smsLogIcon"><Icon>check_circle</Icon></div><div className="grow"><b>{log.severity.toUpperCase()} · {log.node_id} · Message {log.sequence}</b><small>{log.recipient} · {log.message}</small><small>{new Date(log.created_at).toLocaleTimeString()} · {log.delivery_status}</small></div><span className="sentPill">DELIVERED</span></div>):<div className="emptySmall">No SMS events yet. Select a node and click Send SMS Alert Bundle.</div>}</section></div></>}


function User({user,onLogout}){
 const live=useLiveTelemetry(),{nodes,connected}=live;const [active,setActive]=useState("overview"),[selected,setSelected]=useState("NODE-003"),[modal,setModal]=useState(null),[messages,setMessages]=useState([]),[noticeOpen,setNoticeOpen]=useState(false),[lastSeen,setLastSeen]=useState(0);
 const loadMessages=async()=>{try{const d=await api("/api/notifications/inbox");setMessages(d.messages||[])}catch{}};
 useEffect(()=>{loadMessages();const id=setInterval(loadMessages,1500);return()=>clearInterval(id)},[]);
 const unread=Math.max(0,messages.length-lastSeen);const advisory=nodes.some(n=>n.risk>=55),alerts=nodes.filter(n=>n.risk>=55);const userNodes=nodes.slice(0,8);
 const openNotifications=()=>{setNoticeOpen(true);setLastSeen(messages.length)};
 const messageGroups=messages.reduce((acc,m)=>{(acc[m.bundle_id||m.message_id]=acc[m.bundle_id||m.message_id]||[]).push(m);return acc},{});
 return <div className="userShell"><header className="userHeader"><div className="brand"><div className="brandLogo"><Icon>terrain</Icon></div><div><b>BhuRakshak</b><small>COMMUNITY SAFETY</small></div></div><nav>{[["overview","Overview"],["map","Safety Map"],["alerts","Alerts"],["information","Information"]].map(([id,l])=><button key={id} className={active===id?"active":""} onClick={()=>setActive(id)}>{l}</button>)}</nav><div className="userTools"><span className="livePill"><i className={`liveDot ${connected?"":"offline"}`}/> {connected?"LIVE":"LOCAL"}</span><button className="userNotificationBtn" onClick={openNotifications}><Icon>notifications</Icon>{unread>0&&<b>{unread}</b>}</button><div className="userIdentity"><div className="avatar"><Icon>person</Icon></div><span><b>{user.name}</b><small>Sector 4 Resident</small></span></div><button className="logoutText" onClick={onLogout}><Icon>logout</Icon> Logout</button></div></header><main className="userMain">
 {active==="overview"&&<UserOverview advisory={advisory} alerts={alerts} nodes={userNodes} setActive={setActive} selected={selected} setSelected={setSelected} setModal={setModal} messages={messages} onOpenNotifications={openNotifications}/>} 
 {active==="map"&&<><UserPageTitle title="Safety Map" sub="Live risk intensity from the sensor simulator."/><section className="panel userMap"><HeatMap nodes={userNodes} selected={selected} onSelect={setSelected}/><div className="userMapLegend"><b>Live risk intensity</b><span>Blue/Green · low</span><span>Yellow · watch</span><span>Orange · alert</span><span>Red · critical</span></div></section></>}
 {active==="alerts"&&<><UserPageTitle title="Community Alerts" sub="Plain-language safety notices and emergency messages from the monitoring team."/><section className="userAlerts">{alerts.length?alerts.map(n=><div className={`communityAlert ${n.status}`} key={n.node_id}><div className="userAlertIcon"><Icon>warning</Icon></div><div><Badge status={n.status}/><h3>{n.status==="critical"?"Critical ground movement alert":"Ground movement advisory"}</h3><p>{n.location}: simulated displacement is {n.displacement_mm} mm with a risk score of {n.risk}%.</p><small>{n.node_id} · Live stream</small></div></div>):<div className="emptyState"><Icon>verified</Icon><h3>No active advisories</h3><p>Your monitored area is currently within normal demo thresholds.</p></div>}</section><section className="panel userMessagePanel"><div className="panelTop"><div><h2>Emergency Messages</h2><small>Messages dispatched by the BhuRakshak command team appear here automatically.</small></div><button className="linkBtn" onClick={openNotifications}>Open Notification Center <Icon>notifications</Icon></button></div>{messages.length?messages.slice(0,9).map(m=><div className="userMessageRow" key={m.message_id}><span className={`messageSeverity ${m.severity}`}><Icon>{m.severity==="critical"?"priority_high":"warning"}</Icon></span><div><b>{m.node_id} · {m.severity.toUpperCase()}</b><p>{m.message}</p><small>{new Date(m.created_at).toLocaleString()} · {m.delivery_status}</small></div></div>):<div className="emptySmall">No command messages yet.</div>}</section></>}
 {active==="information"&&<><UserPageTitle title="Safety Information" sub="Practical guidance for residents during a geotechnical advisory."/><section className="infoGrid"><div className="panel infoCard"><Icon>health_and_safety</Icon><h3>What should you do during an advisory?</h3><ol><li>Stay away from designated buffer perimeters and marked fencing.</li><li>Keep community alerts enabled for status changes.</li><li>Report visible cracks or unusual seepage to the designated helpdesk.</li></ol><button className="darkBtn" onClick={()=>setModal({title:"Community Helpdesk",body:<p>Demo helpdesk: <b>1800-BHU-SAFE</b>. Placeholder contact for the prototype.</p>})}>Community Helpdesk <Icon>call</Icon></button></div><div className="panel infoCard"><Icon>location_on</Icon><h3>Recognize warning signs</h3><p>Watch for new ground cracks, unusual water seepage, leaning structures or sudden changes around marked mine buffers. Use the portal to check the latest advisory status.</p><div className="infoSteps"><b>Keep clear of marked hazard buffers</b><b>Do not enter restricted inspection areas</b><b>Report visible changes to the helpdesk</b><b>Follow official evacuation instructions</b></div></div></section></>}
 </main><footer className="userFooter"><b>BhuRakshak</b> · AI-powered community mine safety monitoring <span>Stream: <b>{connected?"Operational":"Fallback"}</b></span></footer>{noticeOpen&&<Modal title="Community Notification Center" onClose={()=>setNoticeOpen(false)}><div className="notificationCenter">{Object.keys(messageGroups).length?Object.entries(messageGroups).map(([id,group])=><div className="notificationBundle" key={id}><div className="bundleHead"><b><Icon>campaign</Icon> {group[0].node_id} · {group[0].severity.toUpperCase()} ALERT</b><small>{new Date(group[0].created_at).toLocaleString()}</small></div>{group.map(m=><div className="bundleMessage" key={m.message_id}><span>{m.sequence}</span><p>{m.message}</p></div>)}</div>):<div className="emptyState"><Icon>notifications_off</Icon><h3>No messages</h3><p>Emergency messages dispatched by the Admin dashboard will appear here automatically.</p></div>}</div></Modal>}{modal&&<Modal title={modal.title} onClose={()=>setModal(null)}>{modal.body}</Modal>}</div>
}

function UserPageTitle({title,sub}){return <div className="userPageTitle"><span className="eyebrow">CIVIC PROTECTION & STABILITY PORTAL</span><h1>{title}</h1><p>{sub}</p></div>}
function UserOverview({advisory,alerts,nodes,setActive,selected,setSelected,setModal,messages,onOpenNotifications}){
  const lead=nodes.find(n=>n.node_id==="NODE-003")||nodes[0];
  const messageContent=messages.length ? (
    messages.slice(0,3).map(m=>(
      <div className="userMessageRow" key={m.message_id}>
        <span className={`messageSeverity ${m.severity}`}>
          <Icon>{m.severity==="critical" ? "priority_high" : "warning"}</Icon>
        </span>
        <div>
          <b>{m.node_id} · {m.severity.toUpperCase()}</b>
          <p>{m.message}</p>
          <small>{new Date(m.created_at).toLocaleTimeString()} · {m.delivery_status}</small>
        </div>
      </div>
    ))
  ) : (
    <div className="emptySmall">No emergency messages yet. Admin dispatches will appear here automatically.</div>
  );

  return (
    <>
      <UserPageTitle
        title="Good morning, Aarav"
        sub="Here is the latest safety status around your monitored area in Sector 4 residential zone."
      />

      <section className={`safetyHero ${advisory ? "advisory" : "safe"}`}>
        <div className="safetyIcon"><Icon>{advisory ? "warning" : "check"}</Icon></div>
        <div className="safetyCopy">
          <span className="eyebrow">{advisory ? "CURRENT SAFETY ADVISORY" : "CURRENT SAFETY STATUS"}</span>
          <h2>{advisory ? "Advisory in your monitored area" : "Your area is safe"}</h2>
          <p>
            {advisory
              ? `A simulated ground-movement advisory is active. Current lead-node risk is ${lead?.risk}% with ${lead?.displacement_mm} mm displacement. Follow the guidance below.`
              : "No active high-risk ground-movement warning has been detected in your monitored residential perimeter. Stability indicators remain within the demo's normal thresholds."}
          </p>
          <div className="safetyFooter">
            <span><Icon>schedule</Icon> Updated every 2.5 seconds</span>
            <span><Icon>sensors</Icon> {nodes.length} live simulated nodes</span>
            <span><Icon>verified_user</Icon> Automated risk calculation</span>
          </div>
        </div>
        <span className="riskPill">{advisory ? "Risk Level: Advisory" : "Risk Level: Low (Normal)"}</span>
      </section>

      <div className="userKpis">
        <Kpi title="MONITORED ZONE" value="1.8 km²" note="Sector 4 Community" icon="crop_free"/>
        <Kpi title="SENSOR NODES" value={`${nodes.length} Online`} note="Live FastAPI telemetry" icon="podcasts"/>
        <Kpi title="ACTIVE ADVISORIES" value={alerts.length} note={alerts.length ? "Live simulated risk" : "No active advisories"} icon="warning"/>
        <Kpi title="TELEMETRY CALIBRATION" value="LIVE" note="Refresh 2.5 seconds" icon="update"/>
      </div>

      {alerts[0] && (
        <section className="userAdvisory panel">
          <div className="advisoryIcon"><Icon>warning</Icon></div>
          <div className="grow">
            <Badge status={alerts[0].status}/>
            <span className="meta">{alerts[0].node_id} · {alerts[0].location}</span>
            <h3>Ground movement detected in monitored sector</h3>
            <p>Live simulated telemetry reports {alerts[0].displacement_mm} mm displacement and a {alerts[0].risk}% risk score.</p>
            <div className="recommended">
              <Icon>info</Icon>
              <span><b>Recommended Action:</b> Stay clear of designated inspection buffers and monitor this portal for updates.</span>
            </div>
          </div>
          <div className="advisoryBtns">
            <button className="darkBtn" onClick={()=>setActive("map")}>View on Map</button>
            <button className="lightBtn" onClick={()=>setActive("alerts")}>Details</button>
          </div>
        </section>
      )}

      <section className="panel userMessagePanel">
        <div className="panelTop">
          <div>
            <h2>Emergency Messages</h2>
            <small>Live command messages from the BhuRakshak emergency dispatch center.</small>
          </div>
          <button className="linkBtn" onClick={onOpenNotifications}>View all <Icon>notifications</Icon></button>
        </div>
        {messageContent}
      </section>

      <div className="userTwoCol">
        <section className="panel userMapCard">
          <div className="panelTop">
            <div><h2>Safety Map</h2><p>Live risk intensity around your monitored zone</p></div>
            <button className="linkBtn" onClick={()=>setActive("map")}>View full map <Icon>arrow_forward</Icon></button>
          </div>
          <HeatMap nodes={nodes} selected={selected} onSelect={setSelected}/>
        </section>
        <section className="panel nearby">
          <div className="panelTop"><h2>Nearby Monitoring Points</h2><span>SECTOR 4</span></div>
          {nodes.slice(0,5).map(n=>(
            <button className="nearbyRow" key={n.node_id} onClick={()=>setModal({title:`${n.node_id} — Monitoring Point`,body:<NodeDetail n={n}/>})}>
              <span><i className={`statusDot ${n.status}`}/><b>{n.node_id}</b><small>{n.location}</small></span>
              <Badge status={n.status}/>
            </button>
          ))}
        </section>
      </div>
    </>
  );
}

function App(){
 const [auth,setAuth]=useState(()=>{try{return JSON.parse(localStorage.getItem("bhurakshak_demo_user"))}catch{return null}});
 const login=(email,password)=>{const c=email.toLowerCase()===ADMIN.email&&password===ADMIN.password?ADMIN:email.toLowerCase()===USER.email&&password===USER.password?USER:null;if(!c)return"Invalid demo credentials.";localStorage.setItem("bhurakshak_demo_user",JSON.stringify(c));setAuth(c);return null};
 const logout=()=>{localStorage.removeItem("bhurakshak_demo_user");setAuth(null)};
 return auth?(auth.role==="admin"?<Admin user={auth} onLogout={logout}/>:<User user={auth} onLogout={logout}/>):<Login onLogin={login}/>;
}
createRoot(document.getElementById("root")).render(<App/>);
