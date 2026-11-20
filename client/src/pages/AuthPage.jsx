import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Droplets, Eye, EyeOff, ShieldCheck, Waves } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';

const schema = register => z.object({
  ...(register ? { name: z.string().min(2, 'Please enter your name') } : {}),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(register ? 8 : 1, register ? 'Use at least 8 characters' : 'Enter your password')
});
export default function AuthPage({ register = false }) {
  const { login, register: signUp } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const { register: field, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema(register)) });
  const submit = async values => {
    try { const user = register ? await signUp(values) : await login(values); toast.success(register ? 'Your account is ready' : `Welcome back, ${user.name.split(' ')[0]}`); navigate(user.role === 'admin' ? '/admin' : '/dashboard'); }
    catch (error) { toast.error(error.response?.data?.error || 'Could not complete sign-in'); }
  };
  return <div className="auth-page"><div className="auth-art"><Link to="/" className="brand"><span className="brand-mark"><Droplets size={22} fill="currentColor" /></span><span>Aqua<span className="brand-light">Shield</span><small>SMART HOME PROTECTION</small></span></Link><Link to="/" className="back-link"><ArrowLeft size={15} /> Back to home</Link><div className="auth-quote"><span className="eyebrow">A LITTLE MORE PEACE OF MIND</span><h1>Protection that<br />keeps a <em>closer eye.</em></h1><p>See how small signals can help protect the place you call home.</p><div className="auth-wave"><Waves size={175} strokeWidth={.8} /><ShieldCheck size={61} /></div><span className="auth-art-caption">SMART MONITORING · TRANSPARENT COVER</span></div></div><div className="auth-form-side"><div className="auth-card"><span className="auth-icon"><ShieldCheck size={22} /></span><span className="eyebrow">{register ? 'START YOUR HOME JOURNEY' : 'YOUR HOME, AT A GLANCE'}</span><h2>{register ? 'Create your account' : 'Welcome back'}</h2><p className="auth-subtitle">{register ? 'A safer home starts with one simple step.' : 'Sign in to your AquaShield workspace.'}</p><form onSubmit={handleSubmit(submit)} noValidate>
    {register && <label>Full name<input placeholder="e.g. Aarav Sharma" autoComplete="name" {...field('name')} />{errors.name && <span className="form-error">{errors.name.message}</span>}</label>}
    <label>Email address<input placeholder="you@example.com" autoComplete="email" {...field('email')} />{errors.email && <span className="form-error">{errors.email.message}</span>}</label>
    <label>Password<div className="password-field"><input type={visible ? 'text' : 'password'} placeholder={register ? 'At least 8 characters' : 'Your password'} autoComplete={register ? 'new-password' : 'current-password'} {...field('password')} /><button type="button" onClick={() => setVisible(!visible)} aria-label="Toggle password visibility">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <span className="form-error">{errors.password.message}</span>}</label>
    <button className="button button-primary auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : register ? 'Create my account' : 'Sign in to dashboard'} <ArrowRight size={17} /></button></form>
    {!register && <div className="demo-login"><b>Try the demo</b><span>Homeowner: homeowner@aquashield.demo</span><span>Admin: admin@aquashield.demo</span><span>Password: AquaDemo123!</span></div>}
    <div className="auth-switch">{register ? 'Already have an account?' : 'New to AquaShield?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></div>
    <p className="auth-disclaimer"><ShieldCheck size={13} /> Demo credentials and transactions are simulated. No real insurance or money movement.</p></div></div></div>;
}
