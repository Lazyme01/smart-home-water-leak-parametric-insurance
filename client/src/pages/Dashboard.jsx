import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleAlert, Droplets, Gauge, Radio, ShieldCheck, Waves, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Badge, Card, dateTime, EmptyState, money, PageTitle } from '../components/UI';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ properties: [], devices: [], policies: [], incidents: [], claims: [], readings: [], notifications: [] });
  const [busy, setBusy] = useState(true);
  const reload = useCallback(async () => {
    try {
      const urls = ['/properties', '/devices', '/policies', '/incidents', '/claims', '/sensors', '/notifications'];
      const result = await Promise.all(urls.map(url => api.get(url)));
      setData({ properties: result[0].data.properties, devices: result[1].data.devices, policies: result[2].data.policies, incidents: result[3].data.incidents, claims: result[4].data.claims, readings: result[5].data.readings, notifications: result[6].data.notifications });
    } catch { toast.error('Could not load dashboard data. Check your API connection.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000', { auth: { token: localStorage.getItem('aquashield_token') } });
    socket.on('sensor:update', payload => {
      if (payload.reading) setData(current => ({
        ...current,
        readings: [...current.readings, payload.reading].slice(-80),
        devices: current.devices.map(item => String(item._id) === String(payload.device?.id) ? { ...item, ...payload.device } : item)
      }));
      if (payload.incident) reload();
    });
    socket.on('claim:update', reload);
    socket.on('notification:new', reload);
    return () => socket.disconnect();
  }, [reload]);
  const latest = data.readings[data.readings.length - 1];
  const device = data.devices[0];
  const activePolicy = data.policies.find(policy => policy.status === 'active');
  const paid = data.claims.filter(claim => claim.status === 'Paid').reduce((sum, claim) => sum + claim.amount, 0);
  const chartData = useMemo(() => data.readings.slice(-24).map(reading => ({ time: new Date(reading.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), flow: reading.flow, pressure: reading.pressure, moisture: reading.moisture })), [data.readings]);
  if (busy) return <div className="dashboard-skeleton"><div /><div /><div /><div /></div>;
  return <div className="dashboard-page">
    <PageTitle eyebrow={`GOOD ${new Date().getHours() < 12 ? 'MORNING' : 'DAY'}, ${user?.name?.split(' ')[0]?.toUpperCase() || 'HOMEOWNER'}`} title="Your home at a glance" subtitle="A clearer picture of your water, your coverage and your peace of mind." action={<Link className="button button-outline" to="/simulator"><Activity size={16} /> Open simulator <ArrowRight size={15} /></Link>} />
    <div className="notice-banner"><span className="notice-shield"><ShieldCheck size={18} /></span><div><b>This is your AquaShield demo workspace</b><span>Sensor readings, leak events, insurance decisions and payouts are synthetic. No real plumbing or money is connected.</span></div><Badge tone="dark">SIMULATED</Badge></div>
    <div className="stat-grid">
      <Stat icon={<Droplets size={18} />} label="Water flow" value={latest ? `${latest.flow.toFixed(1)} L/min` : '—'} foot={latest ? `${latest.pressure.toFixed(1)} bar pipe pressure` : 'Run a sensor simulation'} tone="blue" />
      <Stat icon={<Gauge size={18} />} label="Estimated consumption" value={latest ? `${(latest.flow * 60).toFixed(0)} L` : '—'} foot="Illustrative · last hour estimate" tone="teal" />
      <Stat icon={<Radio size={18} />} label="Device health" value={!device?.online ? 'Offline' : device?.sensorStatus === 'failure' ? 'Sensor issue' : 'Healthy'} foot={device?.deviceId || 'No device linked'} tone={device?.online && device?.sensorStatus !== 'failure' ? 'green' : 'amber'} />
      <Stat icon={<ShieldCheck size={18} />} label="Premium discount" value={activePolicy ? `${activePolicy.discount.percent}%` : 'Not active'} foot={activePolicy ? `${money(activePolicy.discount.amount)} saved / month` : 'Compare plans to get started'} tone="violet" />
    </div>
    <div className="dashboard-grid"><Card className="chart-card"><div className="card-heading"><div><span className="eyebrow">LIVE SENSOR TELEMETRY</span><h2>Water flow over time</h2></div><span className="chart-legend"><i /> Flow · L/min</span></div>{chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}><defs><linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#239b92" stopOpacity={.2} /><stop offset="95%" stopColor="#239b92" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#edf2f2" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#829095', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={35} /><YAxis tick={{ fill: '#829095', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ border: '1px solid #e6eeee', borderRadius: 12, fontSize: 12 }} /><Area type="monotone" dataKey="flow" stroke="#19958c" strokeWidth={2.5} fill="url(#flowFill)" /></AreaChart></ResponsiveContainer></div> : <EmptyState title="Waiting for your first reading" text="Open the device simulator to generate synthetic sensor telemetry." action={<Link className="text-link" to="/simulator">Open simulator <ArrowRight size={14} /></Link>} />}<div className="chart-footer"><span><span className="pulse-dot" /> LIVE UPDATES</span><span>DEMO SENSOR DATA</span></div></Card>
      <Card className="risk-card"><div className="card-heading"><div><span className="eyebrow">PROTECTION STATUS</span><h2>Leak risk</h2></div><span className={`risk-gauge ${latest?.moisture >= 75 ? 'risk-high' : ''}`}><Droplets size={19} /></span></div><div className={`risk-status ${latest?.moisture >= 75 ? 'status-warning' : ''}`}><span className="risk-status-dot" />{latest?.moisture >= 75 ? 'Needs attention' : 'All clear'}</div><p>{latest?.moisture >= 75 ? 'Moisture is above the demo alert threshold. Check your home before reopening a closed valve.' : 'No unusual water patterns have been detected by your simulated device.'}</p><div className="risk-metrics"><span><small>MOISTURE</small><b>{latest ? `${latest.moisture}%` : '—'}</b></span><span><small>VALVE STATE</small><b className={device?.valve === 'CLOSED' ? 'text-amber' : 'text-green'}>{device?.valve || '—'}</b></span><span><small>PRESSURE</small><b>{latest ? `${latest.pressure.toFixed(1)} bar` : '—'}</b></span></div><Link to="/simulator" className="card-link">View device details <ChevronRight size={15} /></Link><span className="threshold-note">DEMO thresholds only · not certified safety guidance</span></Card></div>
    <div className="lower-grid"><Card className="incidents-card"><div className="card-heading"><div><span className="eyebrow">YOUR HOME’S HISTORY</span><h2>Recent incidents</h2></div><Link className="subtle-link" to="/claims">View all <ArrowRight size={14} /></Link></div>{data.incidents.length ? <div className="incident-list">{data.incidents.slice(0, 4).map(incident => <div className="incident-row" key={incident._id}><span className={`incident-icon ${incident.severity}`}><CircleAlert size={16} /></span><div className="incident-info"><b>{incident.severity} water event <span className="demo-mini">DEMO</span></b><small>{incident.reason}</small><small>{dateTime(incident.createdAt)}</small></div><Badge tone={incident.status === 'resolved' ? 'green' : incident.status === 'active' ? 'amber' : 'blue'}>{incident.status}</Badge></div>)}</div> : <EmptyState title="No incidents to show" text="A normal home is a good thing. Try a simulated leak to see the response flow." action={<Link className="text-link" to="/simulator">Try a demo leak <ArrowRight size={14} /></Link>} />}</Card>
      <Card className="coverage-summary"><div className="card-heading"><div><span className="eyebrow">COVERAGE SNAPSHOT</span><h2>Your protection</h2></div><span className="coverage-icon"><ShieldCheck size={19} /></span></div>{activePolicy ? <><div className="coverage-plan"><span className="plan-tag">ACTIVE PLAN</span><b>{activePolicy.plan?.name} protection</b><small>{activePolicy.property?.name} · since {dateTime(activePolicy.startsAt).split(',')[0]}</small></div><div className="coverage-numbers"><span><small>MONTHLY PREMIUM</small><b>{money(activePolicy.monthlyPremium)}<small> / mo</small></b></span><span><small>SIMULATED PAID</small><b>{money(paid)}</b></span></div><div className="coverage-foot"><span><Check size={14} /> {activePolicy.discount.percent}% device reward applied</span><Link to="/coverage">Manage <ArrowRight size={14} /></Link></div></> : <EmptyState title="Add a layer of protection" text="Compare demo plans and see how a connected device can qualify for savings." action={<Link className="button button-primary" to="/coverage">Explore plans <ArrowRight size={14} /></Link>} />}</Card></div>
    <div className="bottom-stats"><span><span className="stat-small-icon"><Waves size={16} /></span><b>{data.properties.length}</b> {data.properties.length === 1 ? 'property' : 'properties'} <span className="bottom-divider" /><b>{data.policies.filter(p => p.status === 'active').length}</b> active policies <span className="bottom-divider" /><b>{data.claims.length}</b> claims filed</span><Link to="/profile">Manage your home <ArrowRight size={14} /></Link></div>
  </div>;
}
function Stat({ icon, label, value, foot, tone }) { return <Card className={`stat-card stat-${tone}`}><div className="stat-top"><span>{icon}</span><small>{label}</small><ArrowUpRight size={15} /></div><b className="stat-value">{value}</b><span className="stat-foot">{foot}</span></Card>; }
