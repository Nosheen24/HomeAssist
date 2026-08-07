import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { updateProfile } from '../api/auth';

const inputCls = 'w-full rounded-[6px] border border-ha-border bg-ha-bg px-3 py-2.5 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary transition-colors';
const labelCls = 'block text-[13px] font-medium text-ha-text-2 mb-1';

const AVATAR_COLORS = [
  'bg-ha-primary/20 text-ha-primary',
  'bg-ha-teal/20 text-ha-teal',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
];

// Circular avatar with click / drag / paste upload — shows the photo when set.
function AvatarUpload({ name, value, onChange }) {
  const [hovered, setHovered] = useState(false);
  const inputId = 'profile-avatar-input';
  const color = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  const readFile = (file) => {
    if (file && file.type.indexOf('image') !== -1) {
      const reader = new FileReader();
      reader.onload = (ev) => onChange(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onClick={() => document.getElementById(inputId).click()}
        onDragOver={(e) => { e.preventDefault(); setHovered(true); }}
        onDragLeave={() => setHovered(false)}
        onDrop={(e) => { e.preventDefault(); setHovered(false); readFile(e.dataTransfer?.files?.[0]); }}
        onPaste={(e) => { const item = [...(e.clipboardData?.items || [])].find((i) => i.type.indexOf('image') !== -1); if (item) readFile(item.getAsFile()); }}
        tabIndex={0}
        className={`relative h-28 w-28 rounded-full cursor-pointer overflow-hidden flex items-center justify-center text-4xl font-bold transition-all ${
          value ? '' : color
        } ${hovered ? 'ring-2 ring-ha-primary ring-offset-2' : ''}`}
        title="Click, drop, or paste an image"
      >
        <input type="file" id={inputId} accept="image/*" className="hidden"
          onChange={(e) => readFile(e.target.files?.[0])} />
        {value
          ? <img src={value} alt={name || 'Profile'} className="h-full w-full object-cover" />
          : (name?.[0]?.toUpperCase() || '?')}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
          <span className="text-xs font-semibold text-white">Change</span>
        </div>
      </div>
      {value && (
        <button type="button" onClick={() => onChange('')}
          className="text-xs font-medium text-ha-danger hover:underline">
          Remove photo
        </button>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    bio: user?.bio || '',
    profilePhoto: user?.profilePhoto || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || form.name.trim().length < 2) {
      toast('Please enter your name', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: form.name.trim(),
        phone: form.phone || null,
        location: form.location || null,
        bio: form.bio || null,
        profilePhoto: form.profilePhoto || null,
      });
      updateUser(updated);
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-ha-bg min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ha-text-1 font-display">My Profile</h1>
        <p className="text-sm text-ha-text-3 mt-1">Manage your photo, contact details, and bio.</p>
      </div>

      <div className="bg-ha-surface rounded-xl border border-ha-border p-6 space-y-6">
        <AvatarUpload
          name={form.name}
          value={form.profilePhoto}
          onChange={(val) => setForm((f) => ({ ...f, profilePhoto: val }))}
        />

        <div>
          <label className={labelCls}>Full name</label>
          <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Your name" />
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input className={`${inputCls} opacity-60 cursor-not-allowed`} value={user?.email || ''} disabled />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="0300-1234567" />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={form.location} onChange={set('location')} placeholder="Lahore" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Bio</label>
          <textarea className={`${inputCls} min-h-[100px] resize-y`} value={form.bio} onChange={set('bio')}
            placeholder="Tell providers a little about yourself..." maxLength={500} />
          <p className="text-xs text-ha-text-3 mt-1">{form.bio.length}/500</p>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="text-sm font-semibold bg-ha-primary hover:bg-ha-primary-hover text-white px-6 py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
