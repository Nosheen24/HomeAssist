import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="h-9 w-9 rounded-xl bg-ha-primary flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>
      <span className="text-lg font-bold text-ha-text-1 font-display tracking-tight">HomeAssist</span>
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); setDropdownOpen(false); };

  const navLinks = [{ to: '/search', label: 'Find Services' }];
  const roleLink =
    user?.role === 'provider' ? { to: '/dashboard', label: 'Dashboard' } :
    user?.role === 'admin'    ? { to: '/admin',     label: 'Admin' } :
    user?.role === 'customer' ? { to: '/bookings',  label: 'My Bookings' } : null;

  const scrolledStyle = scrolled
    ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-ha-border'
    : isHome ? 'bg-transparent border-b border-transparent' : 'bg-white border-b border-ha-border';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolledStyle}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo />

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? 'text-ha-primary' : 'text-ha-text-2 hover:text-ha-text-1'}`
                }>{l.label}</NavLink>
            ))}
            {roleLink && (
              <NavLink to={roleLink.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? 'text-ha-primary' : 'text-ha-text-2 hover:text-ha-text-1'}`
                }>{roleLink.label}</NavLink>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-ha-surface-2 transition-colors cursor-pointer">
                  {user.profilePhoto ? (
                    <img src={user.profilePhoto} alt={user.name}
                      className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-ha-primary/15 flex items-center justify-center text-ha-primary text-sm font-semibold">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-ha-text-2">{user.name?.split(' ')[0]}</span>
                  <svg className="h-4 w-4 text-ha-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-ha-border py-2 z-50">
                      <div className="px-4 py-3 border-b border-ha-border">
                        <p className="text-xs text-ha-text-3">Signed in as</p>
                        <p className="text-sm font-medium text-ha-text-1 truncate">{user.email}</p>
                      </div>
                      {roleLink && (
                        <Link to={roleLink.to} onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2.5 text-sm text-ha-text-2 hover:text-ha-text-1 hover:bg-ha-surface-2 transition-colors">
                          {roleLink.label}
                        </Link>
                      )}
                      <Link to="/profile" onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2.5 text-sm text-ha-text-2 hover:text-ha-text-1 hover:bg-ha-surface-2 transition-colors">
                        My Profile
                      </Link>
                      <button onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-ha-danger hover:bg-red-50 transition-colors cursor-pointer">
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-ha-text-2 hover:text-ha-text-1 transition-colors">
                  Sign in
                </Link>
                <Link to="/register"
                  className="text-sm font-semibold bg-ha-primary hover:bg-ha-primary-hover text-white px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md">
                  Get started
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2 rounded-xl text-ha-text-2 hover:bg-ha-surface-2 transition-colors cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-ha-border bg-white px-4 py-3 space-y-1 shadow-lg">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm text-ha-text-2 hover:bg-ha-surface-2 hover:text-ha-text-1 transition-colors">
              {l.label}
            </Link>
          ))}
          {roleLink && (
            <Link to={roleLink.to} onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm text-ha-text-2 hover:bg-ha-surface-2 hover:text-ha-text-1 transition-colors">
              {roleLink.label}
            </Link>
          )}
          {user ? (
            <>
              <Link to="/profile" onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm text-ha-text-2 hover:bg-ha-surface-2 hover:text-ha-text-1 transition-colors">
                My Profile
              </Link>
              <button onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-ha-danger hover:bg-red-50 transition-colors cursor-pointer">
                Sign out
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" onClick={() => setMobileOpen(false)}
                className="flex-1 text-center text-sm font-medium border border-ha-border-2 text-ha-text-2 px-4 py-2.5 rounded-xl hover:border-ha-primary hover:text-ha-primary transition-colors">
                Sign in
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}
                className="flex-1 text-center text-sm font-semibold bg-ha-primary text-white px-4 py-2.5 rounded-xl hover:bg-ha-primary-hover shadow-sm transition-all">
                Get started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
