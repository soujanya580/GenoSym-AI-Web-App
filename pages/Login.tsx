
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { validateCredentials } from '../services/mockBackend';
import { ShieldCheck, Lock, AlertCircle, ArrowRight, Mail, Shield, ChevronLeft } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  
  // Safe state access
  const state = location.state as { email?: string, isSuperAdmin?: boolean } | null;

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Workflow State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  // Security State
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Super Admin Mode
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);

  useEffect(() => {
    // Pre-fill email if passed from Registration
    if (state?.email) {
      setEmail(state.email);
    }
    // Check if entered via Super Admin link
    if (state?.isSuperAdmin) {
      setIsSuperAdminMode(true);
    }
  }, [state]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate Credentials (No OTP)
      const user = await validateCredentials(email, password);

      if (user) {
        if (isSuperAdminMode && user.role !== 'SUPER_ADMIN') {
          setIsLoading(false);
          setError('Access Denied. This portal is restricted to Platform Super Administrators.');
          return;
        }
        
        // Success - Direct Login
        setUser(user);
        navigate('/dashboard');
      } else {
        setIsLoading(false);
        setError('Invalid credentials. Access denied.');
      }
    } catch (err) {
      setIsLoading(false);
      setError('An unexpected system error occurred.');
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Password reset instructions have been sent to ${resetEmail}`);
    setShowForgotPassword(false);
  };

  // Render Forgot Password Modal
  if (showForgotPassword) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
          <button onClick={() => setShowForgotPassword(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Reset Password</h3>
            <p className="text-sm text-gray-500 mt-2">Enter your email address and we'll send you a link to reset your password.</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" 
                required 
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="name@example.com"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Send Reset Link
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>

      {/* Left Side - Security Branding */}
      <div className={`hidden lg:flex lg:w-1/2 ${isSuperAdminMode ? 'bg-slate-950' : 'bg-slate-900'} relative items-center justify-center overflow-hidden transition-colors duration-500`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600 rounded-full blur-3xl mix-blend-screen"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600 rounded-full blur-3xl mix-blend-screen"></div>
        </div>
        <div className="relative z-10 max-w-lg px-10 text-white">
          {isSuperAdminMode ? (
            <div className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-medium">
              <Shield className="w-4 h-4" /> Restricted Admin Area
            </div>
          ) : (
             <div className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium">
              <ShieldCheck className="w-4 h-4" /> HIPAA Compliant Access
            </div>
          )}
          <h1 className="text-4xl font-bold mb-6 leading-tight">
            {isSuperAdminMode ? 'Platform Administration' : 'Secure Access to Genosym AI'}
          </h1>
          <p className="text-slate-300 text-lg mb-8">
            {isSuperAdminMode 
              ? 'Authorized personnel only. All activities in this session are monitored and audited.' 
              : 'Advanced federated learning infrastructure for rare disease diagnostics. Please authenticate to access patient data.'}
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 relative">
          {isSuperAdminMode && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 rounded-t-2xl"></div>
          )}
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {isSuperAdminMode ? 'Admin Login' : 'Sign In'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Enter your credentials to access the platform.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg text-sm flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder={isSuperAdminMode ? "admin@genosym.com" : "name@hospital.org"}
                />
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs font-medium text-primary-600 hover:text-primary-800">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder="••••••••"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full text-white py-3 rounded-lg font-bold transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${isSuperAdminMode ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/30' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30'}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSuperAdminMode ? 'Authenticate' : 'Secure Login'} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            {!isSuperAdminMode && (
              <p className="text-sm text-gray-600">
                New to Genosym? <Link to="/register" className="text-primary-600 font-semibold hover:underline">Register Institution</Link>
              </p>
            )}
            {isSuperAdminMode && (
               <p className="text-sm text-gray-600">
                <Link to="/" className="text-slate-600 font-semibold hover:underline">Back to Platform Home</Link>
               </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
