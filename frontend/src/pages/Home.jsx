import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../api/categories';
import { getProviders } from '../api/providers';
import CategoryGrid from '../components/shared/CategoryGrid';
import ProviderCard from '../components/shared/ProviderCard';
import AIAssistant from '../components/shared/AIAssistant';
import { ProviderCardSkeleton } from '../components/ui/Skeleton';

const STATS = [
  { label: 'Verified Providers', value: '200+' },
  { label: 'Cities Covered', value: '3' },
  { label: 'Services Completed', value: '5,000+' },
  { label: 'Happy Customers', value: '4,800+' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Describe Your Problem',
    desc: 'Tell us what you need — use our AI assistant or browse service categories.',
    icon: '💬',
  },
  {
    step: '02',
    title: 'Choose a Professional',
    desc: 'Compare verified providers by rating, price, and availability.',
    icon: '🔍',
  },
  {
    step: '03',
    title: 'Book & Relax',
    desc: 'Confirm your booking and let the expert handle the rest.',
    icon: '✅',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [featuredProviders, setFeaturedProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getProviders({ sort: 'rating', limit: 6 })
      .then((d) => setFeaturedProviders(d.providers || []))
      .catch(() => {})
      .finally(() => setLoadingProviders(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
              Find Trusted Home Service Professionals
            </h1>
            <p className="text-lg sm:text-xl text-indigo-200 mb-8">
              Plumbers, electricians, cleaners & more — verified, rated, and ready to help.
            </p>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services or location..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors whitespace-nowrap"
              >
                Search
              </button>
            </form>

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['Plumber', 'Electrician', 'Cleaning', 'AC Repair', 'Painter'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => navigate(`/search?q=${tag}`)}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-sm rounded-full transition-colors backdrop-blur-sm border border-white/20"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Browse by Service</h2>
            <p className="mt-2 text-gray-500">Find the right professional for every home need</p>
          </div>
          <CategoryGrid categories={categories} />
        </div>
      </section>

      {/* AI Assistant */}
      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Not Sure What You Need?</h2>
            <p className="mt-2 text-gray-500">Describe your problem and our AI will find the right professional for you</p>
          </div>
          <AIAssistant />
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-2 text-gray-500">Get help in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-xs font-bold text-indigo-600 mb-1">STEP {item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Providers */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Top-Rated Providers</h2>
              <p className="mt-1 text-gray-500">Trusted by hundreds of happy customers</p>
            </div>
            <button
              onClick={() => navigate('/search')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingProviders
              ? Array.from({ length: 6 }).map((_, i) => <ProviderCardSkeleton key={i} />)
              : featuredProviders.map((p) => <ProviderCard key={p.id} provider={p} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Are You a Service Professional?
          </h2>
          <p className="text-indigo-200 mb-6">
            Join HomeAssist and connect with hundreds of customers in your area. Get verified and start earning.
          </p>
          <button
            onClick={() => navigate('/register?role=provider')}
            className="inline-flex items-center px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Register as a Provider
          </button>
        </div>
      </section>
    </div>
  );
}
