import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { register as apiRegister } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function CNICUploadBox({ label, value, onChange, error }) {
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => onChange(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => onChange(event.target.result);
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsHovered(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.indexOf('image') !== -1) {
      const reader = new FileReader();
      reader.onload = (event) => onChange(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const inputId = `file-input-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-ha-text-2">{label}</label>
      <div
        onPaste={handlePaste}
        onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
        onDragLeave={() => setIsHovered(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById(inputId).click()}
        className={`relative border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] ${
          value
            ? 'border-ha-teal/50 bg-ha-teal/5'
            : isHovered
            ? 'border-ha-primary bg-ha-primary/5'
            : 'border-ha-border-2 hover:border-ha-primary bg-ha-bg'
        }`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById(inputId).click(); }}
      >
        <input type="file" id={inputId} accept="image/*" onChange={handleFileChange} className="hidden" />
        {value ? (
          <div className="relative w-full h-[90px] flex items-center justify-center overflow-hidden rounded-lg">
            <img src={value} alt={label} className="object-contain max-h-[90px] rounded" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="absolute top-0 right-0 bg-ha-danger text-ha-text-1 p-1 rounded-full text-xs shadow-md"
              title="Remove image"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="space-y-1 text-[11px] text-ha-text-3 pointer-events-none">
            <div className="text-xl">📷</div>
            <p className="font-semibold text-ha-text-2">Click / Drop to upload</p>
            <p className="text-ha-text-3">or <span className="font-semibold text-ha-primary">paste (Ctrl+V)</span></p>
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-ha-danger font-medium">{error}</p>}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState(searchParams.get('role') === 'provider' ? 'provider' : 'customer');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', location: '', cnicNumber: '', cnicFront: '', cnicBack: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const formatCNIC = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  };

  const set = (key) => (e) => {
    let val = e.target.value;
    if (key === 'cnicNumber') val = formatCNIC(val);
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e2) => ({ ...e2, [key]: '' }));
  };

  const setDirect = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e2) => ({ ...e2, [key]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email) errs.email = 'Email is required';
    if (!form.password || form.password.length < 6) errs.password = 'Minimum 6 characters';
    if (role === 'provider') {
      if (!form.cnicNumber) errs.cnicNumber = 'CNIC number is required';
      else if (!/^\d{5}-\d{7}-\d{1}$/.test(form.cnicNumber)) errs.cnicNumber = 'CNIC format must be XXXXX-XXXXXXX-X';
      if (!form.cnicFront) errs.cnicFront = 'CNIC Front picture is required';
      if (!form.cnicBack) errs.cnicBack = 'CNIC Back picture is required';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, password: form.password, phone: form.phone, location: form.location, role };
      if (role === 'provider') { payload.cnicNumber = form.cnicNumber; payload.cnicFront = form.cnicFront; payload.cnicBack = form.cnicBack; }
      const data = await apiRegister(payload);
      login(data.token, data.user);
      toast('Account created! Welcome to HomeAssist.', 'success');
      if (role === 'provider') navigate('/dashboard');
      else navigate('/');
    } catch (err) {
      toast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-ha-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-[4px] bg-ha-primary mb-4">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ha-text-1 font-display">Create your account</h1>
          <p className="text-ha-text-3 mt-1 text-sm">Join thousands of users across Pakistan</p>
        </div>

        <div className="bg-ha-surface rounded-2xl border border-ha-border p-8">
          {/* Role toggle */}
          <div className="flex rounded-[4px] overflow-hidden border border-ha-border mb-5">
            {['customer', 'provider'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  role === r ? 'bg-ha-primary text-white' : 'bg-ha-surface-2 text-ha-text-2 hover:text-ha-text-1'
                }`}
              >
                {r === 'customer' ? '🏠 Customer' : '🔧 Service Provider'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" type="text" value={form.name} onChange={set('name')} error={errors.name} placeholder="Muhammad Ali" autoComplete="name" />
            <Input label="Email address" type="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" autoComplete="email" />
            <Input label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} placeholder="Minimum 6 characters" autoComplete="new-password" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Phone (optional)" type="tel" value={form.phone} onChange={set('phone')} placeholder="+92 300 1234567" />
              <Input label="City (optional)" type="text" value={form.location} onChange={set('location')} placeholder="Lahore" />
            </div>

            {role === 'provider' && (
              <>
                <Input label="CNIC Number" type="text" value={form.cnicNumber} onChange={set('cnicNumber')} error={errors.cnicNumber} placeholder="35201-1234567-1" maxLength={15} />
                <div className="grid grid-cols-2 gap-3">
                  <CNICUploadBox label="CNIC Front" value={form.cnicFront} onChange={setDirect('cnicFront')} error={errors.cnicFront} />
                  <CNICUploadBox label="CNIC Back" value={form.cnicBack} onChange={setDirect('cnicBack')} error={errors.cnicBack} />
                </div>
                <div className="rounded-[6px] bg-ha-accent/10 border border-ha-accent/30 p-3 text-sm text-ha-accent">
                  Your CNIC and details will be reviewed securely by our team for verification before going live.
                </div>
              </>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-ha-text-3 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-ha-primary font-medium hover:text-ha-primary-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
