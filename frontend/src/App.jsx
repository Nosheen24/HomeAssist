import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Search from './pages/Search';
import ProviderDetail from './pages/ProviderDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Bookings from './pages/Bookings';
import ProviderDashboard from './pages/ProviderDashboard';
import Admin from './pages/Admin';
import FAQChatbot from './components/shared/FAQChatbot';

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ha-primary" />
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <FAQChatbot />
      <main className={`flex-1 ${isHome ? '' : 'pt-16'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/providers/:id" element={<ProviderDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute roles={['customer']}>
                <Bookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['provider']}>
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
