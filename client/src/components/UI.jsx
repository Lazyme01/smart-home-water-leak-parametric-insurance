import { motion } from 'framer-motion';
import { LoaderCircle, Waves } from 'lucide-react';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function Card({ children, className = '', ...props }) {
  return <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`card ${className}`} {...props}>{children}</motion.section>;
}
export function Badge({ children, tone = 'teal' }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function PageTitle({ eyebrow, title, subtitle, action }) {
  return <div className="page-title"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
export function EmptyState({ title, text, action }) { return <div className="empty-state"><span className="empty-icon"><Waves size={22} /></span><h3>{title}</h3><p>{text}</p>{action}</div>; }
export function Loading() { return <div className="loading"><LoaderCircle className="spin" size={28} /> Loading your AquaShield workspace…</div>; }
export const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
export const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
