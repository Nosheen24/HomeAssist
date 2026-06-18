import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProviders } from '../api/providers';
import { getCategories } from '../api/categories';
import ProviderCard from '../components/shared/ProviderCard';
import { ProviderCardSkeleton } from '../components/ui/Skeleton';
import Button from '../components/ui/Button';

const inputCls = 'w-full rounded-[6px] border border-ha-border bg-ha-bg px-3 py-2 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary transition-colors';
const selectCls = `${inputCls} cursor-pointer`;
const labelCls = 'block text-[13px] font-medium text-ha-text-2';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    category:  searchParams.get('category') || '',
    location:  searchParams.get('location') || '',
    minRating: searchParams.get('minRating') || '',
    maxPrice:  searchParams.get('maxPrice') || '',
    sort:      searchParams.get('sort') || 'rating',
    page:      parseInt(searchParams.get('page') || '1'),
  });

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProviders(filters);
      setProviders(data.providers || []);
      setPagination(data.pagination || { total: 0, pages: 1, page: 1 });
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProviders();
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = String(v); });
    setSearchParams(params, { replace: true });
  }, [filters, fetchProviders, setSearchParams]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : value }));
  };

  const clearAll = () => setFilters({ category: '', location: '', minRating: '', maxPrice: '', sort: 'rating', page: 1 });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-ha-bg min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ha-text-1 font-display">Find Service Providers</h1>
        <p className="text-ha-text-3 mt-1">
          {loading ? 'Searching...' : `${pagination.total} provider${pagination.total !== 1 ? 's' : ''} found`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-ha-surface rounded-xl border border-ha-border p-5 space-y-5 sticky top-20">
            <h2 className="font-semibold text-ha-text-1">Filters</h2>

            <div className="space-y-1">
              <label className={labelCls}>Service Category</label>
              <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} className={selectCls}>
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>City / Location</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                placeholder="e.g. Lahore"
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Minimum Rating</label>
              <select value={filters.minRating} onChange={(e) => updateFilter('minRating', e.target.value)} className={selectCls}>
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ ⭐</option>
                <option value="4">4.0+ ⭐</option>
                <option value="3.5">3.5+ ⭐</option>
                <option value="3">3.0+ ⭐</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Max Price (PKR)</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                placeholder="e.g. 5000"
                min="0"
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Sort By</label>
              <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)} className={selectCls}>
                <option value="rating">Highest Rated</option>
                <option value="reviews">Most Reviews</option>
              </select>
            </div>

            <button
              onClick={clearAll}
              className="w-full text-sm text-ha-text-3 hover:text-ha-primary transition-colors text-left"
            >
              Clear all filters
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <ProviderCardSkeleton key={i} />)}
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-20 bg-ha-surface rounded-xl border border-ha-border">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-ha-text-1 mb-2">No providers found</h3>
              <p className="text-ha-text-3 text-sm">Try adjusting your filters or search in a different city.</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={clearAll}>
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {providers.map((p) => <ProviderCard key={p.id} provider={p} />)}
              </div>

              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button variant="secondary" size="sm" disabled={filters.page <= 1} onClick={() => updateFilter('page', filters.page - 1)}>
                    Previous
                  </Button>
                  <span className="text-sm text-ha-text-2 px-3 font-mono">
                    {filters.page} / {pagination.pages}
                  </span>
                  <Button variant="secondary" size="sm" disabled={filters.page >= pagination.pages} onClick={() => updateFilter('page', filters.page + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
