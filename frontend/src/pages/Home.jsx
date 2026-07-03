import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getProviders } from '../api/providers';
import ProviderCard from '../components/shared/ProviderCard';
import { ProviderCardSkeleton } from '../components/ui/Skeleton';
import NearbyProvidersMap from '../components/shared/NearbyProvidersMap';

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useCounter(target, decimals, active) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let t0 = null;
    const dur = 2000;
    const tick = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      setCount(+(target * (1 - Math.pow(1 - p, 3))).toFixed(decimals));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, decimals]);
  return count;
}

// ─── Static Data ──────────────────────────────────────────────────────────────
const STATS = [
  { raw: 200,  suffix: '+', label: 'Verified Pros',     decimals: 0 },
  { raw: 4800, suffix: '+', label: 'Happy Customers',   decimals: 0 },
  { raw: 98,   suffix: '%', label: 'Satisfaction Rate', decimals: 0 },
  { raw: 4.8,  suffix: '★', label: 'Average Rating',    decimals: 1 },
];

const HERO_CARDS = [
  { img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80', label: 'Plumbing',    rating: '4.9', time: '2 min away',  rotate: '-3deg' },
  { img: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=400&q=80', label: 'Electrical',  rating: '4.8', time: '5 min away',  rotate: '0deg'  },
  { img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80',   label: 'Cleaning',    rating: '5.0', time: '3 min away',  rotate: '3deg'  },
];

const FEATURES = [
  {
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    iconBg: 'bg-green-50',
    iconColor: 'text-ha-primary',
    tag: 'Trust',
    tagBg: 'bg-green-50 text-ha-primary',
    title: 'Every Professional Is Verified',
    body: 'CNIC checks, background screening, skills tests, and ongoing review monitoring — before any pro goes live.',
    bullets: ['CNIC & identity check', 'Background & reference check', 'Skills test + demo session'],
    stat: '+48', statLabel: 'New pros this week',
    img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=80',
    accent: '#16A34A',
  },
  {
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    tag: 'Speed',
    tagBg: 'bg-amber-50 text-amber-600',
    title: 'Book in Under 60 Seconds',
    body: 'Describe your issue, AI picks the best match, you confirm — no calls, no waiting, no hassle.',
    bullets: ['AI instant match', 'Real-time availability', 'One-tap confirmation'],
    stat: '2 min', statLabel: 'Avg time to book',
    img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=700&q=80',
    accent: '#F59E0B',
  },
  {
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    iconBg: 'bg-teal-50',
    iconColor: 'text-ha-teal',
    tag: 'Safety',
    tagBg: 'bg-teal-50 text-ha-teal',
    title: 'Live GPS Tracking',
    body: 'Know exactly where your pro is and when they will arrive. Real-time location, ETA, and in-app messaging.',
    bullets: ['Live provider location', 'SMS + WhatsApp alerts', 'Digital receipt on done'],
    stat: '15 min', statLabel: 'Average response',
    img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=700&q=80',
    accent: '#0D9488',
  },
];

const SERVICES = [
  { slug: 'plumbing',          name: 'Plumbing',         grad: 'from-blue-500 to-cyan-400',       icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
  { slug: 'electrical',        name: 'Electrical',        grad: 'from-yellow-400 to-orange-400',   icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { slug: 'cleaning',          name: 'Cleaning',          grad: 'from-green-400 to-emerald-500',   icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { slug: 'carpentry',         name: 'Carpentry',         grad: 'from-amber-500 to-yellow-400',    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { slug: 'ac-repair',         name: 'AC Repair',         grad: 'from-sky-400 to-blue-500',        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { slug: 'painting',          name: 'Painting',          grad: 'from-purple-500 to-violet-400',   icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { slug: 'appliance-repair',  name: 'Appliance Repair',  grad: 'from-rose-400 to-pink-500',       icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
  { slug: 'gardening',         name: 'Gardening',         grad: 'from-teal-400 to-green-500',      icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Describe Your Problem', desc: 'Type what you need or ask our AI assistant. Plain language is totally fine — "my AC is leaking" works perfectly.', color: '#16A34A', lightBg: 'bg-green-50', border: 'border-green-200' },
  { step: '02', title: 'AI Picks the Best Match', desc: 'Our AI ranks verified professionals by rating, proximity, and availability — instantly showing you the best options.', color: '#F59E0B', lightBg: 'bg-amber-50', border: 'border-amber-200' },
  { step: '03', title: 'Book & Get It Done', desc: 'Pick your time, confirm in one tap, then relax. Get live GPS tracking, SMS alerts, and a digital receipt when done.', color: '#0D9488', lightBg: 'bg-teal-50', border: 'border-teal-200' },
];

const TESTIMONIALS = [
  { name: 'Sara Qureshi',  city: 'Lahore',    rating: 5, initBg: 'bg-green-500',  text: 'Found an amazing electrician within minutes. He fixed our entire wiring issue same day. HomeAssist is a lifesaver!' },
  { name: 'Hamza Farooq',  city: 'Karachi',   rating: 5, initBg: 'bg-teal-500',   text: 'The cleaning team was absolutely professional. Punctual, thorough, and reasonably priced. Will definitely use again.' },
  { name: 'Ayesha Noor',   city: 'Islamabad', rating: 5, initBg: 'bg-amber-500',  text: 'AI matched me with exactly the right AC technician. On time, fair pricing, and the job was done in under an hour!' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCounter({ stat, active }) {
  const count = useCounter(stat.raw, stat.decimals, active);
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-extrabold text-white font-display tabular-nums">
        {count.toLocaleString('en-US', { minimumFractionDigits: stat.decimals, maximumFractionDigits: stat.decimals })}{stat.suffix}
      </div>
      <div className="text-sm text-white/65 font-medium mt-1">{stat.label}</div>
    </div>
  );
}

function FeatureCard({ feature, index, inView }) {
  const isEven = index % 2 === 0;
  return (
    <div className={`reveal-up ${inView ? 'in-view' : ''} grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-ha-border shadow-card-hover`}
      style={{ transitionDelay: `${index * 80}ms` }}>

      {/* Image side */}
      <div className={`relative h-64 lg:h-auto ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
        <img src={feature.img} alt={feature.title} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* Floating stat badge */}
        <div className="absolute bottom-4 left-4 bg-white rounded-2xl px-4 py-2.5 shadow-float"
          style={{ animation: 'float 7s ease-in-out infinite' }}>
          <p className="text-xs text-ha-text-3 leading-none mb-0.5">{feature.statLabel}</p>
          <p className="font-extrabold text-ha-text-1 font-display text-lg leading-none">{feature.stat}</p>
        </div>
      </div>

      {/* Text side */}
      <div className={`bg-white p-8 lg:p-10 flex flex-col justify-center ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 w-fit ${feature.tagBg}`}>
          <div className={`h-5 w-5 rounded-full ${feature.iconBg} flex items-center justify-center`}>
            <svg className={`h-3 w-3 ${feature.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
            </svg>
          </div>
          {feature.tag}
        </div>
        <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-ha-text-1 leading-tight mb-4">
          {feature.title}
        </h3>
        <p className="text-ha-text-2 leading-relaxed mb-6">{feature.body}</p>
        <ul className="space-y-2.5">
          {feature.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2.5">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: feature.accent }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-ha-text-2 font-medium">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ServiceTile({ svc, delay, inView }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/search?category=${svc.slug}`)}
      className={`reveal-up ${inView ? 'in-view' : ''} group relative rounded-2xl overflow-hidden cursor-pointer aspect-square flex flex-col items-center justify-center gap-3 p-5 text-center hover:scale-105 transition-transform duration-300`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${svc.grad} opacity-100`} />
      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10 h-12 w-12 bg-white/25 rounded-2xl flex items-center justify-center">
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={svc.icon} />
        </svg>
      </div>
      <p className="relative z-10 font-semibold text-white text-sm drop-shadow-sm">{svc.name}</p>
    </button>
  );
}

function TestimonialCard({ t, delay, inView }) {
  return (
    <div className={`reveal-up ${inView ? 'in-view' : ''} bg-white rounded-2xl border border-ha-border p-6 shadow-card hover:shadow-card-hover hover:border-ha-primary/30 transition-all duration-300`}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex gap-1 mb-4">
        {[...Array(t.rating)].map((_, i) => (
          <svg key={i} className="h-4 w-4 text-ha-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-ha-text-2 text-sm leading-relaxed mb-5">"{t.text}"</p>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${t.initBg}`}>
          {t.name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-ha-text-1">{t.name}</p>
          <p className="text-xs text-ha-text-3">{t.city}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery]           = useState('');
  const [providers, setProviders]   = useState([]);
  const [loadingProviders, setLoad] = useState(true);

  const [statsRef,  statsInView]  = useReveal(0.25);
  const [featRef,   featInView]   = useReveal();
  const [svcRef,    svcInView]    = useReveal();
  const [howRef,    howInView]    = useReveal();
  const [provRef,   provInView]   = useReveal();
  const [testiRef,  testiInView]  = useReveal();
  const [ctaRef,    ctaInView]    = useReveal();

  useEffect(() => {
    getProviders({ sort: 'rating', limit: 6 })
      .then((d) => setProviders(d.providers || []))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, []);

  return (
    <div className="bg-ha-bg">

      {/* ── HERO (center-aligned) ─────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ paddingTop: '64px' }}>
        {/* Animated background — orbs stay far from text */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Subtle grid */}
          <div className="absolute inset-0 grid-pattern opacity-60" />
          {/* Animated green orb — top-left corner */}
          <div className="orb-light-1 absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(134,239,172,0.35) 0%, rgba(134,239,172,0.12) 40%, transparent 70%)' }} />
          {/* Animated yellow orb — bottom-right corner */}
          <div className="orb-light-2 absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(253,224,71,0.22) 0%, rgba(253,224,71,0.08) 40%, transparent 70%)' }} />
          {/* Animated teal orb — top-right */}
          <div className="orb-light-3 absolute -top-20 right-1/4 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(94,234,212,0.2) 0%, transparent 70%)' }} />
          {/* Floating particles */}
          {[
            { top: '15%', left: '8%',  size: 6,  dur: '7s',  delay: '0s'   },
            { top: '70%', left: '5%',  size: 4,  dur: '9s',  delay: '1.5s' },
            { top: '20%', right: '6%', size: 5,  dur: '8s',  delay: '0.8s' },
            { top: '60%', right: '8%', size: 7,  dur: '11s', delay: '2s'   },
            { top: '40%', left: '15%', size: 3,  dur: '6s',  delay: '3s'   },
            { top: '80%', right:'20%', size: 4,  dur: '10s', delay: '1s'   },
          ].map((d, i) => (
            <div key={i} className="particle absolute rounded-full bg-ha-primary"
              style={{ top: d.top, left: d.left, right: d.right, width: d.size, height: d.size, opacity: 0.35, '--dur': d.dur, '--delay': d.delay }} />
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 bg-white border border-ha-border rounded-full px-4 py-2 shadow-card text-sm text-ha-text-2 mb-8"
            style={{ animation: 'float 6s ease-in-out infinite' }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ha-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-ha-primary" />
            </span>
            AI-Powered Home Service Matching — Pakistan
          </div>

          {/* HEADLINE */}
          <h1 className="font-display font-extrabold text-ha-text-1 leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: 'clamp(2.6rem, 6vw, 4.25rem)' }}>
            Your Home Deserves<br />
            <span className="text-ha-primary">The Very Best</span> Care.
          </h1>

          <p className="text-ha-text-2 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Find verified plumbers, electricians, cleaners, and more — instantly matched by AI to your exact problem, in Lahore, Karachi &amp; Islamabad.
          </p>

          {/* SEARCH BAR */}
          <form onSubmit={(e) => { e.preventDefault(); navigate(query.trim() ? `/search?q=${encodeURIComponent(query)}` : '/search'); }}
            className="bg-white border border-ha-border rounded-2xl p-2 flex gap-2 max-w-2xl mx-auto mb-5 shadow-card-hover">
            <div className="flex-1 flex items-center gap-3 px-4">
              <svg className="h-5 w-5 text-ha-text-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your problem — leaking pipe, AC repair, painting…"
                className="flex-1 bg-transparent text-ha-text-1 placeholder-ha-text-3 text-sm focus:outline-none py-3" />
            </div>
            <button type="submit"
              className="bg-ha-primary hover:bg-ha-primary-hover text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap">
              Find Help
            </button>
          </form>

          {/* Quick pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-16">
            <span className="text-ha-text-3 text-xs font-medium self-center">Quick search:</span>
            {['Plumber', 'Electrician', 'AC Repair', 'Deep Cleaning', 'Painter', 'Carpenter'].map((t) => (
              <button key={t} onClick={() => navigate(`/search?q=${t}`)}
                className="px-3.5 py-1.5 text-ha-text-2 text-xs font-medium rounded-full border border-ha-border bg-white hover:border-ha-primary hover:text-ha-primary transition-colors shadow-sm cursor-pointer">
                {t}
              </button>
            ))}
          </div>

          {/* THREE FLOATING SERVICE CARDS */}
          <div className="flex justify-center gap-4 overflow-visible">
            {HERO_CARDS.map(({ img, label, rating, time, rotate }, i) => (
              <div key={label} className="flex-shrink-0" style={{ transform: `rotate(${rotate})` }}>
                <div
                  className="w-44 sm:w-52 rounded-2xl overflow-hidden bg-white border border-ha-border shadow-float cursor-pointer"
                  style={{ animation: `float ${8 + i}s ease-in-out ${i * 0.8}s infinite` }}>
                  <div className="relative h-32 sm:h-36">
                    <img src={img} alt={label} className="w-full h-full object-cover" loading="eager" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                      <span className="text-white text-xs font-semibold">{label}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <svg className="h-3 w-3 text-ha-accent" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs font-bold text-ha-text-1 font-display">{rating}</span>
                      </div>
                      <span className="text-xs text-ha-text-3">{time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Animated gradient accent line between hero and stats */}
      <div className="h-1 animated-gradient-border" />

      {/* ── LIVE NEARBY PROVIDERS MAP ─────────────────────────────────── */}
      <section className="py-16 bg-ha-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-ha-primary uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ha-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-ha-primary" />
              </span>
              Live Nearby
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ha-text-1 mt-2 mb-3 tracking-tight">
              Providers Near You, Right Now
            </h2>
            <p className="text-ha-text-2 max-w-lg mx-auto">
              Turn on your location to see verified, available pros around you on a live map —
              then filter by service, rating, or price and book in a tap.
            </p>
          </div>
          <NearbyProvidersMap />
        </div>
      </section>

      {/* ── STATS BAND (green gradient) ───────────────────────────────── */}
      <section className="py-14" style={{ background: 'linear-gradient(135deg, #15803D 0%, #16A34A 50%, #22C55E 100%)' }}>
        <div ref={statsRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`reveal-up ${statsInView ? 'in-view' : ''} grid grid-cols-2 md:grid-cols-4 gap-8`}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ transitionDelay: `${i * 80}ms` }} className={`reveal-up ${statsInView ? 'in-view' : ''}`}>
                <StatCounter stat={s} active={statsInView} />
              </div>
            ))}
          </div>
          {/* Cities */}
          <div className={`reveal-up ${statsInView ? 'in-view' : ''} flex flex-wrap items-center justify-center gap-3 mt-8 pt-8 border-t border-white/20`}
            style={{ transitionDelay: '320ms' }}>
            <span className="text-white/60 text-xs uppercase tracking-widest">Now serving</span>
            {['Lahore', 'Karachi', 'Islamabad'].map((c) => (
              <span key={c} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 text-white text-sm font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-white/70 inline-block" />
                {c}
              </span>
            ))}
            <span className="text-white/50 text-xs">+ more coming soon</span>
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES (horizontal icon strip) ──────────────────────── */}
      <section className="py-10 bg-white border-b border-ha-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {[
              { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Background Checked', color: 'text-ha-primary' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Same-Day Availability', color: 'text-amber-500' },
              { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'AI-Powered Matching', color: 'text-ha-teal' },
              { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', label: 'Real-Time GPS', color: 'text-violet-500' },
              { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Secure Payments', color: 'text-rose-500' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2.5 text-ha-text-3">
                <svg className={`h-5 w-5 flex-shrink-0 ${b.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.icon} />
                </svg>
                <span className="text-sm font-medium text-ha-text-2 whitespace-nowrap">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES (card layout, alternating image) ─────────────────── */}
      <section className="py-24 bg-ha-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={featRef} className={`text-center mb-14 reveal-up ${featInView ? 'in-view' : ''}`}>
            <span className="text-xs font-bold tracking-widest text-ha-primary uppercase">Why HomeAssist</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ha-text-1 mt-2 mb-3 tracking-tight">
              Built for Trust, Speed &amp; Safety
            </h2>
            <p className="text-ha-text-2 max-w-lg mx-auto">
              Every feature is designed to give you total confidence — from discovery to completion.
            </p>
          </div>
          <div className="space-y-6">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.tag} feature={f} index={i} inView={featInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES (colorful gradient tiles) ───────────────────────── */}
      <section className="py-24 bg-white border-y border-ha-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={svcRef} className={`text-center mb-14 reveal-up ${svcInView ? 'in-view' : ''}`}>
            <span className="text-xs font-bold tracking-widest text-ha-primary uppercase">Services</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ha-text-1 mt-2 mb-3 tracking-tight">
              Every Home Need, Covered
            </h2>
            <p className="text-ha-text-2 max-w-md mx-auto">
              Tap any service to instantly browse verified professionals near you.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SERVICES.map((svc, i) => (
              <ServiceTile key={svc.slug} svc={svc} delay={i * 55} inView={svcInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (vertical timeline — completely new layout) ─────── */}
      <section className="py-24 bg-ha-bg relative overflow-hidden">
        {/* Subtle animated background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="orb-light-1 absolute -bottom-32 -left-32 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(134,239,172,0.25) 0%, transparent 70%)' }} />
          <div className="orb-light-2 absolute -top-20 -right-20 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(253,224,71,0.15) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 grid-pattern opacity-40" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div ref={howRef} className={`reveal-up ${howInView ? 'in-view' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-4">
              <div>
                <span className="text-xs font-bold tracking-widest text-ha-primary uppercase">Process</span>
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ha-text-1 mt-2 tracking-tight">
                  Help in 3 Simple Steps
                </h2>
              </div>
              <Link to="/search"
                className="inline-flex items-center gap-2 bg-ha-primary hover:bg-ha-primary-hover text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md flex-shrink-0">
                Get Started
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Vertical timeline */}
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-7 top-14 bottom-14 w-0.5 bg-ha-border hidden sm:block" />

              <div className="space-y-6">
                {HOW_IT_WORKS.map((step, i) => (
                  <div key={step.step}
                    className={`reveal-up ${howInView ? 'in-view' : ''} flex gap-6 items-start`}
                    style={{ transitionDelay: `${i * 120}ms` }}>
                    {/* Step number */}
                    <div className="flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center font-display text-xl font-extrabold text-white relative z-10 shadow-md"
                      style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)` }}>
                      {i + 1}
                    </div>
                    {/* Content card */}
                    <div className={`flex-1 bg-white rounded-2xl border ${step.border} p-6 shadow-card hover:shadow-card-hover transition-shadow`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: step.color }}>
                            Step {step.step}
                          </p>
                          <h3 className="font-display text-xl font-bold text-ha-text-1 mb-2">{step.title}</h3>
                          <p className="text-ha-text-2 text-sm leading-relaxed">{step.desc}</p>
                        </div>
                        <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${step.lightBg}`}>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: step.color }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={
                              i === 0 ? 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' :
                              i === 1 ? 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' :
                              'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                            } />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOP PROVIDERS ─────────────────────────────────────────────── */}
      <section className="py-24 bg-white border-y border-ha-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={provRef} className={`reveal-up ${provInView ? 'in-view' : ''} flex items-end justify-between mb-12`}>
            <div>
              <span className="text-xs font-bold tracking-widest text-ha-primary uppercase">Professionals</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ha-text-1 mt-2 tracking-tight">
                Top-Rated Providers
              </h2>
              <p className="text-ha-text-2 mt-1">Trusted by thousands of customers across Pakistan</p>
            </div>
            <Link to="/search" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-ha-primary hover:text-ha-primary-hover transition-colors">
              View all
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
            <Link to="/search" className="text-sm font-semibold text-ha-primary">View all providers →</Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
      <section className="py-24 bg-ha-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={testiRef} className={`text-center mb-14 reveal-up ${testiInView ? 'in-view' : ''}`}>
            <span className="text-xs font-bold tracking-widest text-ha-primary uppercase">Reviews</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ha-text-1 mt-2 mb-3 tracking-tight">
              Loved by Customers
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 text-ha-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-ha-text-2 font-semibold text-sm font-display">4.8 / 5.0</span>
              <span className="text-ha-text-3 text-sm">from 1,200+ reviews</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={t.name} t={t} delay={i * 100} inView={testiInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (two-column split) ────────────────────────────────────── */}
      <section ref={ctaRef} className={`py-0 reveal-up ${ctaInView ? 'in-view' : ''}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[320px]">

          {/* Customer CTA */}
          <div className="relative overflow-hidden bg-ha-primary px-8 py-16 sm:px-14 flex flex-col justify-center">
            <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="relative">
              <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">For Customers</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                Need Help at Home?
              </h2>
              <p className="text-white/75 mb-8 max-w-sm">Book a verified professional in under 2 minutes. No calls, no waiting.</p>
              <Link to="/search"
                className="inline-flex items-center gap-2 bg-white text-ha-primary font-bold px-7 py-4 rounded-xl hover:bg-green-50 transition-colors shadow-lg">
                Find a Pro Now
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Provider CTA */}
          <div className="relative overflow-hidden px-8 py-16 sm:px-14 flex flex-col justify-center"
            style={{ background: 'linear-gradient(135deg, #1A110A 0%, #2D1F14 100%)' }}>
            <div className="absolute inset-0 halftone opacity-5 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #16A34A 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />
            <div className="relative">
              <span className="inline-block bg-ha-primary/20 text-ha-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">For Professionals</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                Grow Your Business<br />with HomeAssist
              </h2>
              <p className="text-white/50 mb-8 max-w-sm">Join 200+ verified pros. Get matched with customers in your area and build your 5-star reputation.</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/register?role=provider"
                  className="inline-flex items-center gap-2 bg-ha-primary hover:bg-ha-primary-hover text-white font-bold px-7 py-4 rounded-xl transition-all shadow-md hover:shadow-lg">
                  Join as a Provider
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
              <div className="flex items-center gap-6 mt-8 pt-6 border-t border-white/10">
                {[['Free', 'to join'], ['Instant', 'bookings'], ['Verified', 'badge']].map(([v, l]) => (
                  <div key={v}>
                    <p className="text-white font-bold font-display">{v}</p>
                    <p className="text-white/35 text-xs">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
