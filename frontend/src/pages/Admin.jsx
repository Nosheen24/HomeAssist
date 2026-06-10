import { useState, useEffect } from 'react';
import { get, patch } from '../api/client';
import { useToast } from '../components/ui/Toast';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import Skeleton from '../components/ui/Skeleton';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {color && <div className={`mt-3 h-1 rounded-full ${color}`} />}
    </div>
  );
}

export default function Admin() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [unverified, setUnverified] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsData, unverifiedData] = await Promise.all([
        get('/admin/stats'),
        get('/admin/providers/unverified'),
      ]);
      setStats(statsData);
      setUnverified(unverifiedData);
    } catch (err) {
      toast(err.message || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (id) => {
    setVerifying(id);
    try {
      await patch(`/admin/providers/${id}/verify`);
      toast('Provider verified!', 'success');
      setUnverified((prev) => prev.filter((p) => p.id !== id));
      setStats((prev) => prev ? {
        ...prev,
        providers: { ...prev.providers, verified: prev.providers.verified + 1 },
      } : prev);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and provider management</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Users"
            value={stats.users.total}
            color="bg-indigo-400"
          />
          <StatCard
            label="Providers"
            value={stats.providers.total}
            sub={`${stats.providers.verified} verified`}
            color="bg-green-400"
          />
          <StatCard
            label="Total Bookings"
            value={stats.bookings.total}
            sub={`${stats.bookings.pending} pending`}
            color="bg-yellow-400"
          />
          <StatCard
            label="Reviews"
            value={stats.reviews.total}
            sub={`${stats.bookings.completed} completed`}
            color="bg-purple-400"
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Provider Verification Queue</h2>
          {unverified.length > 0 && (
            <Badge variant="yellow">{unverified.length} pending</Badge>
          )}
        </div>

        {unverified.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm font-medium text-gray-700">All providers are verified</p>
            <p className="text-xs text-gray-400 mt-1">No pending verification requests</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {unverified.map((provider) => (
              <div key={provider.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{provider.user?.name}</p>
                    <Badge variant="default">Unverified</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{provider.user?.email}</p>
                  {provider.user?.phone && (
                    <p className="text-xs text-gray-400">{provider.user.phone}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={provider.avgRating} size="sm" />
                    <span className="text-xs text-gray-500">
                      {provider.user?.location}
                    </span>
                  </div>
                  {provider.services?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {provider.services.map((svc) => (
                        <span key={svc.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {svc.category?.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Registered {new Date(provider.user?.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="success"
                  loading={verifying === provider.id}
                  onClick={() => handleVerify(provider.id)}
                  className="flex-shrink-0"
                >
                  Verify
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
