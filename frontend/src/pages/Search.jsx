import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProviders } from '../api/providers';
import { getCategories } from '../api/categories';
import ProviderCard from '../components/shared/ProviderCard';
import { ProviderCardSkeleton } from '../components/ui/Skeleton';
import Button from '../components/ui/Button';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    location: searchParams.get('location') || '',
    minRating: searchParams.get('minRating') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'rating',
    page: parseInt(searchParams.get('page') || '1'),
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Service Providers</h1>
        <p className="text-gray-500 mt-1">
          {loading ? 'Searching...' : `${pagination.total} provider${pagination.total !== 1 ? 's' : ''} found`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5 sticky top-20">
            <h2 className="font-semibold text-gray-900">Filters</h2>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Service Category</label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">City / Location</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                placeholder="e.g. Lahore"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Minimum Rating</label>
              <select
                value={filters.minRating}
                onChange={(e) => updateFilter('minRating', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ ⭐</option>
                <option value="4">4.0+ ⭐</option>
                <option value="3.5">3.5+ ⭐</option>
                <option value="3">3.0+ ⭐</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Max Price (PKR)</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                placeholder="e.g. 5000"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Sort By</label>
              <select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="rating">Highest Rated</option>
                <option value="reviews">Most Reviews</option>
              </select>
            </div>

            <button
              onClick={() => setFilters({ category: '', location: '', minRating: '', maxPrice: '', sort: 'rating', page: 1 })}
              className="w-full text-sm text-gray-500 hover:text-indigo-600 transition-colors text-left"
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
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No providers found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your filters or search in a different city.</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setFilters({ category: '', location: '', minRating: '', maxPrice: '', sort: 'rating', page: 1 })}
              >
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
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() => updateFilter('page', filters.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 px-3">
                    Page {filters.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={filters.page >= pagination.pages}
                    onClick={() => updateFilter('page', filters.page + 1)}
                  >
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
