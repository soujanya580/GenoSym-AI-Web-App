
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getHospitals, registerHospital, registerDoctor } from '../services/mockBackend';
import { Hospital, RegistrationStatus, UserRole } from '../types';
import { Building2, Stethoscope, Upload, CheckCircle, ArrowRight, ChevronLeft } from 'lucide-react';

const Register = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Safe state access
  const state = location.state as { mode?: string } | null;

  const [role, setRole] = useState<UserRole.HOSPITAL_ADMIN | UserRole.DOCTOR>(UserRole.DOCTOR);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactNumber: '',
    hospitalId: '',
    hospitalName: '', // For Hospital Admin
    address: '' // For Hospital Admin
  });
  const [file, setFile] = useState<File | null>(null);
  
  // UI State
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setHospitals(getHospitals().filter(h => h.status === RegistrationStatus.APPROVED));
    if (state && state.mode === 'HOSPITAL') {
      setRole(UserRole.HOSPITAL_ADMIN);
    }
  }, [state]);

  const validate = () => {
    const newErrors: {[key: string]: string} = {};
    if (!formData.fullName) newErrors.fullName = "Full name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    
    if (!formData.contactNumber) newErrors.contactNumber = "Contact number is required";
    
    if (role === UserRole.HOSPITAL_ADMIN) {
      if (!formData.hospitalName) newErrors.hospitalName = "Hospital name is required";
      if (!formData.address) newErrors.address = "Address is required";
    } else {
      if (!formData.hospitalId) newErrors.hospitalId = "Please select your institution";
    }

    if (!file) newErrors.file = role === UserRole.HOSPITAL_ADMIN ? "Accreditation document required" : "Medical license required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      const fileName = file ? file.name : 'document.pdf';
      
      if (role === UserRole.HOSPITAL_ADMIN) {
        await registerHospital(
          formData.hospitalName,
          formData.address,
          formData.fullName,
          formData.email,
          formData.password,
          formData.contactNumber,
          fileName
        );
      } else {
        await registerDoctor(
          formData.fullName,
          formData.email,
          formData.password,
          formData.hospitalId,
          formData.contactNumber,
          fileName
        );
      }
      setSuccess(true);
    } catch (err: any) {
      setErrors({ general: err.message || "Registration failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Registration Submitted</h2>
          <p className="text-slate-600 mb-6">
            Your account is currently <strong>PENDING</strong> approval.
            {role === UserRole.HOSPITAL_ADMIN 
              ? " A Super Admin will review your institution credentials." 
              : " Your Hospital Administrator will review your medical license."}
          </p>
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-8">
            A notification has been sent to the approving authority. You will receive an email at <strong>{formData.email}</strong> once approved.
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
          >
            Return to Login <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white rounded-lg shadow-sm backdrop-blur-md text-slate-600 hover:text-slate-800 transition text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Left Side - Image/Branding */}
      <div className="hidden lg:flex w-1/3 bg-slate-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl mix-blend-multiply transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full blur-3xl mix-blend-multiply transform -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative z-10 px-12 text-center text-white">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-3xl font-bold">G</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">Genosym AI</h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Join the world's most advanced federated learning platform for rare disease diagnostics.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-12 overflow-y-auto">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
            <p className="text-slate-500 mt-1">Enter your details to request platform access.</p>
          </div>

          {errors.general && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Registering As</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-medium text-slate-700 transition-shadow"
                >
                  <option value={UserRole.DOCTOR}>Medical Practitioner (Doctor)</option>
                  <option value={UserRole.HOSPITAL_ADMIN}>Hospital Administrator</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  className={`w-full p-3 border ${errors.fullName ? 'border-red-300 bg-red-50' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none`}
                  placeholder="e.g. Dr. Jane Doe"
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Number</label>
                <input 
                  type="tel" 
                  className={`w-full p-3 border ${errors.contactNumber ? 'border-red-300 bg-red-50' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none`}
                  placeholder="+1 (555) 000-0000"
                  value={formData.contactNumber}
                  onChange={e => setFormData({...formData, contactNumber: e.target.value})}
                />
                {errors.contactNumber && <p className="text-xs text-red-500 mt-1">{errors.contactNumber}</p>}
              </div>
            </div>

            {role === UserRole.HOSPITAL_ADMIN ? (
              <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-primary-700 mb-2">
                  <Building2 className="w-5 h-5" />
                  <span className="font-semibold">Institution Details</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Hospital Name</label>
                  <input 
                    type="text" 
                    className={`w-full p-3 border ${errors.hospitalName ? 'border-red-300' : 'border-slate-200'} rounded-lg bg-white focus:ring-2 focus:ring-primary-500 outline-none`}
                    placeholder="Official Institution Name"
                    value={formData.hospitalName}
                    onChange={e => setFormData({...formData, hospitalName: e.target.value})}
                  />
                  {errors.hospitalName && <p className="text-xs text-red-500 mt-1">{errors.hospitalName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                  <input 
                    type="text" 
                    className={`w-full p-3 border ${errors.address ? 'border-red-300' : 'border-slate-200'} rounded-lg bg-white focus:ring-2 focus:ring-primary-500 outline-none`}
                    placeholder="Street, City, State, Zip"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Accreditation Document</label>
                  <div className={`border-2 border-dashed ${errors.file ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-primary-400'} rounded-lg p-6 transition text-center bg-white cursor-pointer relative`}>
                    <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.png" />
                    <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600 font-medium">{file ? file.name : "Upload Hospital License / Accreditation"}</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG or PNG</p>
                  </div>
                  {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                 <div className="flex items-center gap-2 text-primary-700 mb-2">
                  <Stethoscope className="w-5 h-5" />
                  <span className="font-semibold">Professional Credentials</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Affiliated Hospital</label>
                  <select 
                    className={`w-full p-3 border ${errors.hospitalId ? 'border-red-300' : 'border-slate-200'} rounded-lg bg-white focus:ring-2 focus:ring-primary-500 outline-none`}
                    value={formData.hospitalId}
                    onChange={e => setFormData({...formData, hospitalId: e.target.value})}
                  >
                    <option value="">-- Select Institution --</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  {errors.hospitalId && <p className="text-xs text-red-500 mt-1">{errors.hospitalId}</p>}
                  {hospitals.length === 0 && <p className="text-xs text-amber-600 mt-1">No approved hospitals found. Please contact your administrator.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Medical License Upload</label>
                  <div className={`border-2 border-dashed ${errors.file ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-primary-400'} rounded-lg p-6 transition text-center bg-white cursor-pointer relative`}>
                    <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.png" />
                    <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600 font-medium">{file ? file.name : "Upload Medical License"}</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG or PNG</p>
                  </div>
                  {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <input 
                type="email" 
                className={`w-full p-3 border ${errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none`}
                placeholder="name@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input 
                  type="password" 
                  className={`w-full p-3 border ${errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <input 
                  type="password" 
                  className={`w-full p-3 border ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none`}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                />
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition shadow-lg shadow-primary-500/30 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isSubmitting ? 'Processing...' : 'Submit Registration'}
            </button>

            <div className="text-center mt-6">
              <p className="text-sm text-slate-600">
                Already have an account? <Link to="/login" className="text-primary-600 font-semibold hover:underline">Login here</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
