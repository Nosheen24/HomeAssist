import { useState, useEffect } from 'react';
import { get, patch } from '../api/client';
import { getPaymentStats } from '../api/payments';
import { useToast } from '../components/ui/Toast';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import Skeleton from '../components/ui/Skeleton';

const money = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

const TXN_STATUS_CLS = {
  held:     'bg-ha-accent/10 text-ha-accent border-ha-accent/30',
  released: 'bg-ha-teal/10 text-ha-teal border-ha-teal/30',
  refunded: 'bg-ha-danger/10 text-ha-danger border-ha-danger/30',
};

function StatCard({ label, value, sub, accentColor }) {
  return (
    <div className={`bg-ha-surface rounded-xl border border-ha-border p-5 border-l-4 ${accentColor || 'border-l-ha-primary'}`}>
      <p className="text-3xl font-bold text-ha-primary font-mono">{value}</p>
      <p className="text-sm font-medium text-ha-text-2 mt-1">{label}</p>
      {sub && <p className="text-xs text-ha-text-3 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Admin() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState(null);
  const [unverified, setUnverified] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [activeCnicImage, setActiveCnicImage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsData, paymentsData, unverifiedData] = await Promise.all([
        get('/admin/stats'),
        getPaymentStats(),
        get('/admin/providers/unverified'),
      ]);
      setStats(statsData);
      setPayments(paymentsData);
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-ha-bg min-h-screen">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-ha-bg min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ha-text-1 font-display">Admin Dashboard</h1>
        <p className="text-ha-text-3 mt-1">Platform overview and provider management</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users" value={stats.users.total} accentColor="border-l-ha-teal" />
          <StatCard label="Providers" value={stats.providers.total} sub={`${stats.providers.verified} verified`} accentColor="border-l-ha-primary" />
          <StatCard label="Total Bookings" value={stats.bookings.total} sub={`${stats.bookings.pending} pending`} accentColor="border-l-ha-accent" />
          <StatCard label="Reviews" value={stats.reviews.total} sub={`${stats.bookings.completed} completed`} accentColor="border-l-ha-primary" />
        </div>
      )}

      {/* ─── Escrow & Commission ─────────────────────────────────────────── */}
      {payments && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-ha-text-1 font-display mb-3">Escrow & Commission</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <StatCard label="Total Revenue" value={money(payments.totalRevenue)} accentColor="border-l-ha-teal" />
            <StatCard label="Platform Commission" value={money(payments.totalCommission)} sub="15% of revenue" accentColor="border-l-ha-primary" />
            <StatCard label="Total Payouts" value={money(payments.totalPayouts)} sub="released to providers" accentColor="border-l-ha-accent" />
            <StatCard label="Transactions" value={payments.transactionCount} accentColor="border-l-ha-primary" />
          </div>

          <div className="bg-ha-surface rounded-xl border border-ha-border overflow-hidden">
            <div className="px-6 py-4 border-b border-ha-border">
              <h3 className="font-semibold text-ha-text-1">All Transactions</h3>
            </div>
            {payments.transactions.length === 0 ? (
              <div className="text-center py-10 text-sm text-ha-text-3">No transactions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ha-text-3 border-b border-ha-border bg-ha-surface-2">
                      <th className="px-4 py-2.5 font-medium">Customer</th>
                      <th className="px-4 py-2.5 font-medium">Provider</th>
                      <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                      <th className="px-4 py-2.5 font-medium text-right">Commission</th>
                      <th className="px-4 py-2.5 font-medium text-right">Payout</th>
                      <th className="px-4 py-2.5 font-medium">Method</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ha-border">
                    {payments.transactions.map((t) => (
                      <tr key={t.id} className="text-ha-text-2">
                        <td className="px-4 py-2.5 text-ha-text-1">{t.customerName || '—'}</td>
                        <td className="px-4 py-2.5">{t.providerName || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{money(t.amount)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-ha-primary">{money(t.commission)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-ha-teal">{money(t.providerPayout)}</td>
                        <td className="px-4 py-2.5 capitalize">{t.method}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium rounded-full px-2.5 py-1 border ${TXN_STATUS_CLS[t.status] || ''}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-ha-text-3">
                          {new Date(t.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-ha-surface rounded-xl border border-ha-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ha-border">
          <h2 className="font-semibold text-ha-text-1">Provider Verification Queue</h2>
          {unverified.length > 0 && (
            <Badge variant="yellow">{unverified.length} pending</Badge>
          )}
        </div>

        {unverified.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm font-medium text-ha-text-1">All providers are verified</p>
            <p className="text-xs text-ha-text-3 mt-1">No pending verification requests</p>
          </div>
        ) : (
          <div className="divide-y divide-ha-border">
            {unverified.map((provider) => (
              <div key={provider.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-ha-text-1">{provider.user?.name}</p>
                    <Badge variant="default">Unverified</Badge>
                  </div>
                  <p className="text-sm text-ha-text-3 mt-0.5">{provider.user?.email}</p>
                  {provider.user?.phone && <p className="text-xs text-ha-text-3">{provider.user.phone}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={provider.avgRating} size="sm" />
                    <span className="text-xs text-ha-text-3">{provider.user?.location}</span>
                  </div>

                  {provider.cnicNumber && (
                    <div className="mt-3 bg-ha-surface-2 rounded-xl p-3 border border-ha-border max-w-md">
                      <p className="text-xs font-semibold text-ha-text-3">CNIC Verification Details</p>
                      <p className="text-sm font-bold text-ha-text-1 mt-0.5 font-mono">💳 {provider.cnicNumber}</p>
                      <div className="flex gap-3 mt-2">
                        {provider.cnicFront ? (
                          <div
                            onClick={() => setActiveCnicImage({ url: provider.cnicFront, title: `CNIC Front — ${provider.user?.name}` })}
                            className="w-24 h-16 border border-ha-border rounded-lg overflow-hidden bg-ha-bg hover:border-ha-primary transition-colors cursor-pointer relative group flex items-center justify-center"
                          >
                            <img src={provider.cnicFront} alt="CNIC Front" className="object-cover w-full h-full" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-ha-text-1 text-[9px] font-semibold">
                              View Front
                            </div>
                          </div>
                        ) : (
                          <div className="w-24 h-16 border border-dashed border-ha-border rounded-lg bg-ha-bg flex items-center justify-center text-[10px] text-ha-text-3">
                            No Front
                          </div>
                        )}

                        {provider.cnicBack ? (
                          <div
                            onClick={() => setActiveCnicImage({ url: provider.cnicBack, title: `CNIC Back — ${provider.user?.name}` })}
                            className="w-24 h-16 border border-ha-border rounded-lg overflow-hidden bg-ha-bg hover:border-ha-primary transition-colors cursor-pointer relative group flex items-center justify-center"
                          >
                            <img src={provider.cnicBack} alt="CNIC Back" className="object-cover w-full h-full" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-ha-text-1 text-[9px] font-semibold">
                              View Back
                            </div>
                          </div>
                        ) : (
                          <div className="w-24 h-16 border border-dashed border-ha-border rounded-lg bg-ha-bg flex items-center justify-center text-[10px] text-ha-text-3">
                            No Back
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {provider.services?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {provider.services.map((svc) => (
                        <span key={svc.id} className="text-xs bg-ha-surface-2 text-ha-text-3 border border-ha-border px-2 py-0.5 rounded-full">
                          {svc.category?.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-ha-text-3 mt-1">
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

      {activeCnicImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setActiveCnicImage(null)}
        >
          <div
            className="bg-ha-surface rounded-2xl border border-ha-border max-w-2xl w-full p-4 relative flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center w-full border-b border-ha-border pb-3">
              <h3 className="font-semibold text-ha-text-1">{activeCnicImage.title}</h3>
              <button
                onClick={() => setActiveCnicImage(null)}
                className="text-ha-text-3 hover:text-ha-text-1 text-lg font-bold p-1 transition-colors"
              >✕</button>
            </div>
            <div className="w-full flex justify-center items-center overflow-auto max-h-[70vh]">
              {activeCnicImage.url ? (
                <img src={activeCnicImage.url} alt={activeCnicImage.title} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
              ) : (
                <div className="text-ha-text-3 py-12">No image uploaded</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
