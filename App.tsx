
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
import { addLog } from './services/mockBackend';
import { Bell, ChevronLeft, ShieldAlert, LogOut } from 'lucide-react';

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
    if (user) {
      addLog(`SESSION: User ${user.name} logged out from the platform.`, 'INFO');
    }
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
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  
  if (user.status !== 'APPROVED' && user.role !== UserRole.SUPER_ADMIN) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
         <div className="bg-white p-12 rounded-[2.5rem] shadow-xl text-center border border-slate-200 max-w-md w-full animate-scale-up">
           <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-600">
             <ShieldAlert className="w-10 h-10" />
           </div>
           <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Access Restricted</h2>
           <p className="text-slate-500 font-medium leading-relaxed">Your account is currently in the <strong>{user.status}</strong> phase.</p>
           <p className="text-xs text-slate-400 mt-4 leading-relaxed">
             Institutional accounts must be verified by platform administrators. Medical staff must be verified by their hospital admin.
           </p>
           <button 
            onClick={logout} 
            className="mt-10 w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition shadow-lg flex items-center justify-center gap-2"
           >
             <LogOut className="w-4 h-4" /> Sign Out
           </button>
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

  const isRootDashboard = ['/admin/super', '/admin/hospital', '/doctor/dashboard'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {user && (
        <header className="bg-white shadow-sm border-b sticky top-0 z-40 h-20 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!isRootDashboard && (
                <button 
                  onClick={() => navigate(-1)} 
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
                  title="Go Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center cursor-pointer group" onClick={() => navigate('/')}>
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-primary-500/20 group-hover:scale-105 transition">
                  <span className="text-white font-black text-xl">G</span>
                </div>
                <span className="text-2xl font-black text-slate-900 tracking-tight">Genosym AI</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <button onClick={() => navigate('/dashboard')} className="text-xs font-black text-slate-500 uppercase tracking-widest hover:text-primary-600 hidden md:block">
                Console
              </button>
              
              <button onClick={() => setShowNotifs(true)} className="relative p-3 text-slate-500 hover:bg-slate-100 rounded-xl transition">
                <Bell className="w-6 h-6" />
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              
              <div className="flex items-center gap-4 border-l pl-6 border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-slate-900">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role.replace('_', ' ')}</p>
                </div>
                <button 
                  onClick={logout} 
                  className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition shadow-sm"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
      <Notifications isOpen={showNotifs} onClose={() => setShowNotifs(false)} />
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<DashboardDispatcher />} />

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
