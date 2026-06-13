import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCategories } from '../api/categories';
import { getProviders } from '../api/providers';
import ProviderCard from '../components/shared/ProviderCard';
import { ProviderCardSkeleton } from '../components/ui/Skeleton';

// ─── Data ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '200+', label: 'Verified Professionals' },
  { value: '4,800+', label: 'Happy Customers' },
  { value: '3', label: 'Major Cities' },
  { value: '4.8★', label: 'Average Rating' },
];

const HOW_IT_WORKS = [
  { icon: '💬', step: '01', title: 'Describe Your Problem', desc: 'Tell our AI assistant what you need or browse by service category.' },
  { icon: '🔍', step: '02', title: 'Pick a Professional', desc: 'Compare ratings, prices, and availability. Read real customer reviews.' },
  { icon: '✅', step: '03', title: 'Book & Relax', desc: 'Confirm your slot, get a reminder, and let the expert handle the rest.' },
];

const TESTIMONIALS = [
  { name: 'Sara Qureshi', city: 'Lahore', rating: 5, avatar: 'S', color: 'bg-pink-100 text-pink-700', text: 'Found an amazing electrician within minutes. He fixed our entire wiring issue same day. HomeAssist is a lifesaver!' },
  { name: 'Hamza Farooq', city: 'Karachi', rating: 5, avatar: 'H', color: 'bg-blue-100 text-blue-700', text: 'Booked a deep cleaning service for our apartment. The team was professional, punctual, and thorough. Will definitely use again.' },
  { name: 'Ayesha Noor', city: 'Islamabad', rating: 5, avatar: 'A', color: 'bg-emerald-100 text-emerald-700', text: 'The AI assistant recommended exactly the right AC technician. He arrived on time and the pricing was very fair. Highly recommend!' },
];

const CATEGORY_META = {
  plumbing:         { icon: '🔧', color: 'from-blue-500 to-cyan-500' },
  electrical:       { icon: '⚡', color: 'from-yellow-500 to-amber-500' },
  cleaning:         { icon: '🧹', color: 'from-green-500 to-emerald-500' },
  carpentry:        { icon: '🪚', color: 'from-amber-600 to-orange-500' },
  'ac-repair':      { icon: '❄️', color: 'from-cyan-500 to-blue-500' },
  painting:         { icon: '🎨', color: 'from-purple-500 to-violet-500' },
  'appliance-repair':{ icon: '🔌', color: 'from-orange-500 to-red-500' },
  gardening:        { icon: '🌿', color: 'from-green-600 to-teal-500' },
};

// ─── Floating Hero Card ───────────────────────────────────────────────────────
function FloatingCard({ name, service, rating, city, delay = '0s' }) {
  return (
    <div
      className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 p-4 w-56"
      style={{ animation: `float 6s ease-in-out ${delay} infinite` }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
          {name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{service}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className={`h-3 w-3 ${i < rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {city}
        </span>
      </div>
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────
function CategoryCard({ category }) {
  const navigate = useNavigate();
  const meta = CATEGORY_META[category.slug] || { icon: '🏠', color: 'from-gray-500 to-gray-600' };
  return (
    <button
      onClick={() => navigate(`/search?category=${category.slug}`)}
      className="group relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-5 text-left hover:shadow-lg hover:border-transparent hover:-translate-y-1 transition-all duration-300"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color} text-2xl mb-3 shadow-lg`}>
        {meta.icon}
      </div>
      <p className="font-semibold text-gray-900 text-sm">{category.name}</p>
      <p className="text-xs text-gray-400 mt-0.5 group-hover:text-indigo-500 transition-colors">Browse →</p>
    </button>
  );
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────
function TestimonialCard({ testimonial }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex gap-0.5 mb-4">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-gray-700 text-sm leading-relaxed mb-4">"{testimonial.text}"</p>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${testimonial.color}`}>
          {testimonial.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
          <p className="text-xs text-gray-400">{testimonial.city}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getProviders({ sort: 'rating', limit: 6 })
      .then((d) => setProviders(d.providers || []))
      .catch(() => {})
      .finally(() => setLoadingProviders(false));
  }, []);

  return (
    <div className="bg-white">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(10px); }
        }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center" style={{background: 'linear-gradient(135deg, #0f0c29 0%, #1a1050 40%, #2d1b69 70%, #1e1347 100%)'}}>
        {/* Glowing orbs */}
        <div className="absolute -top-60 -right-60 h-[600px] w-[600px] rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-60 -left-40 h-[500px] w-[500px] rounded-full bg-purple-700/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 h-[300px] w-[300px] rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />

        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px'}} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — content */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 text-sm text-white/90 mb-8">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
                AI-Powered Service Matching
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
                Your Home,<br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Expertly Cared
                </span>
                <br />For.
              </h1>

              <p className="text-lg text-indigo-200/90 mb-10 max-w-lg leading-relaxed">
                Pakistan's smartest platform for finding verified plumbers, electricians, cleaners, and more. AI-matched to your exact problem.
              </p>

              {/* Search bar */}
              <form
                onSubmit={(e) => { e.preventDefault(); navigate(query.trim() ? `/search?q=${encodeURIComponent(query)}` : '/search'); }}
                className="bg-white rounded-2xl p-2 flex gap-2 max-w-lg shadow-2xl shadow-indigo-950/60 mb-6"
              >
                <div className="flex-1 flex items-center gap-2 px-3">
                  <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Leaking pipe, AC repair, deep cleaning..."
                    className="flex-1 text-gray-900 placeholder-gray-400 text-sm focus:outline-none py-1.5"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors whitespace-nowrap"
                >
                  Find Help
                </button>
              </form>

              {/* Quick tags */}
              <div className="flex flex-wrap gap-2">
                <span className="text-indigo-300/70 text-xs font-medium self-center">Popular:</span>
                {['Plumber', 'Electrician', 'AC Repair', 'Cleaning', 'Painter'].map((t) => (
                  <button
                    key={t}
                    onClick={() => navigate(`/search?q=${t}`)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/90 text-xs font-medium rounded-full border border-white/15 transition-colors backdrop-blur-sm"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-10 pt-8 border-t border-white/10">
                {[
                  { icon: '🛡️', text: 'Verified Pros' },
                  { icon: '⚡', text: 'Same-Day Service' },
                  { icon: '💬', text: 'AI-Powered Match' },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-2">
                    <span className="text-lg">{b.icon}</span>
                    <span className="text-xs text-indigo-300/80 font-medium">{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — floating provider cards */}
            <div className="relative hidden lg:flex items-center justify-center h-[480px]">
              {/* Central glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
              </div>

              {/* Floating cards */}
              <div className="relative w-full h-full">
                <div className="absolute top-0 right-8" style={{animation: 'float 6s ease-in-out 0s infinite'}}>
                  <FloatingCard name="Ahmed Hassan" service="Plumbing Expert" rating={5} city="Lahore" />
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 left-0" style={{animation: 'float 6s ease-in-out 1.5s infinite'}}>
                  <FloatingCard name="Fatima Malik" service="Home Cleaning" rating={5} city="Karachi" />
                </div>
                <div className="absolute bottom-4 right-16" style={{animation: 'float 6s ease-in-out 3s infinite'}}>
                  <FloatingCard name="Tariq Mehmood" service="AC Technician" rating={5} city="Islamabad" />
                </div>

                {/* Booking confirmed badge */}
                <div className="absolute top-1/3 right-0 bg-green-500 text-white rounded-xl px-3 py-2 shadow-xl text-xs font-semibold flex items-center gap-2" style={{animation: 'float 6s ease-in-out 2s infinite'}}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Booking Confirmed!
                </div>

                {/* Rating badge */}
                <div className="absolute bottom-1/3 left-10 bg-white rounded-xl px-3 py-2 shadow-xl flex items-center gap-2" style={{animation: 'float 6s ease-in-out 4s infinite'}}>
                  <span className="text-yellow-400 text-sm">★★★★★</span>
                  <span className="text-xs font-bold text-gray-800">4.9 Rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 30C1200 60 960 0 720 20C480 40 240 0 0 30L0 60Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="bg-white py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center group">
                <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
                  {s.value}
                </div>
                <div className="text-sm text-gray-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITIES STRIP ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-indigo-50 to-purple-50 border-y border-indigo-100 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-indigo-700 font-medium">
            <span className="text-gray-400 text-xs">NOW SERVING</span>
            {['🏙️ Lahore', '🌊 Karachi', '🏛️ Islamabad'].map((city) => (
              <span key={city} className="flex items-center gap-1.5 bg-white border border-indigo-100 rounded-full px-4 py-1.5 shadow-sm">
                {city}
              </span>
            ))}
            <span className="text-gray-400 text-xs">MORE CITIES COMING SOON</span>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">Services</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2 mb-3">
              Every Home Need, Covered
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              From emergency repairs to routine maintenance — find the right expert in minutes.
            </p>
          </div>
          {categories.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {categories.map((cat) => <CategoryCard key={cat.id} category={cat} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">Process</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2 mb-3">
              Help in 3 Simple Steps
            </h2>
            <p className="text-gray-500">No hassle. No phone calls. Just fast, reliable service.</p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-200" />

            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="relative text-center group">
                <div className="relative inline-flex mb-5">
                  <div className="h-24 w-24 rounded-2xl bg-white border-2 border-indigo-100 group-hover:border-indigo-400 transition-colors shadow-md flex items-center justify-center text-4xl">
                    {item.icon}
                  </div>
                  <span className="absolute -top-2 -right-2 h-7 w-7 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-600/25"
            >
              Get Started Now
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── AI FEATURE ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl overflow-hidden p-8 sm:p-12 lg:p-16">
            {/* Background orbs */}
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-900/30 blur-2xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="text-white">
                <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Powered by AI
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
                  Not Sure What<br />Service You Need?
                </h2>
                <p className="text-indigo-200 text-lg leading-relaxed mb-6">
                  Just describe your problem in plain language. Our AI instantly classifies it, estimates urgency, and matches you with the best professionals in your area.
                </p>
                <div className="space-y-3">
                  {['Understands Urdu & English descriptions', 'Ranks by urgency — emergency to routine', 'Shows top-rated nearby providers'].map((feat) => (
                    <div key={feat} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-indigo-100 text-sm">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Demo widget */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="text-white/50 text-xs ml-2">AI Assistant</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-xl p-3 text-sm text-white/80 italic">
                    "My kitchen tap is leaking badly and water is dripping on the floor..."
                  </div>
                  <div className="flex items-center gap-2 text-xs text-indigo-200">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 bg-indigo-300 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                      <div className="h-1.5 w-1.5 bg-indigo-300 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                      <div className="h-1.5 w-1.5 bg-indigo-300 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                    </div>
                    Analyzing problem...
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span className="bg-orange-400/20 text-orange-300 text-xs px-2 py-0.5 rounded-full font-medium">High Priority</span>
                      <span className="bg-blue-400/20 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">Plumbing</span>
                    </div>
                    <p className="text-xs text-white/70">Found 5 verified plumbers near you ↓</p>
                    <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-400/30 flex items-center justify-center text-sm font-bold text-white">A</div>
                      <div className="flex-1">
                        <p className="text-white text-xs font-semibold">Ahmed Hassan</p>
                        <p className="text-white/50 text-xs">⭐ 4.8 · Gulberg, Lahore</p>
                      </div>
                      <span className="text-green-400 text-xs font-semibold">Available</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOP PROVIDERS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">Professionals</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2">
                Top-Rated Providers
              </h2>
              <p className="text-gray-500 mt-1">Trusted by thousands of customers across Pakistan</p>
            </div>
            <Link
              to="/search"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View all providers
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loadingProviders
              ? Array.from({ length: 6 }).map((_, i) => <ProviderCardSkeleton key={i} />)
              : providers.map((p) => <ProviderCard key={p.id} provider={p} />)}
          </div>
          <div className="text-center mt-8 sm:hidden">
            <Link to="/search" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              View all providers →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">Reviews</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2 mb-3">
              Loved by Customers
            </h2>
            <p className="text-gray-500">Real experiences from real people across Pakistan</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => <TestimonialCard key={t.name} testimonial={t} />)}
          </div>
        </div>
      </section>

      {/* ── PROVIDER CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-4 py-1.5 text-indigo-400 text-sm font-medium mb-6">
            🔧 For Professionals
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Grow Your Business<br />with HomeAssist
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Join 200+ verified professionals. Get matched with customers in your area, manage bookings, and build your reputation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/register?role=provider"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-600/25"
            >
              Join as a Provider
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-4 rounded-2xl transition-colors border border-white/15"
            >
              Browse Services
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto">
            {[['Free', 'to join'], ['Instant', 'bookings'], ['Verified', 'badge']].map(([val, lbl]) => (
              <div key={val} className="text-center">
                <p className="text-white font-extrabold text-xl">{val}</p>
                <p className="text-gray-500 text-xs mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to Fix Something?
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Search for a professional now or let our AI guide you to the right expert.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/search"
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-colors shadow-xl"
            >
              Find a Professional
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-8 py-4 rounded-2xl transition-colors border border-white/20"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
