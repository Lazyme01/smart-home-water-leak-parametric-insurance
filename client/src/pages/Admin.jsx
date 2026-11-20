import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Check, CircleAlert, Coins, FileText, Radio, Shield, Users, X, Save } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import api from '../api';
import { Badge, Button, Card, dateTime, EmptyState, money, PageTitle } from '../components/UI';

export default function Admin() {
  const [summary, setSummary] = useState(null);
  const [claims, setClaims] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [devices, setDevices] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState('');
  const load = async () => {
    try {
      const [s, c, u, a, d, p, pl] = await Promise.all([api.get('/admin/summary'), api.get('/admin/claims'), api.get('/admin/users'), api.get('/admin/audit'), api.get('/admin/devices'), api.get('/admin/policies'), api.get('/admin/plans')]);
      setSummary(s.data); setClaims(c.data.claims); setUsers(u.data.users); setAudit(a.data.logs); setDevices(d.data.devices); setPolicies(p.data.policies); setPlans(pl.data.plans);
    } catch (error) { toast.error(error.response?.data?.error || 'Could not load admin workspace'); }
  };
  useEffect(() => { load(); }, []);
  const decide = async (claim, decision) => {
    const note = window.prompt(`Optional audit note for ${decision} decision:`, 'Reviewed demo telemetry and policy checks');
    if (note === null) return;
    setBusy(claim._id);
    try { await api.post(`/admin/claims/${claim._id}/decision`, { decision, note }); toast.success(`Claim ${decision}d · any payout remains simulated`); await load(); }
    catch (error) { toast.error(error.response?.data?.error || 'Decision could not be saved'); }
    finally { setBusy(''); }
  };
  const updateDevice = async (device, field) => {
    try { await api.patch(`/admin/devices/${device._id}`, { [field]: !device[field] }); toast.success('Device setting updated and audited'); await load(); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not update device'); }
  };
  const updatePolicy = async (policy, status) => {
    try { await api.patch(`/admin/policies/${policy._id}`, { status }); toast.success(`Policy ${status} · demo only`); await load(); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not update policy'); }
  };
  const updatePlan = async (event, plan) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = ['monthlyPremium', 'coverageLimit', 'triggerFlow', 'triggerMoisture', 'maxPayout', 'monitoringDiscountPercent', 'deductible', 'waitingDays'];
    const payload = Object.fromEntries(params.map(key => [key, Number(form.get(key))]));
    try { await api.patch(`/admin/plans/${plan._id}`, payload); toast.success(`${plan.name} demo parameters saved and audited`); await load(); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not update plan parameters'); }
  };
  if (!summary) return <div className="dashboard-skeleton"><div /><div /><div /><div /></div>;
  const chartData = [{ label: 'Users', value: summary.users }, { label: 'Devices', value: summary.devices }, { label: 'Incidents', value: summary.incidents }, { label: 'Policies', value: summary.policies }, { label: 'Claims', value: summary.claims }];
  const stats = [{ title: 'Homeowners', value: summary.users, icon: Users, tone: 'blue' }, { title: 'Virtual devices', value: summary.devices, icon: Radio, tone: 'teal' }, { title: 'Incidents', value: summary.incidents, icon: Activity, tone: 'amber' }, { title: 'Active policies', value: summary.policies, icon: Shield, tone: 'violet' }, { title: 'Claims filed', value: summary.claims, icon: FileText, tone: 'blue' }, { title: 'Simulated payouts', value: money(summary.simulatedPayoutTotal), icon: Coins, tone: 'green' }];
  return <div className="admin-page"><PageTitle eyebrow="AQUASHIELD OPERATIONS" title="Command center" subtitle="Review demo claims, monitor your platform and keep every decision auditable." action={<Badge tone="violet">ADMIN ACCESS</Badge>} />
    <div className="notice-banner admin-notice"><span className="notice-shield"><Shield size={18} /></span><div><b>Administrator tools for simulated data only</b><span>Review actions are recorded in the audit log. Approvals create simulated payout records—not real transfers.</span></div><Badge tone="dark">DEMO</Badge></div>
    <div className="admin-stat-grid">{stats.map(stat => <Card className={`admin-stat admin-stat-${stat.tone}`} key={stat.title}><span className="admin-stat-icon"><stat.icon size={17} /></span><small>{stat.title}</small><b>{stat.value}</b></Card>)}</div>
    <Card className="admin-chart-card"><div className="card-heading"><div><span className="eyebrow">WORKSPACE SNAPSHOT</span><h2>Platform overview</h2></div><Badge tone="dark">DEMO DATA</Badge></div><div className="admin-chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="adminFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#278e98" stopOpacity={.2} /><stop offset="100%" stopColor="#278e98" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#edf2f2" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#829095', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#829095', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ border: '1px solid #e6eeee', borderRadius: 12, fontSize: 12 }} /><Area type="monotone" dataKey="value" stroke="#1b8c91" strokeWidth={2.5} fill="url(#adminFill)" /></AreaChart></ResponsiveContainer></div></Card>
    <Card className="review-card"><div className="card-heading"><div><span className="eyebrow">YOUR ATTENTION NEEDED</span><h2>Claims for manual review <span className="review-count">{summary.reviewClaims?.length || 0}</span></h2></div><Badge tone={summary.reviewClaims?.length ? 'amber' : 'green'}>{summary.reviewClaims?.length ? 'ACTION REQUIRED' : 'ALL CLEAR'}</Badge></div>{summary.reviewClaims?.length ? <div className="review-list">{summary.reviewClaims.map(claim => <div className="review-row" key={claim._id}><span className="review-alert"><CircleAlert size={18} /></span><div className="review-info"><b>{claim.incident?.severity} event · {claim.owner?.name}</b><small>{claim.owner?.email} · {dateTime(claim.createdAt)}</small><small>{claim.decision?.checks?.filter(check => !check.passed).length ? 'One or more trigger checks did not pass.' : 'High-severity event requires human review.'} Proposed: {money(claim.amount)}</small><small>{claim.incident?.reason}</small></div><div className="review-actions"><Button disabled={busy === claim._id} onClick={() => decide(claim, 'approve')}><Check size={14} /> Approve</Button><Button variant="danger" disabled={busy === claim._id} onClick={() => decide(claim, 'reject')}><X size={14} /> Reject</Button></div></div>)}</div> : <EmptyState title="Nothing waiting for review" text="Critical and ambiguous demo claims will appear here for an administrator decision." />}</Card>
    <div className="admin-lower-grid"><Card className="admin-users-card"><div className="card-heading"><div><span className="eyebrow">ACCOUNT DIRECTORY</span><h2>Users</h2></div><span className="history-count">{users.length}</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PERSON</th><th>ROLE</th><th>JOINED</th></tr></thead><tbody>{users.slice(0, 8).map(person => <tr key={person._id}><td><b>{person.name}</b><small>{person.email}</small></td><td><Badge tone={person.role === 'admin' ? 'violet' : 'teal'}>{person.role}</Badge></td><td>{new Date(person.createdAt).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div></Card>
      <Card className="audit-card"><div className="card-heading"><div><span className="eyebrow">ACCOUNTABILITY</span><h2>Recent audit log</h2></div><span className="history-count">{audit.length}</span></div>{audit.length ? <div className="audit-list">{audit.slice(0, 8).map(log => <div className="audit-row" key={log._id}><span className="audit-dot" /><div><b>{log.action.replace(/_/g, ' ')}</b><small>{log.actor?.name || 'System'} · {dateTime(log.createdAt)}</small>{log.details?.note && <small>{log.details.note}</small>}</div></div>)}</div> : <p className="muted-copy">Policy, valve and review actions will show up here.</p>}</Card></div>
    <section className="admin-management"><div className="card-heading"><div><span className="eyebrow">SIMULATION CONFIGURATION</span><h2>Demo policy parameters</h2></div><Badge tone="dark">BOUNDED SERVER VALIDATION</Badge></div><div className="admin-plan-grid">{plans.map(plan => <Card className="admin-plan-card" key={plan._id}><div className="admin-plan-heading"><div><b>{plan.name}</b><small>Demo plan · INR</small></div><Badge tone="teal">CONFIGURABLE</Badge></div><form onSubmit={event => updatePlan(event, plan)} className="plan-config-form">{[['monthlyPremium','Monthly premium'],['coverageLimit','Coverage limit'],['triggerFlow','Flow trigger (L/min)'],['triggerMoisture','Moisture trigger (%)'],['maxPayout','Max payout'],['monitoringDiscountPercent','Discount (%)'],['deductible','Deductible'],['waitingDays','Waiting period (days)']].map(([key,label]) => <label key={key}>{label}<input required type="number" min="0" max={key === 'monitoringDiscountPercent' ? 25 : key === 'triggerMoisture' ? 100 : key === 'waitingDays' ? 365 : undefined} step={key === 'triggerFlow' ? '0.1' : '1'} name={key} defaultValue={plan[key]} /></label>)}<Button><Save size={13} /> Save parameters</Button></form></Card>)}</div></section>
    <div className="admin-management-grid"><Card className="admin-users-card"><div className="card-heading"><div><span className="eyebrow">DEVICE MANAGEMENT</span><h2>Virtual devices</h2></div><span className="history-count">{devices.length}</span></div>{devices.length ? <div className="management-list">{devices.map(device => <div className="management-row" key={device._id}><div><b>{device.deviceId}</b><small>{device.owner?.name} · {device.property?.name}</small></div><button className={`setting-toggle ${device.connected ? 'toggle-on' : ''}`} onClick={() => updateDevice(device, 'connected')}>{device.connected ? 'Connected' : 'Disconnected'}</button><button className={`setting-toggle ${device.autoShutoff ? 'toggle-on' : ''}`} onClick={() => updateDevice(device, 'autoShutoff')}>Auto-shutoff {device.autoShutoff ? 'on' : 'off'}</button></div>)}</div> : <p className="muted-copy">No virtual devices registered.</p>}</Card>
      <Card className="admin-users-card"><div className="card-heading"><div><span className="eyebrow">POLICY MANAGEMENT</span><h2>Issued demo policies</h2></div><span className="history-count">{policies.length}</span></div>{policies.length ? <div className="management-list">{policies.slice(0, 10).map(policy => <div className="management-row" key={policy._id}><div><b>{policy.plan?.name} · {policy.owner?.name}</b><small>{policy.property?.name} · {money(policy.monthlyPremium)} / month</small></div><Badge tone={policy.status === 'active' ? 'green' : 'gray'}>{policy.status}</Badge><button className="setting-toggle" disabled={policy.status !== 'active'} onClick={() => updatePolicy(policy, 'cancelled')}>Cancel</button></div>)}</div> : <p className="muted-copy">No demo policies have been activated.</p>}</Card></div>
    <p className="admin-footnote">Plan parameters are seeded demo examples. This workspace does not administer real insurance products or financial transactions.</p>
  </div>;
}
