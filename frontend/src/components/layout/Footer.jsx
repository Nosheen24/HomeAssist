import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">HomeAssist</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Pakistan's trusted platform for finding verified home service professionals. Fast, reliable, affordable.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Services</h3>
            <ul className="space-y-2">
              {['Plumbing', 'Electrical', 'Cleaning', 'AC Repair', 'Painting', 'Carpentry'].map((s) => (
                <li key={s}>
                  <Link
                    to={`/search?category=${s.toLowerCase().replace(' ', '-')}`}
                    className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Company</h3>
            <ul className="space-y-2">
              {['About Us', 'Become a Provider', 'Terms of Service', 'Privacy Policy'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© 2026 HomeAssist. All rights reserved.</p>
          <p className="text-xs text-gray-400">Serving Lahore · Karachi · Islamabad</p>
        </div>
      </div>
    </footer>
  );
}
