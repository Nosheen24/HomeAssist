import { useState, useEffect } from 'react';
import { getProviderBookings, updateBookingStatus } from '../api/bookings';
import { updateBookingTracking } from '../api/bookings';
import {
  getMyProviderProfile,
  updateProviderProfile,
  addProviderService,
  deleteProviderService,
  updateAvailability,
  setMyAvailability,
  pingMyLocation,
} from '../api/providers';
import { getCategories } from '../api/categories';
import { getWallet } from '../api/payments';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import Skeleton from '../components/ui/Skeleton';
import LiveTrackerMap from '../components/shared/LiveTrackerMap';
import ChatPanel from '../components/shared/ChatPanel';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const inputCls = 'w-full rounded-[6px] border border-ha-border bg-ha-bg px-3 py-2.5 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary transition-colors';
const labelCls = 'block text-[13px] font-medium text-ha-text-2';

function CNICUploadBox({ label, value, onChange }) {
  const [isHovered, setIsHovered] = useState(false);
  const inputId = `dashboard-file-input-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => onChange(ev.target.result);
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
          reader.onload = (ev) => onChange(ev.target.result);
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
      reader.onload = (ev) => onChange(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

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
          value ? 'border-ha-teal/50 bg-ha-teal/5'
          : isHovered ? 'border-ha-primary bg-ha-primary/5'
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
            >✕</button>
          </div>
        ) : (
          <div className="space-y-1 text-[11px] text-ha-text-3 pointer-events-none">
            <div className="text-xl">📷</div>
            <p className="font-semibold text-ha-text-2">Click / Drop to upload</p>
            <p>or <span className="font-semibold text-ha-primary">paste (Ctrl+V)</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageUploadBox({ label, value, onChange, hint }) {
  const [isHovered, setIsHovered] = useState(false);
  const inputId = `dashboard-image-input-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => onChange(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-ha-text-2">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
        onDragLeave={() => setIsHovered(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsHovered(false);
          const file = e.dataTransfer?.files?.[0];
          if (file && file.type.indexOf('image') !== -1) {
            const reader = new FileReader();
            reader.onload = (ev) => onChange(ev.target.result);
            reader.readAsDataURL(file);
          }
        }}
        onClick={() => document.getElementById(inputId).click()}
        className={`relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] overflow-hidden ${
          value ? 'border-ha-teal/50 bg-ha-teal/5'
          : isHovered ? 'border-ha-primary bg-ha-primary/5'
          : 'border-ha-border-2 hover:border-ha-primary bg-ha-bg'
        }`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById(inputId).click(); }}
      >
        <input type="file" id={inputId} accept="image/*" onChange={handleFileChange} className="hidden" />
        {value ? (
          <div className="relative w-full flex items-center justify-center">
            <img src={value} alt={label} className="max-h-[150px] w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="absolute top-2 right-2 bg-ha-danger text-ha-text-1 p-1 rounded-full text-xs shadow-md"
              title="Remove image"
            >✕</button>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-ha-text-3 pointer-events-none">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ha-surface-2 text-xl">🖼️</div>
            <p className="font-semibold text-ha-text-2">Click / drop to upload</p>
            <p className="text-xs">{hint || 'Add a clean profile photo that customers will recognize.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, borderColor }) {
  return (
    <div className={`bg-ha-surface rounded-xl border border-ha-border p-5 border-l-4 ${borderColor || 'border-l-ha-primary'}`}>
      <p className="text-2xl font-bold text-ha-primary font-mono">{value}</p>
      <p className="text-sm text-ha-text-3 mt-1">{label}</p>
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab({ provider, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    bio: provider?.bio || '',
    experienceYears: provider?.experienceYears || 0,
    serviceArea: provider?.serviceArea || '',
    phone: provider?.user?.phone || '',
    profilePhoto: provider?.profilePhoto || '',
    cnicNumber: provider?.cnicNumber || '',
    cnicFront: provider?.cnicFront || '',
    cnicBack: provider?.cnicBack || '',
  });
  const [saving, setSaving] = useState(false);
  const providerCode = `HA-PROV-${String(provider?.id || 0).padStart(4, '0')}`;

  const formatCNIC = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  };

  const setDirect = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.cnicNumber) { toast('CNIC number is required', 'error'); return; }
    if (!/^\d{5}-\d{7}-\d{1}$/.test(form.cnicNumber)) { toast('CNIC format must be XXXXX-XXXXXXX-X', 'error'); return; }
    if (!form.cnicFront) { toast('CNIC Front image is required', 'error'); return; }
    if (!form.cnicBack) { toast('CNIC Back image is required', 'error'); return; }

    setSaving(true);
    try {
      await updateProviderProfile(provider.id, {
        bio: form.bio,
        experienceYears: parseInt(form.experienceYears),
        serviceArea: form.serviceArea,
        phone: form.phone,
        profilePhoto: form.profilePhoto,
        cnicNumber: form.cnicNumber,
        cnicFront: form.cnicFront,
        cnicBack: form.cnicBack,
      });
      toast('Profile updated!', 'success');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-ha-surface rounded-xl border border-ha-border p-6 space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-5 pb-5 border-b border-ha-border">
        <ImageUploadBox
          label="Profile Photo"
          value={form.profilePhoto}
          onChange={(val) => setForm((f) => ({ ...f, profilePhoto: val }))}
          hint="Use a clear face photo so customers can trust the profile."
        />
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ha-text-3">Provider identity</p>
              <h3 className="text-xl font-bold text-ha-text-1 mt-1">{provider?.user?.name}</h3>
              <p className="text-sm text-ha-text-3">{provider?.user?.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-ha-surface-2 border border-ha-border px-3 py-1.5 text-xs font-semibold text-ha-text-2">
                {providerCode}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold border ${provider?.isVerified ? 'bg-ha-teal/10 text-ha-teal border-ha-teal/30' : 'bg-ha-accent/10 text-ha-accent border-ha-accent/30'}`}>
                {provider?.isVerified ? 'Verified' : 'Pending verification'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-ha-surface-2 border border-ha-border p-3">
              <p className="text-xs text-ha-text-3">Phone number</p>
              <p className="text-sm font-semibold text-ha-text-1 mt-1">{provider?.user?.phone || 'Not set'}</p>
            </div>
            <div className="rounded-xl bg-ha-surface-2 border border-ha-border p-3">
              <p className="text-xs text-ha-text-3">Service area</p>
              <p className="text-sm font-semibold text-ha-text-1 mt-1">{provider?.serviceArea || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1">
          <label className={labelCls}>Bio / About You</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={4}
            placeholder="Describe your skills, experience, and what makes you the best choice..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelCls}>Years of Experience</label>
            <input type="number" min="0" max="50" value={form.experienceYears}
              onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
              className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Phone Number</label>
            <input type="tel" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="03xx-xxxxxxx" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Service Area</label>
            <input type="text" value={form.serviceArea}
              onChange={(e) => setForm((f) => ({ ...f, serviceArea: e.target.value }))}
              placeholder="e.g. Lahore, DHA, Gulberg" className={inputCls} />
          </div>
        </div>

        <div className="rounded-xl border border-ha-border bg-ha-surface-2 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-ha-text-1 text-sm">Public profile snapshot</h4>
              <p className="text-xs text-ha-text-3 mt-0.5">This is the identity customers see when they book you.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-ha-bg border border-ha-border px-3 py-1.5 text-xs font-semibold text-ha-text-2">
              {providerCode}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
            {[
              { label: 'Profile photo', value: form.profilePhoto ? 'Uploaded' : 'Add one' },
              { label: 'Phone', value: form.phone || 'Add number' },
              { label: 'Verified identity', value: provider?.isVerified ? 'Verified' : 'Pending' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-ha-bg border border-ha-border p-3">
                <p className="text-ha-text-3">{item.label}</p>
                <p className="mt-1 font-semibold text-ha-text-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-ha-border pt-4 space-y-4">
          <h4 className="font-semibold text-ha-text-1 text-sm">CNIC Verification</h4>
          <div className="space-y-1">
            <label className={labelCls}>CNIC Number</label>
            <input type="text" value={form.cnicNumber}
              onChange={(e) => setForm((f) => ({ ...f, cnicNumber: formatCNIC(e.target.value) }))}
              placeholder="35201-1234567-1" maxLength={15} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CNICUploadBox label="CNIC Front" value={form.cnicFront} onChange={setDirect('cnicFront')} />
            <CNICUploadBox label="CNIC Back" value={form.cnicBack} onChange={setDirect('cnicBack')} />
          </div>
          <p className="text-xs bg-ha-accent/10 border border-ha-accent/30 text-ha-accent rounded-lg p-2.5">
            ⚠️ Updating your CNIC will reset your verification status and require admin re-approval.
          </p>
        </div>

        <Button type="submit" loading={saving} size="md">Save Profile</Button>
      </form>
    </div>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────
function ServicesTab({ provider, categories, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ categoryId: '', title: '', price: '', priceUnit: 'fixed' });
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.categoryId || !form.title || !form.price) { toast('Fill in all fields', 'error'); return; }
    setAdding(true);
    try {
      await addProviderService(provider.id, {
        categoryId: parseInt(form.categoryId),
        title: form.title,
        price: parseFloat(form.price),
        priceUnit: form.priceUnit,
      });
      toast('Service added!', 'success');
      setForm({ categoryId: '', title: '', price: '', priceUnit: 'fixed' });
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (serviceId) => {
    if (!confirm('Remove this service?')) return;
    setDeleting(serviceId);
    try {
      await deleteProviderService(provider.id, serviceId);
      toast('Service removed', 'info');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-ha-surface rounded-xl border border-ha-border divide-y divide-ha-border">
        <div className="px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-ha-text-1">Your Services</h3>
          <span className="text-sm text-ha-text-3">{provider?.services?.length || 0} services</span>
        </div>
        {!provider?.services?.length ? (
          <div className="px-5 py-8 text-center text-sm text-ha-text-3">
            No services yet — add your first one below.
          </div>
        ) : (
          provider.services.map((svc) => (
            <div key={svc.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ha-text-1">{svc.title}</p>
                <p className="text-xs text-ha-text-3">
                  {svc.category?.name} · <span className="font-mono text-ha-accent">PKR {Number(svc.price).toLocaleString()}</span> / {svc.priceUnit}
                </p>
              </div>
              <button
                onClick={() => handleDelete(svc.id)}
                disabled={deleting === svc.id}
                className="text-ha-danger text-xs font-medium px-2 py-1 hover:bg-ha-danger/10 rounded transition-colors disabled:opacity-40"
              >
                {deleting === svc.id ? '...' : 'Remove'}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="bg-ha-surface rounded-xl border border-ha-border p-5">
        <h3 className="font-semibold text-ha-text-1 mb-4">Add a New Service</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Category</label>
              <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className={inputCls}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Price Unit</label>
              <select value={form.priceUnit} onChange={(e) => setForm((f) => ({ ...f, priceUnit: e.target.value }))} className={inputCls}>
                <option value="fixed">Fixed</option>
                <option value="per hour">Per Hour</option>
                <option value="per visit">Per Visit</option>
                <option value="per room">Per Room</option>
                <option value="per piece">Per Piece</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Service Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Pipe Leak Repair, AC General Service" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Price (PKR)</label>
            <input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="e.g. 1500" className={inputCls} />
          </div>
          <Button type="submit" loading={adding} size="md">Add Service</Button>
        </form>
      </div>
    </div>
  );
}

// ─── Availability Tab ─────────────────────────────────────────────────────────
function AvailabilityTab({ provider, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const initSlots = () => {
    const map = {};
    provider?.availability?.forEach((s) => {
      map[s.dayOfWeek] = { enabled: true, startTime: s.startTime, endTime: s.endTime };
    });
    return DAYS.map((_, i) => ({
      enabled: !!map[i],
      startTime: map[i]?.startTime || '09:00',
      endTime: map[i]?.endTime || '18:00',
    }));
  };

  const [slots, setSlots] = useState(initSlots);
  const toggle = (i) => setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, enabled: !s.enabled } : s));
  const setTime = (i, key, val) => setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s));

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeSlots = slots
        .map((s, i) => ({ ...s, dayOfWeek: i }))
        .filter((s) => s.enabled)
        .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
      await updateAvailability(provider.id, activeSlots);
      toast('Availability saved!', 'success');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-ha-surface rounded-xl border border-ha-border p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-ha-text-1">Working Hours</h3>
        <p className="text-xs text-ha-text-3">Check the days you're available</p>
      </div>
      <div className="space-y-3">
        {DAYS.map((day, i) => (
          <div key={day} className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
            slots[i].enabled ? 'border-ha-primary/30 bg-ha-primary/5' : 'border-ha-border bg-ha-bg'
          }`}>
            <input
              type="checkbox"
              id={`day-${i}`}
              checked={slots[i].enabled}
              onChange={() => toggle(i)}
              className="h-4 w-4 rounded cursor-pointer flex-shrink-0 accent-ha-primary"
            />
            <label htmlFor={`day-${i}`} className={`w-24 text-sm font-medium cursor-pointer ${slots[i].enabled ? 'text-ha-text-1' : 'text-ha-text-3'}`}>
              {day}
            </label>
            {slots[i].enabled ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={slots[i].startTime} onChange={(e) => setTime(i, 'startTime', e.target.value)}
                  className="rounded-[6px] border border-ha-border bg-ha-bg px-2 py-1.5 text-sm text-ha-text-1 focus:outline-none focus:border-ha-primary" />
                <span className="text-ha-text-3 text-sm">to</span>
                <input type="time" value={slots[i].endTime} onChange={(e) => setTime(i, 'endTime', e.target.value)}
                  className="rounded-[6px] border border-ha-border bg-ha-bg px-2 py-1.5 text-sm text-ha-text-1 focus:outline-none focus:border-ha-primary" />
              </div>
            ) : (
              <span className="text-sm text-ha-text-3 flex-1">Not available</span>
            )}
          </div>
        ))}
      </div>
      <Button className="mt-5" loading={saving} onClick={handleSave}>Save Availability</Button>
    </div>
  );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────
const BOOKING_TABS = [
  { key: 'pending', label: 'New Requests', statuses: ['pending'] },
  { key: 'accepted', label: 'Upcoming', statuses: ['accepted'] },
  { key: 'done', label: 'Completed', statuses: ['completed', 'reviewed'] },
  { key: 'other', label: 'Other', statuses: ['declined', 'cancelled'] },
];

function BookingsTab({ bookings, loading, onAction, actionLoading }) {
  const [tab, setTab] = useState('pending');
  const [trackingState, setTrackingState] = useState({ active: false, lastUpdate: null, error: '' });
  const currentStatuses = BOOKING_TABS.find((t) => t.key === tab)?.statuses || [];
  const filtered = bookings.filter((b) => currentStatuses.includes(b.status));
  const acceptedBookings = bookings.filter((b) => b.status === 'accepted');
  const acceptedBookingIds = acceptedBookings.map((b) => b.id).join(',');

  useEffect(() => {
    if (!acceptedBookings.length) {
      setTrackingState({ active: false, lastUpdate: null, error: '' });
      return undefined;
    }
    if (!navigator.geolocation) {
      setTrackingState({ active: false, lastUpdate: null, error: 'This browser does not support live GPS sharing.' });
      return undefined;
    }
    let cancelled = false;
    const pushLocation = async (coords) => {
      try {
        await Promise.all(
          acceptedBookings.map((b) =>
            updateBookingTracking(b.id, { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy })
          )
        );
        if (!cancelled) setTrackingState({ active: true, lastUpdate: new Date(), error: '' });
      } catch (err) {
        if (!cancelled) setTrackingState((s) => ({ ...s, active: false, error: err.message || 'Failed to share live GPS' }));
      }
    };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => pushLocation(pos.coords),
      (err) => {
        if (!cancelled) setTrackingState({ active: false, lastUpdate: null, error: err.message || 'Enable location access to share live GPS.' });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
    return () => { cancelled = true; navigator.geolocation.clearWatch(watchId); };
  }, [acceptedBookingIds]);

  return (
    <div>
      {acceptedBookings.length > 0 && (
        <div className="mb-4 rounded-2xl border border-ha-teal/30 bg-ha-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ha-teal opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ha-teal" />
              </span>
              <div>
                <p className="font-semibold text-ha-text-1">Live GPS sharing {trackingState.error ? 'paused' : 'active'}</p>
                <p className="text-sm text-ha-text-3 mt-0.5">Updating {acceptedBookings.length} accepted booking{acceptedBookings.length > 1 ? 's' : ''} in real time.</p>
              </div>
            </div>
            <div className="text-sm text-ha-text-3">
              {trackingState.lastUpdate
                ? `Last update ${trackingState.lastUpdate.toLocaleTimeString('en-PK', { timeStyle: 'short' })}`
                : trackingState.error || 'Waiting for browser location permission'}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-ha-surface border border-ha-border p-1 rounded-xl mb-4">
        {BOOKING_TABS.map((t) => {
          const count = bookings.filter((b) => t.statuses.includes(b.status)).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-[4px] text-xs sm:text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-ha-surface-2 text-ha-text-1' : 'text-ha-text-3 hover:text-ha-text-2'
              }`}
            >
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(' ')[0]}</span>
              {count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === t.key ? 'bg-ha-primary/15 text-ha-primary' : 'bg-ha-surface-2 text-ha-text-3'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-ha-surface rounded-xl border border-ha-border">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm text-ha-text-3">No bookings here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const { label, variant } = statusBadge(b.status);
            const scheduledDate = new Date(b.scheduledAt);
            return (
              <div key={b.id} className="bg-ha-surface rounded-xl border border-ha-border p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-ha-text-1">{b.service?.title}</p>
                    <p className="text-sm text-ha-text-2">{b.customer?.name}</p>
                    {b.customer?.phone && <p className="text-xs text-ha-text-3">{b.customer.phone}</p>}
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ha-text-3 mb-3">
                  <span>📅 {scheduledDate.toLocaleDateString('en-PK', { dateStyle: 'medium' })}</span>
                  <span>🕐 {scheduledDate.toLocaleTimeString('en-PK', { timeStyle: 'short' })}</span>
                  <span className="col-span-2">📍 {b.address}</span>
                  {b.problemDescription && (
                    <span className="col-span-2 text-ha-text-3 italic">"{b.problemDescription}"</span>
                  )}
                </div>
                {b.review && (
                  <div className="flex items-center gap-2 mb-3 bg-ha-surface-2 rounded-[6px] px-3 py-2">
                    <StarRating rating={b.review.rating} size="sm" />
                    {b.review.comment && <span className="text-xs text-ha-text-3">"{b.review.comment}"</span>}
                  </div>
                )}
                {b.status === 'accepted' && (
                  <div className="mb-3">
                    <LiveTrackerMap
                      customerLat={b.customerLat} customerLng={b.customerLng}
                      providerLat={b.providerLat} providerLng={b.providerLng}
                      distanceKm={b.distanceKm} etaMinutes={b.etaMinutes}
                      destinationLabel={b.customerLocationLabel || b.address}
                      providerLabel={b.provider?.user?.name || 'Provider'}
                      updatedAt={b.providerLocationUpdatedAt}
                    />
                  </div>
                )}
                {['accepted', 'completed'].includes(b.status) && (
                  <div className="mb-3">
                    <ChatPanel bookingId={b.id} />
                  </div>
                )}
                {b.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" className="flex-1"
                      loading={actionLoading === b.id + 'accepted'} onClick={() => onAction(b.id, 'accepted')}>Accept</Button>
                    <Button size="sm" variant="danger" className="flex-1"
                      loading={actionLoading === b.id + 'declined'} onClick={() => onAction(b.id, 'declined')}>Decline</Button>
                  </div>
                )}
                {b.status === 'accepted' && (
                  <Button size="sm" className="w-full"
                    loading={actionLoading === b.id + 'completed'} onClick={() => onAction(b.id, 'completed')}>Mark as Completed</Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Wallet Tab ───────────────────────────────────────────────────────────────
const TXN_STATUS = {
  held:     { label: 'Held', cls: 'bg-ha-accent/10 text-ha-accent border-ha-accent/30' },
  released: { label: 'Released', cls: 'bg-ha-teal/10 text-ha-teal border-ha-teal/30' },
  refunded: { label: 'Refunded', cls: 'bg-ha-danger/10 text-ha-danger border-ha-danger/30' },
};

const money = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

function WalletTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWallet()
      .then(setData)
      .catch(() => toast('Failed to load wallet', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-80 rounded-xl" />;

  const txns = data?.transactions || [];

  return (
    <div className="space-y-5">
      {/* Balance card */}
      <div className="bg-ha-surface rounded-2xl border border-ha-border p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ha-text-3">Available Balance</p>
            <p className="text-4xl font-bold text-ha-text-1 font-mono mt-1">{money(data?.walletBalance)}</p>
            <p className="text-sm text-ha-text-3 mt-2">
              Total Earned: <span className="font-mono font-semibold text-ha-text-2">{money(data?.totalEarned)}</span>
            </p>
          </div>
          <Button
            variant="success"
            onClick={() => toast('Withdrawal request submitted — funds will arrive in 1–2 business days', 'success')}
          >
            Withdraw
          </Button>
        </div>
        <p className="mt-4 text-xs text-ha-text-3 bg-ha-surface-2 border border-ha-border rounded-lg px-3 py-2">
          💸 You receive 85% of each booking. HomeAssist keeps a 15% platform fee. Funds are released to your
          balance once you mark a job as completed.
        </p>
      </div>

      {/* Transaction history */}
      <div className="bg-ha-surface rounded-xl border border-ha-border">
        <div className="px-5 py-3 border-b border-ha-border flex items-center justify-between">
          <h3 className="font-semibold text-ha-text-1">Transaction History</h3>
          <span className="text-sm text-ha-text-3">{txns.length} transactions</span>
        </div>
        {txns.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ha-text-3">
            No transactions yet — earnings from completed jobs will appear here.
          </div>
        ) : (
          <div className="divide-y divide-ha-border">
            {txns.map((t) => {
              const st = TXN_STATUS[t.status] || TXN_STATUS.held;
              return (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ha-text-1 truncate">{t.serviceTitle || 'Service'}</p>
                    <p className="text-xs text-ha-text-3">
                      {t.customerName || 'Customer'} · {new Date(t.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })} · {t.method}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-mono font-semibold text-ha-teal">+{money(t.providerPayout)}</p>
                    <p className="text-[11px] text-ha-text-3 font-mono">
                      {money(t.amount)} − {money(t.commission)} fee
                    </p>
                  </div>
                  <span className={`text-xs font-medium rounded-full px-2.5 py-1 border flex-shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const MAIN_TABS = [
  { key: 'bookings', label: 'Bookings' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'profile', label: 'Profile' },
  { key: 'services', label: 'Services' },
  { key: 'availability', label: 'Availability' },
];

export default function ProviderDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [provider, setProvider] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const loadBookings = () => {
    setLoadingBookings(true);
    getProviderBookings()
      .then(setBookings)
      .catch(() => toast('Failed to load bookings', 'error'))
      .finally(() => setLoadingBookings(false));
  };

  const loadProfile = () => {
    setLoadingProfile(true);
    getMyProviderProfile()
      .then(setProvider)
      .catch(() => toast('Failed to load profile', 'error'))
      .finally(() => setLoadingProfile(false));
  };

  useEffect(() => {
    loadBookings();
    loadProfile();
    getCategories().then(setCategories).catch(() => {});
  }, []);

  // Sync the online toggle with the saved availability once the profile loads.
  useEffect(() => {
    if (provider) setIsOnline(!!provider.isAvailable);
  }, [provider]);

  const toggleOnline = async () => {
    const next = !isOnline;
    setTogglingOnline(true);
    try {
      await setMyAvailability(next);
      setIsOnline(next);
      toast(
        next ? 'You are online — customers can now see you on the live map' : 'You are now offline',
        next ? 'success' : 'info'
      );
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setTogglingOnline(false);
    }
  };

  // While online, broadcast live GPS every 8s so customers see us on the nearby map.
  useEffect(() => {
    if (!isOnline || !navigator.geolocation) return undefined;
    let cancelled = false;
    const push = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          pingMyLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 8000, timeout: 8000 }
      );
    };
    push();
    const id = setInterval(push, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isOnline]);

  const handleAction = async (id, status) => {
    setActionLoading(id + status);
    try {
      await updateBookingStatus(id, status);
      toast(`Booking ${status}`, 'success');
      loadBookings();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pending = bookings.filter((b) => b.status === 'pending').length;
  const accepted = bookings.filter((b) => b.status === 'accepted').length;
  const completed = bookings.filter((b) => ['completed', 'reviewed'].includes(b.status)).length;
  const ratings = bookings.flatMap((b) => b.review ? [b.review.rating] : []);
  const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : '—';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-ha-bg min-h-screen">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ha-text-1 font-display">Provider Dashboard</h1>
          <p className="text-ha-text-3 mt-1">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        <button
          onClick={toggleOnline}
          disabled={togglingOnline}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
            isOnline
              ? 'border-ha-primary/30 bg-ha-primary/10 text-ha-primary'
              : 'border-ha-border bg-ha-surface text-ha-text-3 hover:text-ha-text-2'
          }`}
          title="When online, you share live GPS and appear on the customer nearby map"
        >
          <span className="relative flex h-2.5 w-2.5">
            {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ha-primary opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-ha-primary' : 'bg-ha-text-3'}`} />
          </span>
          {isOnline ? 'Online — visible on map' : 'Go online'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={pending} borderColor="border-l-ha-accent" />
        <StatCard label="Upcoming" value={accepted} borderColor="border-l-ha-teal" />
        <StatCard label="Completed" value={completed} borderColor="border-l-ha-primary" />
        <StatCard label="Avg Rating" value={avgRating} borderColor="border-l-ha-accent" />
      </div>

      <div className="flex gap-1 bg-ha-surface border border-ha-border p-1 rounded-xl mb-6 overflow-x-auto">
        {MAIN_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-[4px] text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === t.key ? 'bg-ha-surface-2 text-ha-text-1' : 'text-ha-text-3 hover:text-ha-text-2'
            }`}
          >
            {t.label}
            {t.key === 'bookings' && pending > 0 && (
              <span className="ml-1.5 bg-ha-danger text-ha-text-1 text-xs rounded-full px-1.5 py-0.5">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && (
        <BookingsTab bookings={bookings} loading={loadingBookings} onAction={handleAction} actionLoading={actionLoading} />
      )}
      {activeTab === 'wallet' && <WalletTab />}
      {activeTab === 'profile' && (
        loadingProfile ? <Skeleton className="h-80 rounded-xl" /> : <ProfileTab provider={provider} onSaved={loadProfile} />
      )}
      {activeTab === 'services' && (
        loadingProfile ? <Skeleton className="h-80 rounded-xl" /> : <ServicesTab provider={provider} categories={categories} onSaved={loadProfile} />
      )}
      {activeTab === 'availability' && (
        loadingProfile ? <Skeleton className="h-80 rounded-xl" /> : <AvailabilityTab provider={provider} onSaved={loadProfile} />
      )}
    </div>
  );
}
