import { useState, useEffect } from 'react';
import { getProviderBookings, updateBookingStatus } from '../api/bookings';
import {
  getMyProviderProfile,
  updateProviderProfile,
  addProviderService,
  deleteProviderService,
  updateAvailability,
} from '../api/providers';
import { getCategories } from '../api/categories';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import Skeleton from '../components/ui/Skeleton';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
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
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProviderProfile(provider.id, {
        bio: form.bio,
        experienceYears: parseInt(form.experienceYears),
        serviceArea: form.serviceArea,
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
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="h-14 w-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {provider?.user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{provider?.user?.name}</p>
          <p className="text-sm text-gray-500">{provider?.user?.email}</p>
          <div className="mt-1">
            {provider?.isVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                ✓ Verified Provider
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                ⏳ Pending Verification
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Bio / About You</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={4}
            placeholder="Describe your skills, experience, and what makes you the best choice..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
            <input
              type="number"
              min="0"
              max="50"
              value={form.experienceYears}
              onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Service Area</label>
            <input
              type="text"
              value={form.serviceArea}
              onChange={(e) => setForm((f) => ({ ...f, serviceArea: e.target.value }))}
              placeholder="e.g. Lahore, DHA, Gulberg"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <Button type="submit" loading={saving} size="md">
          Save Profile
        </Button>
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
    if (!form.categoryId || !form.title || !form.price) {
      toast('Fill in all fields', 'error');
      return;
    }
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
      {/* Current services */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Your Services</h3>
          <span className="text-sm text-gray-400">{provider?.services?.length || 0} services</span>
        </div>
        {provider?.services?.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No services yet — add your first one below.
          </div>
        ) : (
          provider?.services?.map((svc) => (
            <div key={svc.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{svc.title}</p>
                <p className="text-xs text-gray-500">{svc.category?.name} · PKR {Number(svc.price).toLocaleString()} / {svc.priceUnit}</p>
              </div>
              <button
                onClick={() => handleDelete(svc.id)}
                disabled={deleting === svc.id}
                className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
              >
                {deleting === svc.id ? '...' : 'Remove'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add service form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Add a New Service</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Price Unit</label>
              <select
                value={form.priceUnit}
                onChange={(e) => setForm((f) => ({ ...f, priceUnit: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="fixed">Fixed</option>
                <option value="per hour">Per Hour</option>
                <option value="per visit">Per Visit</option>
                <option value="per room">Per Room</option>
                <option value="per piece">Per Piece</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Service Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Pipe Leak Repair, AC General Service"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Price (PKR)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="e.g. 1500"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit" loading={adding} size="md">
            Add Service
          </Button>
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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-900">Working Hours</h3>
        <p className="text-xs text-gray-400">Check the days you're available</p>
      </div>
      <div className="space-y-3">
        {DAYS.map((day, i) => (
          <div key={day} className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${slots[i].enabled ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-200 bg-gray-50'}`}>
            <input
              type="checkbox"
              id={`day-${i}`}
              checked={slots[i].enabled}
              onChange={() => toggle(i)}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
            />
            <label htmlFor={`day-${i}`} className={`w-24 text-sm font-medium cursor-pointer ${slots[i].enabled ? 'text-gray-900' : 'text-gray-400'}`}>
              {day}
            </label>
            {slots[i].enabled ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={slots[i].startTime}
                  onChange={(e) => setTime(i, 'startTime', e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="time"
                  value={slots[i].endTime}
                  onChange={(e) => setTime(i, 'endTime', e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <span className="text-sm text-gray-400 flex-1">Not available</span>
            )}
          </div>
        ))}
      </div>
      <Button className="mt-5" loading={saving} onClick={handleSave}>
        Save Availability
      </Button>
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
  const currentStatuses = BOOKING_TABS.find((t) => t.key === tab)?.statuses || [];
  const filtered = bookings.filter((b) => currentStatuses.includes(b.status));

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {BOOKING_TABS.map((t) => {
          const count = bookings.filter((b) => t.statuses.includes(b.status)).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(' ')[0]}</span>
              {count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-gray-200">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm text-gray-500">No bookings here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const { label, variant } = statusBadge(b.status);
            const scheduledDate = new Date(b.scheduledAt);
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{b.service?.title}</p>
                    <p className="text-sm text-gray-600">{b.customer?.name}</p>
                    {b.customer?.phone && <p className="text-xs text-gray-400">{b.customer.phone}</p>}
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                  <span>📅 {scheduledDate.toLocaleDateString('en-PK', { dateStyle: 'medium' })}</span>
                  <span>🕐 {scheduledDate.toLocaleTimeString('en-PK', { timeStyle: 'short' })}</span>
                  <span className="col-span-2">📍 {b.address}</span>
                  {b.problemDescription && (
                    <span className="col-span-2 text-gray-600 italic">"{b.problemDescription}"</span>
                  )}
                </div>
                {b.review && (
                  <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded-lg px-3 py-2">
                    <StarRating rating={b.review.rating} size="sm" />
                    {b.review.comment && <span className="text-xs text-gray-600">"{b.review.comment}"</span>}
                  </div>
                )}
                {b.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" className="flex-1"
                      loading={actionLoading === b.id + 'accepted'}
                      onClick={() => onAction(b.id, 'accepted')}>Accept</Button>
                    <Button size="sm" variant="danger" className="flex-1"
                      loading={actionLoading === b.id + 'declined'}
                      onClick={() => onAction(b.id, 'declined')}>Decline</Button>
                  </div>
                )}
                {b.status === 'accepted' && (
                  <Button size="sm" className="w-full"
                    loading={actionLoading === b.id + 'completed'}
                    onClick={() => onAction(b.id, 'completed')}>Mark as Completed</Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const MAIN_TABS = [
  { key: 'bookings', label: '📋 Bookings' },
  { key: 'profile', label: '👤 Profile' },
  { key: 'services', label: '🔧 Services' },
  { key: 'availability', label: '📅 Availability' },
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name?.split(' ')[0]}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={pending} icon="📬" color="bg-yellow-50" />
        <StatCard label="Upcoming" value={accepted} icon="📅" color="bg-blue-50" />
        <StatCard label="Completed" value={completed} icon="✅" color="bg-green-50" />
        <StatCard label="Avg Rating" value={avgRating} icon="⭐" color="bg-indigo-50" />
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {MAIN_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'bookings' && pending > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'bookings' && (
        <BookingsTab
          bookings={bookings}
          loading={loadingBookings}
          onAction={handleAction}
          actionLoading={actionLoading}
        />
      )}

      {activeTab === 'profile' && (
        loadingProfile ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : (
          <ProfileTab provider={provider} onSaved={loadProfile} />
        )
      )}

      {activeTab === 'services' && (
        loadingProfile ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : (
          <ServicesTab provider={provider} categories={categories} onSaved={loadProfile} />
        )
      )}

      {activeTab === 'availability' && (
        loadingProfile ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : (
          <AvailabilityTab provider={provider} onSaved={loadProfile} />
        )
      )}
    </div>
  );
}
