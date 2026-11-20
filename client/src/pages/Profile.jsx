import { useEffect, useState } from 'react';
import { ArrowRight, Home, Plus, Radio, Save, ShieldCheck, UserRound } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Badge, Button, Card, EmptyState, PageTitle } from '../components/UI';

const profileSchema = z.object({ name: z.string().min(2, 'Name must be at least 2 characters'), phone: z.string().max(30).optional() });
export default function Profile() {
  const { user, updateUser } = useAuth();
  const [properties, setProperties] = useState([]);
  const [devices, setDevices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [propertyBusy, setPropertyBusy] = useState(false);
  const [deviceProperty, setDeviceProperty] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name || '', phone: user?.phone || '' } });
  const [home, setHome] = useState({ name: '', address: '', type: 'House' });
  const load = async () => {
    try { const [p, d] = await Promise.all([api.get('/properties'), api.get('/devices')]); setProperties(p.data.properties); setDevices(d.data.devices); setDeviceProperty(current => current || p.data.properties[0]?._id || ''); }
    catch { toast.error('Could not load your home data'); }
  };
  useEffect(() => { load(); }, []);
  const save = async values => {
    setSaving(true);
    try { const { data } = await api.patch('/users/profile', values); updateUser(data.user); toast.success('Profile details saved'); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not save your profile'); }
    finally { setSaving(false); }
  };
  const addHome = async event => {
    event.preventDefault(); setPropertyBusy(true);
    try { await api.post('/properties', home); setHome({ name: '', address: '', type: 'House' }); await load(); toast.success('Home added to your workspace'); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not add home'); }
    finally { setPropertyBusy(false); }
  };
  const addDevice = async () => {
    if (!deviceProperty) return toast.error('Add a property before linking a device');
    try { await api.post('/devices', { propertyId: deviceProperty }); await load(); toast.success('Virtual device linked · DEMO'); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not link device'); }
  };
  return <div className="profile-page"><PageTitle eyebrow="YOUR DETAILS & CONNECTED HOME" title="Home & profile" subtitle="Keep your contact details up to date and manage your virtual monitoring setup." />
    <div className="profile-layout"><div className="profile-main"><Card className="profile-form-card"><div className="card-heading"><div><span className="eyebrow">PERSONAL INFORMATION</span><h2>Your profile</h2></div><span className="profile-section-icon"><UserRound size={18} /></span></div><form className="profile-form" onSubmit={handleSubmit(save)}><label>Full name<input {...register('name')} />{errors.name && <span className="form-error">{errors.name.message}</span>}</label><label>Email address<input value={user?.email || ''} disabled /><small>Your sign-in email cannot be changed in this demo.</small></label><label>Phone number <span className="optional">(optional)</span><input placeholder="+91 98765 43210" {...register('phone')} />{errors.phone && <span className="form-error">{errors.phone.message}</span>}</label><div className="profile-form-footer"><span>Role <Badge tone={user?.role === 'admin' ? 'violet' : 'teal'}>{user?.role}</Badge></span><Button disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <Save size={15} /></Button></div></form></Card>
      <Card className="home-list-card"><div className="card-heading"><div><span className="eyebrow">YOUR PROPERTIES</span><h2>Homes in your workspace</h2></div><span className="profile-section-icon"><Home size={18} /></span></div>{properties.length ? <div className="home-list">{properties.map(property => { const attached = devices.filter(device => (device.property?._id || device.property) === property._id); return <div className="home-row" key={property._id}><span className="home-row-icon"><Home size={18} /></span><div><b>{property.name}</b><small>{property.address} · {property.type}</small><small>{attached.length ? attached.map(device => `${device.deviceId} · ${device.online ? 'online' : 'offline'} (DEMO)`).join(', ') : 'No virtual sensor linked yet'}</small></div><Badge tone="teal">{attached.length ? 'MONITORED' : 'UNLINKED'}</Badge></div>; })}</div> : <EmptyState title="Make yourself at home" text="Add a property to start building your demo protection workspace." />}
        <form className="home-add-form" onSubmit={addHome}><h3><Plus size={16} /> Add a property</h3><div className="form-two-col"><label>Property name<input required minLength="2" placeholder="e.g. Lakeview Home" value={home.name} onChange={event => setHome({ ...home, name: event.target.value })} /></label><label>Home type<select value={home.type} onChange={event => setHome({ ...home, type: event.target.value })}><option>House</option><option>Apartment</option><option>Townhouse</option><option>Other</option></select></label></div><label>Address<input required minLength="5" placeholder="Street, city, PIN code" value={home.address} onChange={event => setHome({ ...home, address: event.target.value })} /></label><Button disabled={propertyBusy}>{propertyBusy ? 'Adding…' : 'Add property'} <ArrowRight size={14} /></Button></form>
      </Card></div><aside className="profile-aside"><Card className="link-device-card"><span className="device-link-icon"><Radio size={21} /></span><span className="eyebrow">NO HARDWARE NEEDED</span><h2>Link a virtual device</h2><p>Your demo FlowGuard sensor generates synthetic telemetry you can use to try leaks, valve responses and claim rules.</p>{properties.length ? <><label>Choose a home<select value={deviceProperty} onChange={event => setDeviceProperty(event.target.value)}>{properties.map(property => <option key={property._id} value={property._id}>{property.name}</option>)}</select></label><Button className="link-device-button" onClick={addDevice}><Plus size={15} /> Link demo device</Button></> : <p className="device-hint"><Home size={14} /> Add a property before linking a device.</p>}<div className="device-compatibility"><span><ShieldCheck size={15} /> Synthetic readings</span><span><ShieldCheck size={15} /> Simulated shut-off valve</span><span><ShieldCheck size={15} /> No physical hardware</span></div></Card><Card className="privacy-card"><span className="privacy-icon"><ShieldCheck size={18} /></span><div><b>Built for your demo</b><p>This workspace stores account and simulation data in your local MongoDB. Never use your real insurance or payment credentials here.</p></div></Card></aside></div>
  </div>;
}
