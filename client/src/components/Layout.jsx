import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Bell, ChevronDown, CircleHelp, Droplets, FileText, LayoutDashboard, LogOut, Menu, Settings, Shield, ShieldCheck, Waves, X, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

const userNav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/simulator', label: 'Device simulator', icon: Activity },
  { to: '/coverage', label: 'My coverage', icon: ShieldCheck },
  { to: '/claims', label: 'Claims & payouts', icon: FileText },
  { to: '/profile', label: 'Home & profile', icon: Settings }
];
export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  useEffect(() => { api.get('/notifications').then(({ data }) => setUnread(data.notifications.filter(n => !n.read).length)).catch(() => {}); }, []);
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000', { auth: { token: localStorage.getItem('aquashield_token') } });
    socket.on('notification:new', notification => {
      setUnread(count => count + 1);
      toast(notification.title, { icon: notification.type === 'incident' ? '💧' : '🔔' });
    });
    return () => socket.disconnect();
  }, []);
  const items = user?.role === 'admin' ? [{ to: '/admin', label: 'Command center', icon: LayoutDashboard }, ...userNav.slice(3)] : userNav;
  const leave = async () => { await logout(); toast.success('You are signed out'); navigate('/'); };
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <a className="brand" href="/"><span className="brand-mark"><Droplets size={22} fill="currentColor" /></span><span>Aqua<span className="brand-light">Shield</span><small>SMART HOME PROTECTION</small></span></a>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav">{items.map(item => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><item.icon size={18} /><span>{item.label}</span>{item.to === '/claims' && unread > 0 && <span className="nav-count">{unread}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><CircleHelp size={17} /></span><b>Need a hand?</b><p>Your protection team is here for you.</p><button onClick={() => toast('This is a demo workspace. Contact support is not connected.')}>Visit help center <span>↗</span></button></div><div className="sidebar-status"><span className="pulse-dot" /> All systems operational <span className="demo-pill">DEMO</span></div></div>
    </aside>
    {open && <button className="mobile-backdrop" onClick={() => setOpen(false)} aria-label="Close menu" />}
    <main className="app-main">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X size={20} /> : <Menu size={20} />}</button><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{items.find(i => window.location.pathname.startsWith(i.to))?.label || 'Overview'}</b></div><div className="topbar-actions"><span className="live-label"><span className="pulse-dot" /> LIVE MONITORING</span><button className="icon-button notification-button" title="Notifications" onClick={() => navigate('/claims')}><Bell size={18} />{unread > 0 && <i />}</button><span className="top-divider" /><button className="profile-menu" onClick={() => navigate('/profile')}><span className="avatar">{user?.name?.slice(0, 1).toUpperCase() || 'A'}</span><span className="profile-name">{user?.name}<small>{user?.role === 'admin' ? 'Administrator' : 'Homeowner'}</small></span><ChevronDown size={15} /></button><button className="icon-button logout-button" onClick={leave} aria-label="Log out"><LogOut size={17} /></button></div></header>
      <div className="content"><Outlet /></div>
    </main>
  </div>;
}
