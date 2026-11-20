import { useEffect, useState } from 'react';
import { Check, ChevronDown, CircleHelp, Droplets, ShieldCheck, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { Badge, Button, Card, EmptyState, money, PageTitle } from '../components/UI';

export default function Coverage() {
  const [plans, setPlans] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = async () => {
    try {
      const [p, po, pr] = await Promise.all([api.get('/plans'), api.get('/policies'), api.get('/properties')]);
      setPlans(p.data.plans); setPolicies(po.data.policies); setProperties(pr.data.properties); setSelectedProperty(current => current || pr.data.properties[0]?._id || '');
    } catch { toast.error('Could not load plans and policies'); }
  };
  useEffect(() => { load(); }, []);
  const activate = async plan => {
    if (!selectedProperty) { toast.error('Add a property in Home & profile first'); return; }
    setBusy(plan._id);
    try { await api.post('/policies', { planId: plan._id, propertyId: selectedProperty }); toast.success(`${plan.name} demo policy activated`); await load(); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not activate policy'); }
    finally { setBusy(null); }
  };
  const activeForProperty = propertyId => policies.find(policy => policy.status === 'active' && policy.property?._id === propertyId);
  return <div className="coverage-page"><PageTitle eyebrow="COVER THAT MAKES SENSE" title="Protection, on your terms" subtitle="Compare demo plans, see what each one covers and understand your device savings before activating." action={<Badge tone="dark">DEMO INSURANCE</Badge>} />
    <div className="notice-banner"><span className="notice-shield"><ShieldCheck size={18} /></span><div><b>Transparent by design, simulated by nature</b><span>These sample plans are for internship demonstration only—not real insurance, financial advice or a binding offer.</span></div><Badge tone="dark">NOT A REAL POLICY</Badge></div>
    {properties.length > 0 && <div className="property-picker"><label htmlFor="property-select">Choose a home to protect</label><div><Droplets size={17} /><select id="property-select" value={selectedProperty} onChange={event => setSelectedProperty(event.target.value)}>{properties.map(property => <option key={property._id} value={property._id}>{property.name} · {property.address}</option>)}</select><ChevronDown size={16} /></div></div>}
    {properties.length === 0 && <Card><EmptyState title="Add your home before choosing cover" text="A demo policy is linked to a property. Set one up in your profile first." /></Card>}
    <div className="plan-grid">{plans.map((plan, index) => {
      const active = activeForProperty(selectedProperty);
      const isCurrent = active?.plan?._id === plan._id;
      return <Card className={`plan-card ${index === 1 ? 'plan-featured' : ''}`} key={plan._id}>
        {index === 1 && <span className="popular-ribbon"><Sparkles size={13} /> MOST POPULAR</span>}
        <div className="plan-top"><span className={`plan-mark plan-mark-${index}`}><Droplets size={20} /></span><Badge tone={index === 1 ? 'teal' : 'blue'}>{plan.name.toUpperCase()}</Badge></div>
        <h2>{plan.name}</h2><p className="plan-description">{plan.description}</p>
        <div className="plan-price"><b>{money(plan.monthlyPremium)}</b><span> / month</span></div>
        <div className="plan-limit"><span>Coverage limit</span><b>{money(plan.coverageLimit)}</b></div>
        <div className="plan-includes"><span><Check size={15} /> Max automatic payout <b>{money(plan.maxPayout)}</b></span><span><Check size={15} /> Leak trigger: {plan.triggerFlow} L/min + {plan.triggerMoisture}% moisture</span><span><Check size={15} /> {plan.waitingDays ? `${plan.waitingDays}-day waiting period` : 'No waiting period'}</span><span><Check size={15} /> {plan.deductible ? `${money(plan.deductible)} deductible` : 'No deductible'}</span></div>
        <button className="plan-details-toggle" onClick={() => setExpanded(expanded === plan._id ? null : plan._id)}><CircleHelp size={15} /> Exclusions & discount details <ChevronDown size={15} /></button>
        {expanded === plan._id && <div className="plan-details"><b>Discount eligibility</b><p>Up to {Math.min(plan.monitoringDiscountPercent, 25)}% off when your device is connected, uptime is at least 90%, and auto-shutoff is installed.</p><b>Exclusions</b><p>{plan.exclusions?.join(' · ') || 'No listed exclusions'}</p><small>All claims require reliable telemetry and pass every listed trigger check.</small></div>}
        <Button className="plan-cta" variant={isCurrent ? 'outline' : index === 1 ? 'primary' : 'dark'} disabled={!selectedProperty || Boolean(active) || busy === plan._id} onClick={() => activate(plan)}>{isCurrent ? 'Current plan' : active ? 'One active plan per home' : busy === plan._id ? 'Activating…' : `Choose ${plan.name}`} {!active && <span>→</span>}</Button>
      </Card>;
    })}</div>
    <Card className="discount-explainer"><div className="discount-explainer-icon"><Sparkles size={21} /></div><div><span className="eyebrow">A REWARD FOR STAYING CONNECTED</span><h2>Your device can earn you a monthly discount.</h2><p>Our server checks three things: your device is connected, its recorded uptime is at least 90%, and auto-shutoff is enabled. If any requirement is missing, your discount is zero. Eligible discounts are capped at 25% of the base premium.</p></div><div className="discount-equation"><span>Connectivity</span><b>+</b><span>≥90% uptime</span><b>+</b><span>Auto-shutoff</span><b>=</b><strong>Reward</strong></div></Card>
    {policies.length > 0 && <section className="policy-list-section"><div className="card-heading"><div><span className="eyebrow">YOUR DEMO COVER</span><h2>Policies & savings</h2></div></div><div className="active-policy-list">{policies.map(policy => <Card className="active-policy-row" key={policy._id}><div className="policy-plan-icon"><ShieldCheck size={19} /></div><div className="policy-plan-info"><b>{policy.plan?.name} · {policy.property?.name}</b><span>{policy.status === 'active' ? 'Active' : 'Cancelled'} · started {new Date(policy.startsAt).toLocaleDateString('en-IN')}</span></div><div className="policy-savings"><small>MONTHLY PREMIUM</small><b>{money(policy.monthlyPremium)}<small> / mo</small></b></div><div className="policy-savings saving-value"><small>DEVICE SAVING</small><b>{money(policy.discount?.amount)}<small> / mo</small></b></div><Badge tone={policy.status === 'active' ? 'green' : 'gray'}>{policy.status}</Badge></Card>)}</div></section>}
    <p className="coverage-footnote"><ShieldCheck size={14} /> Academic demo only. Eligibility and sample terms are configurable and are not certified insurance terms.</p>
  </div>;
}
