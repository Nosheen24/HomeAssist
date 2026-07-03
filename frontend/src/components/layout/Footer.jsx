import { Link } from 'react-router-dom';

const SERVICES = ['Plumbing', 'Electrical', 'Cleaning', 'AC Repair', 'Painting', 'Carpentry', 'Gardening', 'Appliance Repair'];
const COMPANY  = ['About Us', 'Become a Provider', 'Terms of Service', 'Privacy Policy'];

export default function Footer() {
  return (
    <footer className="bg-ha-text-1 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-5"
        style={{ background: 'radial-gradient(circle, #16A34A 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">

          <div className="md:col-span-5">
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <div className="h-9 w-9 rounded-xl bg-ha-primary flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white font-display tracking-tight">HomeAssist</span>
            </Link>
            <p className="text-sm text-white/45 max-w-xs leading-relaxed mb-6">
              Pakistan's most trusted platform for finding verified home service professionals. Fast, reliable, AI-powered.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Lahore', 'Karachi', 'Islamabad'].map((c) => (
                <span key={c} className="px-3 py-1 rounded-full text-xs font-medium text-ha-primary bg-ha-primary/10 border border-ha-primary/20">
                  {c}
                </span>
              ))}
              <span className="text-white/25 text-xs self-center">+ more soon</span>
            </div>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Services</h3>
            <ul className="space-y-2.5">
              {SERVICES.map((s) => (
                <li key={s}>
                  <Link to={`/search?category=${s.toLowerCase().replace(' ', '-')}`}
                    className="text-sm text-white/35 hover:text-ha-primary transition-colors duration-200">
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Company</h3>
            <ul className="space-y-2.5 mb-8">
              {COMPANY.map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-white/35 hover:text-ha-primary transition-colors duration-200">{item}</a>
                </li>
              ))}
            </ul>
            <div className="bg-ha-primary/10 border border-ha-primary/20 rounded-2xl p-4">
              <p className="text-sm font-semibold text-white mb-1">Are you a professional?</p>
              <p className="text-xs text-white/40 mb-3">Join 200+ verified pros and grow your business.</p>
              <Link to="/register?role=provider"
                className="block text-center text-xs font-semibold text-white px-4 py-2.5 rounded-xl bg-ha-primary hover:bg-ha-primary-hover transition-colors">
                Join as Provider
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">© 2026 HomeAssist. All rights reserved.</p>
          <p className="text-xs text-white/20">Built with ♥ in Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
