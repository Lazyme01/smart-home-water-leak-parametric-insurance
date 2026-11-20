import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Check, CircleOff, Droplets, Gauge, Radio, RotateCw, ShieldCheck, Waves, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { Badge, Button, Card, dateTime, EmptyState, PageTitle } from '../components/UI';

const modes = [
  { id: 'normal', label: 'Normal operation', note: 'Steady everyday usage', icon: Waves, color: 'green' },
  { id: 'small_leak', label: 'Small leak', note: 'Elevated flow + moisture', icon: Droplets, color: 'blue' },
  { id: 'major_leak', label: 'Major leak', note: 'High flow · auto-shutoff', icon: Zap, color: 'amber' },
  { id: 'pipe_burst', label: 'Pipe burst', note: 'Critical · admin review', icon: AlertTriangle, color: 'red' },
  { id: 'sensor_failure', label: 'Sensor failure', note: 'Unreliable sensor reading', icon: CircleOff, color: 'violet' },
  { id: 'offline', label: 'Device offline', note: 'Connectivity interruption', icon: Radio, color: 'gray' }
];
export default function Simulator() {
  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const load = async () => {
    try {
      const [d, r, i] = await Promise.all([api.get('/devices'), api.get('/sensors'), api.get('/incidents')]);
      setDevices(d.data.devices); setReadings(r.data.readings); setIncidents(i.data.incidents);
      setSelected(current => current || d.data.devices[0]?._id);
    } catch { toast.error('Unable to load simulator. Check the API connection.'); }
  };
  useEffect(() => { load(); }, []);
  const device = devices.find(item => item._id === selected);
  const reading = [...readings].reverse().find(item => item.device === selected || item.device?._id === selected);
  const onMode = async mode => {
    if (!device) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/devices/${device._id}/simulate`, { mode });
      setLastEvent(data); await load();
      toast.success(mode === 'normal' ? 'Normal demo reading recorded' : mode === 'offline' ? 'Device is now simulated offline' : 'Scenario evaluated · synthetic telemetry');
      if (data.incident?.valveClosed) toast('Simulated valve automatically CLOSED', { icon: '🛡️', duration: 5000 });
    } catch (error) { toast.error(error.response?.data?.error || 'Could not run simulation'); }
    finally { setBusy(false); }
  };
  const runLoop = async () => {
    try { const { data } = await api.post(`/devices/${device._id}/simulation/${running ? 'stop' : 'start'}`); setRunning(data.running); toast.success(data.running ? 'Live simulation started · every 5 seconds' : 'Live simulation stopped'); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not change simulator state'); }
  };
  const valve = async state => {
    try {
      let payload = { state };
      if (state === 'OPEN' && device?.valve === 'CLOSED') {
        if (!window.confirm('Acknowledge this incident and confirm the area has been inspected and is safe before reopening the simulated valve?')) return;
        payload = { ...payload, acknowledged: true, safetyConfirmed: true };
      }
      await api.post(`/devices/${device._id}/valve`, payload);
      toast.success(`Simulated valve ${state.toLowerCase()}`); await load();
    } catch (error) { toast.error(error.response?.data?.error || 'Valve command failed'); }
  };
  const updateIncident = async (incident, action) => {
    let payload = {};
    if (action === 'resolve') {
      if (!window.confirm('Confirm you have inspected the area and it is safe to resolve this demo incident. This is not plumbing guidance.')) return;
      payload = { acknowledged: true, safetyConfirmed: true };
    }
    try { await api.post(`/incidents/${incident._id}/${action}`, payload); toast.success(`Incident ${action}d · DEMO`); await load(); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not update incident'); }
  };
  if (!devices.length) return <><PageTitle eyebrow="SYNTHETIC DEVICE LAB" title="Device simulator" subtitle="Run safe, repeatable IoT scenarios without physical plumbing." /><Card><EmptyState title="Link your first virtual device" text="Add a property and a device in Home & profile to start exploring the simulator." /></Card></>;
  return <div className="simulator-page"><PageTitle eyebrow="SYNTHETIC DEVICE LAB" title="Device simulator" subtitle="Explore realistic demo readings, leak responses and valve commands—without any physical hardware." action={<Badge tone="dark">SIMULATED ENVIRONMENT</Badge>} />
    <div className="notice-banner"><span className="notice-shield"><Activity size={18} /></span><div><b>Simulation controls affect demo records only</b><span>No real sensor, plumbing valve, policy provider or payment account is connected.</span></div><Badge tone="dark">DEMO ONLY</Badge></div>
    <div className="sim-layout"><div className="sim-main"><Card className="device-card"><div className="device-card-top"><div className="device-avatar"><Droplets size={23} /></div><div><span className="eyebrow">VIRTUAL AQUASHIELD DEVICE</span><h2>{device?.name || 'AquaShield FlowGuard'}</h2><span className="device-id">{device?.deviceId} · {device?.property?.name || 'Home property'}</span></div><Badge tone={device?.online ? 'green' : 'amber'}><span className="badge-dot" />{device?.online ? 'ONLINE · DEMO' : 'OFFLINE · DEMO'}</Badge></div><div className="sensor-reading-grid">{[
      { label: 'Water flow', value: reading ? `${reading.flow.toFixed(1)}` : '—', unit: 'L/min', icon: Waves },
      { label: 'Pipe pressure', value: reading ? `${reading.pressure.toFixed(2)}` : '—', unit: 'bar', icon: Gauge },
      { label: 'Moisture sensor', value: reading ? `${reading.moisture}` : '—', unit: '%', icon: Droplets }
    ].map(sensor => <div key={sensor.label} className="sensor-reading"><span className="sensor-icon"><sensor.icon size={16} /></span><small>{sensor.label}</small><b>{sensor.value}<i>{sensor.unit}</i></b><span className="sensor-live"><span className="pulse-dot" /> LIVE</span></div>)}</div><div className="device-card-bottom"><span><Radio size={15} /> Last reading: {dateTime(reading?.createdAt)}</span><span><ShieldCheck size={15} /> Auto-shutoff {device?.autoShutoff ? 'enabled' : 'disabled'}</span></div></Card>
      <Card className="scenario-card"><div className="card-heading"><div><span className="eyebrow">CHOOSE A SCENARIO</span><h2>What would you like to simulate?</h2></div><span className="mode-label"><span className="pulse-dot" /> RULE-BASED DETECTION</span></div><div className="scenario-grid">{modes.map(mode => <button key={mode.id} disabled={busy} onClick={() => onMode(mode.id)} className={`scenario-option ${lastEvent?.device?.mode === mode.id ? 'scenario-selected' : ''}`}><span className={`scenario-icon ${mode.color}`}><mode.icon size={19} /></span><span className="scenario-text"><b>{mode.label}</b><small>{mode.note}</small></span><span className="scenario-arrow">↗</span></button>)}</div><div className="scenario-note"><AlertTriangle size={15} /><span>Detection thresholds are demonstration values, not certified plumbing safety rules. Repeated incidents are deduplicated.</span></div><div className="sim-controls"><div><span className={`sim-indicator ${running ? 'running' : ''}`} />{running ? 'Live simulation running' : 'Simulation paused'}<small>5-second sampling · synthetic values</small></div><Button variant={running ? 'outline' : 'primary'} onClick={runLoop} disabled={busy}>{running ? 'Stop simulation' : 'Start live simulation'}{running ? <CircleOff size={15} /> : <RotateCw size={15} />}</Button></div></Card>
      {lastEvent?.incident && <Card className="event-card"><span className="event-icon"><AlertTriangle size={18} /></span><div><span className="eyebrow">NEW SIMULATED INCIDENT · {dateTime(lastEvent.incident.createdAt)}</span><h3>{lastEvent.incident.severity} leak suspected</h3><p>{lastEvent.incident.reason}</p><small>Flow {lastEvent.incident.evidence.flow} L/min · Moisture {lastEvent.incident.evidence.moisture}% · {lastEvent.incident.valveClosed ? 'Automatic valve close triggered' : 'No automatic close triggered'}</small></div><Badge tone={lastEvent.incident.valveClosed ? 'amber' : 'blue'}>{lastEvent.incident.valveClosed ? 'VALVE CLOSED' : 'REVIEW'}</Badge></Card>}
      </div>
      <aside className="sim-aside"><Card className="valve-card"><div className="card-heading"><div><span className="eyebrow">VALVE CONTROL</span><h2>Simulated shut-off</h2></div><span className={`valve-status-dot ${device?.valve === 'CLOSED' ? 'closed' : ''}`} /></div><div className={`valve-visual ${device?.valve === 'CLOSED' ? 'valve-closed' : ''}`}><div className="valve-ring"><span><Droplets size={30} /></span></div><b>{device?.valve || 'OPEN'}</b><small>{device?.valve === 'CLOSED' ? 'Water flow stopped in demo' : 'Water flowing in demo'}</small></div><div className="valve-actions"><Button variant={device?.valve === 'CLOSED' ? 'outline' : 'danger'} disabled={busy || device?.valve === 'CLOSED'} onClick={() => valve('CLOSED')}>Close valve</Button><Button variant="outline" disabled={busy || device?.valve !== 'CLOSED'} onClick={() => valve('OPEN')}>Reopen safely</Button></div><p className="valve-safety"><ShieldCheck size={15} /> Opening after an incident requires acknowledgment and a safety confirmation.</p></Card>
      <Card className="incident-history"><div className="card-heading"><div><span className="eyebrow">EVENT LOG</span><h2>Incident history</h2></div><span className="history-count">{incidents.length}</span></div>{incidents.length ? <div className="mini-timeline">{incidents.slice(0, 5).map((incident, i) => <div className="mini-timeline-item" key={incident._id}><span className={`timeline-dot dot-${incident.severity}`} /><div><b>{incident.severity} event</b><small>{dateTime(incident.createdAt)}</small><span>{incident.valveClosed ? 'Auto-shutoff · ' : ''}{incident.status}</span>{incident.status === 'active' && <button className="incident-action-link" onClick={() => updateIncident(incident, 'acknowledge')}>Acknowledge incident</button>}{incident.status !== 'resolved' && <button className="incident-action-link" onClick={() => updateIncident(incident, 'resolve')}>Resolve incident</button>}</div>{i < incidents.length - 1 && <i />}</div>)}</div> : <p className="muted-copy">Your demo incident history will appear here.</p>}</Card></aside></div>
  </div>;
}
