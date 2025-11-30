
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole } from './types';
import Login from './pages/Login';
import Register from './pages/Register';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import HospitalAdminDashboard from './pages/admin/HospitalAdminDashboard';
import CaseAnalysis from './pages/doctor/CaseAnalysis';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import NewCaseWizard from './pages/doctor/NewCaseWizard';
import PatientDetail from './pages/doctor/PatientDetail';
import Landing from './pages/Landing';
import MedoraAI from './pages/medora/MedoraAI';
import FederatedNetwork from './pages/FederatedNetwork';
import Notifications from './components/Notifications';
import { Bell, ChevronLeft } from 'lucide-react';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType>(null!);
export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('genosym_current_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleSetUser = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem('genosym_current_user', JSON.stringify(u));
    else localStorage.removeItem('genosym_current_user');
  };

  const logout = () => {
    handleSetUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Protected Route ---
const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: UserRole[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (user.status !== 'APPROVED' && user.role !== UserRole.SUPER_ADMIN) { // Super admins pre-approved
     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50">
         <div className="bg-white p-8 rounded shadow-lg text-center">
           <h2 className="text-2xl font-bold text-amber-600 mb-2">Access Pending</h2>
           <p>Your registration status is currently: <strong>{user.status}</strong></p>
           <p className="text-sm text-gray-500 mt-4">Please wait for admin approval.</p>
           <button onClick={() => localStorage.clear()} className="mt-4 text-blue-600 underline">Logout</button>
         </div>
       </div>
     );
  }
  return <>{children}</>;
};

// --- Dashboard Dispatcher ---
const DashboardDispatcher = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case UserRole.SUPER_ADMIN: return <Navigate to="/admin/super" replace />;
    case UserRole.HOSPITAL_ADMIN: return <Navigate to="/admin/hospital" replace />;
    case UserRole.DOCTOR: return <Navigate to="/doctor/dashboard" replace />;
    default: return <Navigate to="/" replace />;
  }
};

// --- Layout Wrapper ---
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);

  // Identify if we are on a root dashboard page where we don't need a back button
  const isRootDashboard = ['/admin/super', '/admin/hospital', '/doctor/dashboard'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {user && (
        <header className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isRootDashboard && (
                <button 
                  onClick={() => navigate(-1)} 
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm mr-2"
                  title="Go Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-white font-bold">G</span>
                </div>
                <span className="text-xl font-bold text-slate-800">Genosym AI</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-slate-600 hover:text-primary-600 hidden sm:block">
                Dashboard
              </button>
              {user.role === UserRole.DOCTOR && (
                 <button onClick={() => navigate('/medora')} className="text-sm font-medium text-primary-600 hover:text-primary-800">
                   Ask Medora AI
                 </button>
              )}
              <button onClick={() => setShowNotifs(true)} className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role.replace('_', ' ')}</p>
                </div>
                <button onClick={logout} className="text-sm text-red-600 hover:text-red-800 font-medium ml-2">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Notifications isOpen={showNotifs} onClose={() => setShowNotifs(false)} />
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root is always Landing Page */}
      <Route path="/" element={<Landing />} />
      
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Dispatcher to route to correct dashboard */}
      <Route path="/dashboard" element={<DashboardDispatcher />} />

      {/* Protected Routes */}
      <Route path="/admin/super" element={
        <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
          <Layout><SuperAdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/hospital" element={
        <ProtectedRoute roles={[UserRole.HOSPITAL_ADMIN]}>
          <Layout><HospitalAdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/doctor/dashboard" element={
        <ProtectedRoute roles={[UserRole.DOCTOR]}>
          <Layout><DoctorDashboard /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/doctor/new-case" element={
        <ProtectedRoute roles={[UserRole.DOCTOR]}>
          <Layout><NewCaseWizard /></Layout>
        </ProtectedRoute>
      } />

      {/* Shared Patient Detail View - Logic inside handles role-based buttons */}
      <Route path="/patient/:id" element={
        <ProtectedRoute roles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
          <Layout><PatientDetail /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/doctor/analysis" element={
        <ProtectedRoute roles={[UserRole.DOCTOR]}>
          <Layout><CaseAnalysis /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/medora" element={
        <ProtectedRoute roles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN]}>
          <Layout><MedoraAI /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/federated-network" element={
        <ProtectedRoute roles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN]}>
          <Layout><FederatedNetwork /></Layout>
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <HashRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </HashRouter>
);

export default App;
