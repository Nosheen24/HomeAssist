import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const data = await apiLogin(form.email, form.password);
      login(data.token, data.user);
      toast('Welcome back!', 'success');
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'provider') navigate('/dashboard');
      else navigate('/');
    } catch (err) {
      toast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email, password) => setForm({ email, password });

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-ha-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-[4px] bg-ha-primary mb-4">
            <svg className="h-7 w-7 text-ha-text-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ha-text-1 font-display">Sign in to HomeAssist</h1>
          <p className="text-ha-text-3 mt-1 text-sm">Welcome back — enter your details below</p>
        </div>

        <div className="bg-ha-surface rounded-2xl border border-ha-border p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-ha-border">
            <p className="text-xs text-center text-ha-text-3 mb-3">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Admin',    email: 'admin@homeassist.pk',    pwd: 'admin123' },
                { label: 'Customer', email: 'customer@homeassist.pk', pwd: 'customer123' },
                { label: 'Provider', email: 'ali.khan@example.com',   pwd: 'provider123' },
              ].map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => fillDemo(d.email, d.pwd)}
                  className="px-2 py-1.5 bg-ha-surface-2 hover:bg-ha-surface-2 border border-ha-border hover:border-ha-primary rounded-[4px] text-xs text-ha-text-2 hover:text-ha-primary transition-colors"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-ha-text-3 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-ha-primary font-medium hover:text-ha-primary-hover">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
