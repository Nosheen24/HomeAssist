import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCategories } from '../api/categories';
import { getProviders } from '../api/providers';
import ProviderCard from '../components/shared/ProviderCard';
import { ProviderCardSkeleton } from '../components/ui/Skeleton';

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCounter(target, decimals, isActive) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    let startTime = null;
    const duration = 1800;
    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(+(target * eased).toFixed(decimals));
      if (progress < 1) requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [isActive, target, decimals]);
  return count;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const STATS = [
  { raw: 200,  suffix: '+', label: 'Verified Pros',     decimals: 0 },
  { raw: 4800, suffix: '+', label: 'Happy Customers',   decimals: 0 },
  { raw: 98,   suffix: '%', label: 'Satisfaction Rate', decimals: 0 },
  { raw: 4.8,  suffix: '★', label: 'Average Rating',    decimals: 1 },
];

const FEATURES = [
  {
    tag:     'Trust',
    tagColor: 'bg-blue-50 border-blue-200 text-blue-700',
    title:   'Every Professional\nIs Verified',
    body:    'We personally vet each provider through CNIC verification, background checks, and a skills assessment before they appear on HomeAssist.',
    bullets: ['CNIC & identity verification', 'Background & reference checks', 'Skills test & demo session', 'Ongoing customer review monitoring'],
    img:     'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    imgAlt:  'Professional plumber at work',
    badge:   { stat: '+48 new pros', label: 'Verified this week' },
    badgeColor: 'border-blue-200 bg-blue-50 text-blue-700',
    reverse: false,
    bg:      'bg-white',
  },
  {
    tag:     'Speed',
    tagColor: 'bg-green-50 border-ha-primary/20 text-ha-primary',
    title:   'Book a Service in\nUnder 60 Seconds',
    body:    'Describe what you need, pick from top-rated pros, choose a time slot, and confirm — no phone calls, no waiting on hold.',
    bullets: ['AI instantly matches you with the right pro', 'See real-time availability and prices', 'One-tap booking confirmation', 'SMS & WhatsApp reminders'],
    img:     'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
    imgAlt:  'Person booking a service on their phone',
    badge:   { stat: '2 min avg', label: 'Time to book' },
    badgeColor: 'border-ha-primary/20 bg-green-50 text-ha-primary',
    reverse: true,
    bg:      'bg-ha-bg',
  },
  {
    tag:     'Safety',
    tagColor: 'bg-teal-50 border-teal-200 text-ha-teal',
    title:   'Track Your Service\nin Real Time',
    body:    "Once booked, follow your provider's journey live. Know exactly when they're arriving — no more guessing or waiting by the door.",
    bullets: ['Live GPS location of your provider', 'ETA updates via SMS', 'In-app messaging with your pro', 'Post-service ratings & digital receipts'],
    img:     'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    imgAlt:  'Modern home representing service completion',
    badge:   { stat: '15 min avg', label: 'Response time' },
    badgeColor: 'border-teal-200 bg-teal-50 text-ha-teal',
    reverse: false,
    bg:      'bg-white',
  },
];

const HOW_IT_WORKS = [
  {
    title: 'Describe Your Problem',
    desc:  'Tell our AI assistant what you need or browse by service category.',
    bg: 'bg-green-50 border-green-200', icon: 'text-ha-primary',
    svg: <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  },
  {
    title: 'Pick a Professional',
    desc:  'Compare ratings, prices, and availability. Read real customer reviews.',
    bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-500',
    svg: <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  },
  {
    title: 'Book & Relax',
    desc:  'Confirm your slot, get a reminder, and let the expert handle the rest.',
    bg: 'bg-teal-50 border-teal-200', icon: 'text-ha-teal',
    svg: <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
];

const TESTIMONIALS = [
  { name: 'Sara Qureshi',  city: 'Lahore',    rating: 5, color: 'bg-green-100 text-ha-primary', text: 'Found an amazing electrician within minutes. He fixed our entire wiring issue same day. HomeAssist is a lifesaver!' },
  { name: 'Hamza Farooq',  city: 'Karachi',   rating: 5, color: 'bg-teal-100 text-teal-700',     text: 'Booked a deep cleaning service for our apartment. The team was professional, punctual, and thorough. Will use again.' },
  { name: 'Ayesha Noor',   city: 'Islamabad', rating: 5, color: 'bg-amber-100 text-amber-700',   text: 'The AI assistant recommended exactly the right AC technician. He arrived on time and the pricing was very fair. Highly recommend!' },
];

const CATEGORY_META = {
  plumbing:           { emoji: '🔧', bg: 'bg-blue-100',    text: 'text-blue-600' },
  electrical:         { emoji: '⚡', bg: 'bg-yellow-100',  text: 'text-yellow-600' },
  cleaning:           { emoji: '🧹', bg: 'bg-green-100',   text: 'text-green-600' },
  carpentry:          { emoji: '🔨', bg: 'bg-amber-100',   text: 'text-amber-700' },
  'ac-repair':        { emoji: '❄️', bg: 'bg-sky-100',     text: 'text-sky-600' },
  painting:           { emoji: '🎨', bg: 'bg-purple-100',  text: 'text-purple-600' },
  'appliance-repair': { emoji: '🔌', bg: 'bg-orange-100',  text: 'text-orange-600' },
  gardening:          { emoji: '🌿', bg: 'bg-emerald-100', text: 'text-emerald-600' },
};

const HERO_PHOTOS = [
  { img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=500&q=80', label: 'Plumbing',    delay: '0s',   tall: true  },
  { img: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=500&q=80', label: 'Electrical', delay: '1s',   tall: false },
  { img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=500&q=80', label: 'Cleaning',    delay: '2s',   tall: false },
  { img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=500&q=80', label: 'Renovation', delay: '0.5s', tall: true  },
];

// ─── Stat block ───────────────────────────────────────────────────────────────
function StatBlock({ stat, isActive }) {
  const count = useCounter(stat.raw, stat.decimals, isActive);
  return (
    <>
      <div className="text-4xl sm:text-5xl font-extrabold font-mono text-ha-primary tabular-nums">
        {count.toLocaleString('en-US', { minimumFractionDigits: stat.decimals, maximumFractionDigits: stat.decimals })}{stat.suffix}
      </div>
      <div className="text-sm text-ha-text-3 font-medium mt-1">{stat.label}</div>
    </>
  );
}

// ─── Feature section (Going.com alternating layout) ───────────────────────────
function FeatureSection({ feature }) {
  const [imgRef, imgInView] = useReveal();
  const [textRef, textInView] = useReveal();

  return (
    <section className={`py-24 ${feature.bg} border-y border-ha-border overflow-hidden`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Image side */}
          <div
            ref={imgRef}
            className={`${feature.reverse ? 'reveal-right lg:order-2' : 'reveal-left lg:order-1'} ${imgInView ? 'in-view' : ''} relative`}
          >
            <div className="relative rounded-3xl overflow-hidden bg-ha-surface-2 aspect-[4/3] shadow-float">
              <img
                src={feature.img}
                alt={feature.imgAlt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            {/* Floating stat badge */}
            <div
              className={`absolute -bottom-5 -right-3 lg:-right-5 bg-white border ${feature.badgeColor} rounded-2xl px-4 py-3 shadow-float z-10`}
              style={{ animation: 'float 7s ease-in-out 1s infinite' }}
            >
              <p className="text-xs leading-none mb-0.5 opacity-70">{feature.badge.label}</p>
              <p className="font-extrabold text-ha-text-1 text-lg font-mono leading-none">{feature.badge.stat}</p>
            </div>
          </div>

          {/* Text side */}
          <div
            ref={textRef}
            className={`${feature.reverse ? 'reveal-left lg:order-1' : 'reveal-right lg:order-2'} ${textInView ? 'in-view' : ''}`}
          >
            <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-sm font-semibold mb-5 ${feature.tagColor}`}>
              {feature.tag}
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ha-text-1 leading-tight mb-4 tracking-[-0.02em] whitespace-pre-line">
              {feature.title}
            </h2>
            <p className="text-ha-text-2 text-lg leading-relaxed mb-8">{feature.body}</p>
            <ul className="space-y-3">
              {feature.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 text-ha-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-ha-text-2 text-sm font-medium">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Category card (Urban Company style) ─────────────────────────────────────
function CategoryCard({ category, delay, inView }) {
  const navigate = useNavigate();
  const meta = CATEGORY_META[category.slug] || { emoji: '🏠', bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <button
      onClick={() => navigate(`/search?category=${category.slug}`)}
      className={`reveal-up ${inView ? 'in-view' : ''} group bg-white rounded-2xl border border-ha-border p-5 text-left hover:border-ha-primary hover:shadow-card-hover transition-all duration-200 shadow-card`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl mb-3 ${meta.bg} ${meta.text}`}>
        {meta.emoji}
      </div>
      <p className="font-semibold text-ha-text-1 text-sm group-hover:text-ha-primary transition-colors">{category.name}</p>
      <p className="text-xs text-ha-text-3 mt-0.5 group-hover:text-ha-primary transition-colors">Explore →</p>
    </button>
  );
}

// ─── Testimonial card ─────────────────────────────────────────────────────────
function TestimonialCard({ testimonial, delay, inView }) {
  return (
    <div
      className={`reveal-up ${inView ? 'in-view' : ''} bg-white rounded-2xl border border-ha-border shadow-card p-6 hover:shadow-card-hover hover:border-ha-primary/40 transition-all relative`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="absolute top-2 left-4 font-display text-7xl text-ha-primary/10 leading-none pointer-events-none select-none">"</div>
      <div className="relative">
        <div className="flex gap-0.5 mb-4">
          {[...Array(testimonial.rating)].map((_, i) => (
            <svg key={i} className="h-4 w-4 text-ha-accent" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="text-ha-text-2 text-sm leading-relaxed mb-5">"{testimonial.text}"</p>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${testimonial.color}`}>
            {testimonial.name[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-ha-text-1">{testimonial.name}</p>
            <p className="text-xs text-ha-text-3">{testimonial.city}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const [statsRef,  statsInView]  = useReveal(0.3);
  const [catRef,    catInView]    = useReveal();
  const [howRef,    howInView]    = useReveal();
  const [provRef,   provInView]   = useReveal();
  const [testiRef,  testiInView]  = useReveal();
  const [ctaRef,    ctaInView]    = useReveal();

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getProviders({ sort: 'rating', limit: 6 })
      .then((d) => setProviders(d.providers || []))
      .catch(() => {})
      .finally(() => setLoadingProviders(false));
  }, []);

  return (
    <div className="bg-ha-bg">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full bg-green-100/60 blur-3xl" />
          <div className="absolute top-1/2 -left-32 h-[400px] w-[400px] rounded-full bg-emerald-50/70 blur-3xl" />
          <div className="absolute inset-0 halftone-light opacity-40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: text */}
            <div>
              <div
                className="inline-flex items-center gap-2.5 bg-white border border-ha-border rounded-full px-4 py-2 text-sm text-ha-text-2 mb-8 shadow-card"
                style={{ animation: 'float 6s ease-in-out 0s infinite' }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ha-teal opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-ha-teal" />
                </span>
                AI-Powered Service Matching
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold text-ha-text-1 leading-[1.05] mb-6 tracking-[-0.03em]">
                Your Home,<br />
                <span className="text-ha-primary">Expertly</span><br />
                Cared For.
              </h1>

              <p className="text-lg text-ha-text-2 mb-10 max-w-lg leading-relaxed">
                Pakistan's smartest platform for finding verified plumbers, electricians, cleaners, and more — AI-matched to your exact problem.
              </p>

              {/* Search bar */}
              <form
                onSubmit={(e) => { e.preventDefault(); navigate(query.trim() ? `/search?q=${encodeURIComponent(query)}` : '/search'); }}
                className="bg-white border border-ha-border rounded-2xl p-2 flex gap-2 max-w-xl mb-6"
                style={{ boxShadow: '0 8px 32px -4px rgba(26,17,10,0.12), 0 2px 8px -2px rgba(26,17,10,0.06)' }}
              >
                <div className="flex-1 flex items-center gap-3 px-3">
                  <svg className="h-5 w-5 text-ha-text-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Leaking pipe, AC repair, deep cleaning..."
                    className="flex-1 bg-transparent text-ha-text-1 placeholder-ha-text-3 text-sm focus:outline-none py-2"
                  />
                </div>
                <button type="submit" className="bg-ha-primary hover:bg-ha-primary-hover text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md whitespace-nowrap">
                  Find Help
                </button>
              </form>

              {/* Quick pills */}
              <div className="flex flex-wrap gap-2 mb-10">
                <span className="text-ha-text-3 text-xs font-medium self-center">Popular:</span>
                {['Plumber', 'Electrician', 'AC Repair', 'Cleaning', 'Painter'].map((t) => (
                  <button key={t} onClick={() => navigate(`/search?q=${t}`)}
                    className="px-3 py-1.5 text-ha-text-2 text-xs font-medium rounded-full border border-ha-border bg-white hover:border-ha-primary hover:text-ha-primary transition-colors shadow-sm"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap items-center gap-6 pt-8 border-t border-ha-border">
                {[
                  { label: 'Verified Pros', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                  { label: 'Same-Day Service', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                  { label: 'AI-Powered Match', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-ha-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.icon} />
                    </svg>
                    <span className="text-xs text-ha-text-3 font-medium">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: 2×2 service photo grid */}
            <div className="hidden lg:grid grid-cols-2 gap-4 relative">
              {HERO_PHOTOS.map(({ img, label, delay, tall }, i) => (
                <div
                  key={label}
                  className={`relative rounded-2xl overflow-hidden bg-ha-surface-2 ${tall ? 'row-span-1 aspect-[3/4]' : 'aspect-square'} ${i % 2 === 0 ? '-translate-y-3' : 'translate-y-3'}`}
                  style={{ animation: `float ${7 + i}s ease-in-out ${delay} infinite` }}
                >
                  <img src={img} alt={label} className="w-full h-full object-cover" loading="eager" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                    <span className="text-white text-xs font-semibold">{label}</span>
                  </div>
                </div>
              ))}

              {/* Overlay badges */}
              <div
                className="absolute -top-4 -right-4 bg-teal-50 border border-teal-200 text-ha-teal rounded-2xl px-3 py-2 text-xs font-semibold flex items-center gap-2 shadow-float z-10"
                style={{ animation: 'float 8s ease-in-out 0.5s infinite' }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Booking Confirmed!
              </div>
              <div
                className="absolute -bottom-4 left-4 bg-white border border-ha-border rounded-2xl px-3 py-2 flex items-center gap-2 shadow-float z-10"
                style={{ animation: 'float 8s ease-in-out 2s infinite' }}
              >
                <span className="text-ha-accent text-sm">★★★★★</span>
                <span className="text-xs font-bold text-ha-text-1 font-mono">4.9 Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ANIMATED STATS ───────────────────────────────────────────────── */}
      <section className="bg-white border-y border-ha-border py-14 shadow-sm">
        <div
          ref={statsRef}
          className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 reveal-up ${statsInView ? 'in-view' : ''}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <div key={s.label} className={`text-center ${i > 0 ? 'border-l border-ha-border pl-6' : ''}`}>
                <StatBlock stat={s} isActive={statsInView} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITIES STRIP ─────────────────────────────────────────────────── */}
      <section className="bg-ha-bg border-b border-ha-border py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
          <span className="text-ha-text-3 text-xs uppercase tracking-widest">Now Serving</span>
          {['🏙️ Lahore', '🌊 Karachi', '🏛️ Islamabad'].map((city) => (
            <span key={city} className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-ha-teal rounded-full px-4 py-1.5">
              {city}
            </span>
          ))}
          <span className="text-ha-text-3 text-xs uppercase tracking-widest">More coming soon</span>
        </div>
      </section>

      {/* ── FEATURE SECTIONS (Going.com alternating image + text) ─────────── */}
      {FEATURES.map((f) => <FeatureSection key={f.tag} feature={f} />)}

      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-ha-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={catRef} className={`text-center mb-12 reveal-up ${catInView ? 'in-view' : ''}`}>
            <span className="text-xs font-bold tracking-widest text-ha-primary uppercase">Services</span>
            <h2 className="font-display text-3xl sm:text-[40px] font-bold text-ha-text-1 mt-2 mb-3">
              Every Home Need, Covered
            </h2>
            <p className="text-ha-text-2 max-w-md mx-auto">
              From emergency repairs to routine maintenance — find the right expert in minutes.
            </p>
          </div>
          {categories.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-ha-border" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {categories.map((cat, i) => (
                <CategoryCard key={cat.id} category={cat} delay={i * 60} inView={catInView} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-ha-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={howRef} className={`reveal-up ${howInView ? 'in-view' : ''}`}>
            <div className="text-center mb-14">
              <span className="text-xs font-bold tracking-widest text-ha-primary uppercase">Process</span>
              <h2 className="font-display text-3xl sm:text-[40px] font-bold text-ha-text-1 mt-2 mb-3">
                Help in 3 Simple Steps
              </h2>
              <p className="text-ha-text-2">No hassle. No phone calls. Just fast, reliable service.</p>
            </div>
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="hidden md:block absolute top-14 left-1/4 right-1/4 border-t-2 border-dashed border-ha-border-2" />
              {HOW_IT_WORKS.map((item, i) => (
                <div
                  key={item.title}
                  className="relative text-center group"
                  style={{ transitionDelay: howInView ? `${i * 120}ms` : '0ms' }}
                >
                  <div className={`relative inline-flex mb-5 h-24 w-24 items-center justify-center rounded-2xl border ${item.bg} ${item.icon} group-hover:scale-105 transition-transform duration-200`}>
                    {item.svg}
                  </div>
                  <h3 className="text-lg font-bold text-ha-text-1 mb-2">{item.title}</h3>
                  <p className="text-sm text-ha-text-2 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link to="/search" className="inline-flex items-center gap-2 bg-ha-primary hover:bg-ha-primary-hover text-white font-semibold px-8 py-4 rounded-[4px] transition-all shadow-sm hover:shadow-md">
                Get Started Now
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOP PROVIDERS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-ha-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={provRef} className={`flex items-end justify-between mb-10 reveal-up ${provInView ? 'in-view' : ''}`}>
            <div>
              <span className="text-xs font-bold tracking-widest text-ha-primary uppercase">Professionals</span>
              <h2 className="font-display text-3xl sm:text-[40px] font-bold text-ha-text-1 mt-2">Top-Rated Providers</h2>
              <p className="text-ha-text-2 mt-1">Trusted by thousands of customers across Pakistan</p>
            </div>
            <Link to="/search" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-ha-primary hover:text-ha-primary-hover transition-colors">
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
            <Link to="/search" className="text-sm font-semibold text-ha-primary">View all providers →</Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-ha-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={testiRef} className={`text-center mb-12 reveal-up ${testiInView ? 'in-view' : ''}`}>
            <span className="text-xs font-bold tracking-widest text-ha-primary uppercase">Reviews</span>
            <h2 className="font-display text-3xl sm:text-[40px] font-bold text-ha-text-1 mt-2 mb-3">
              Loved by Customers
            </h2>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 text-ha-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-ha-text-2 font-semibold text-sm font-mono">4.8 / 5.0</span>
              <span className="text-ha-text-3 text-sm">from 1,200+ reviews</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={t.name} testimonial={t} delay={i * 100} inView={testiInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PROVIDER CTA (dark, Going.com closing section) ───────────────── */}
      <section ref={ctaRef} className={`py-24 bg-ha-text-1 overflow-hidden relative reveal-up ${ctaInView ? 'in-view' : ''}`}>
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-ha-primary/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-ha-teal/15 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-sm font-medium mb-6">
            🔧 For Professionals
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
            Grow Your Business<br />with HomeAssist
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Join 200+ verified professionals. Get matched with customers in your area, manage bookings, and build your 5-star reputation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link to="/register?role=provider"
              className="inline-flex items-center justify-center gap-2 bg-ha-primary hover:bg-ha-primary-hover text-white font-semibold px-8 py-4 rounded-[4px] transition-all shadow-sm hover:shadow-lg"
            >
              Join as a Provider
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link to="/search"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-[4px] transition-colors"
            >
              Browse Services
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-8 max-w-sm mx-auto border-t border-white/10 pt-10">
            {[['Free', 'to join'], ['Instant', 'bookings'], ['Verified', 'badge']].map(([val, lbl]) => (
              <div key={val} className="text-center">
                <p className="text-white font-extrabold text-xl font-mono">{val}</p>
                <p className="text-white/50 text-xs mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
