
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getHospitals, registerHospital, registerDoctor } from '../services/mockBackend';
import { Hospital, RegistrationStatus, UserRole } from '../types';
import { Building2, Stethoscope, Upload, CheckCircle, ChevronLeft, AlertCircle } from 'lucide-react';

const Register = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state as { mode?: string } | null;

  const [role, setRole] = useState<UserRole.HOSPITAL_ADMIN | UserRole.DOCTOR>(UserRole.DOCTOR);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactNumber: '',
    hospitalInput: '', // Unified input for typing or selecting
    hospitalName: '', // For Hospital Admin
    address: '' // For Hospital Admin
  });
  const [file, setFile] = useState<File | null>(null);
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only show APPROVED hospitals for doctors to join
    const allHospitals = getHospitals();
    setHospitals(allHospitals.filter(h => h.status === RegistrationStatus.APPROVED));
    
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
    if (formData.password && formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    
    if (!formData.contactNumber) newErrors.contactNumber = "Contact number is required";
    
    if (role === UserRole.HOSPITAL_ADMIN) {
      if (!formData.hospitalName) newErrors.hospitalName = "Hospital name is required";
      if (!formData.address) newErrors.address = "Address is required";
    } else {
      if (!formData.hospitalInput) newErrors.hospitalInput = "Please select or type an institution";
    }

    if (!file) newErrors.file = role === UserRole.HOSPITAL_ADMIN ? "Accreditation document required" : "Medical license required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    setErrors({});
    try {
      const fileName = file ? file.name : 'verification_doc.pdf';
      
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
        // Find matching hospital ID if possible - using case-insensitive match
        const matchedHospital = hospitals.find(h => h.name.toLowerCase().trim() === formData.hospitalInput.toLowerCase().trim());
        
        // If doctor selects a hospital not in the list, we still allow registration
        // but it might not show up for any specific admin until approved manually.
        // To fix the "not visible" issue, we MUST ensure hospitalId matches the admin's hospitalId.
        const hospitalId = matchedHospital ? matchedHospital.id : `legacy_${Date.now()}`;
        
        await registerDoctor(
          formData.fullName,
          formData.email,
          formData.password,
          hospitalId,
          formData.contactNumber,
          fileName
        );
      }
      setSuccess(true);
    } catch (err: any) {
      console.error("Registration failed:", err);
      setErrors({ general: err.message || "Registration failed. State could not be saved." });
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
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-lg w-full text-center border border-slate-200 animate-scale-up">
          <div className="w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Identity Saved</h2>
          <p className="text-slate-600 mb-10 leading-relaxed font-medium">
            Your application and credentials have been securely saved to the platform. 
            {role === UserRole.HOSPITAL_ADMIN 
              ? " Platform administrators have been notified of your registration request." 
              : " Your hospital medical director has been notified for staff verification."}
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-black transition shadow-2xl active:scale-95"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <div className="absolute top-6 left-6 z-50">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-700 hover:bg-slate-50 transition text-sm font-black uppercase tracking-tighter">
          <ChevronLeft className="w-4 h-4" /> Home
        </button>
      </div>

      <div className="hidden lg:flex w-2/5 bg-slate-950 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-96 h-96 bg-primary-600 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-10 right-10 w-[30rem] h-[30rem] bg-indigo-600 rounded-full blur-[120px]"></div>
        </div>
        <div className="relative z-10 px-16 text-center text-white space-y-8">
          <div className="w-24 h-24 bg-primary-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-3">
            <span className="text-5xl font-black text-white">G</span>
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-4">Onboarding</h1>
            <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-md mx-auto">
              Registering your profile secures your credentials for federated medical inquiry.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-sm border border-slate-200 p-12">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Register Profile</h2>
            <p className="text-slate-500 mt-2 font-bold uppercase text-xs tracking-widest">Saving encrypted identity to platform</p>
          </div>

          {errors.general && (
            <div className="mb-8 bg-red-50 border border-red-200 text-red-700 p-5 rounded-3xl text-sm flex items-start gap-4 animate-fade-in">
              <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
              <span className="font-bold">{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">Account Category</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => {setRole(UserRole.DOCTOR); setErrors({});}}
                  className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 ${role === UserRole.DOCTOR ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-lg scale-105' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                >
                  <div className={`p-3 rounded-2xl ${role === UserRole.DOCTOR ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Stethoscope className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Doctor</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {setRole(UserRole.HOSPITAL_ADMIN); setErrors({});}}
                  className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 ${role === UserRole.HOSPITAL_ADMIN ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-lg scale-105' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                >
                  <div className={`p-3 rounded-2xl ${role === UserRole.HOSPITAL_ADMIN ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Building2 className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Hospital</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Full Legal Name</label>
                <input 
                  type="text" 
                  className={`w-full p-4 bg-slate-50 border ${errors.fullName ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition text-slate-900 font-black`}
                  placeholder="e.g. Dr. John Doe"
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                />
                {errors.fullName && <p className="text-[10px] text-red-600 font-black mt-2 uppercase tracking-tight ml-1">{errors.fullName}</p>}
              </div>

              {role === UserRole.DOCTOR ? (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Select Hospital</label>
                  <input 
                    list="hospital-list"
                    type="text"
                    className={`w-full p-4 bg-white border-2 ${errors.hospitalInput ? 'border-red-300' : 'border-slate-100'} rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-900 font-black appearance-none cursor-pointer`}
                    placeholder="Search approved institutions..."
                    value={formData.hospitalInput}
                    onChange={e => setFormData({...formData, hospitalInput: e.target.value})}
                  />
                  <datalist id="hospital-list">
                    {hospitals.map(h => (
                      <option key={h.id} value={h.name}>{h.name}</option>
                    ))}
                  </datalist>
                  {errors.hospitalInput && <p className="text-[10px] text-red-600 font-black mt-2 uppercase tracking-tight ml-1">{errors.hospitalInput}</p>}
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Institution Name</label>
                    <input 
                      type="text" 
                      className={`w-full p-4 bg-slate-50 border ${errors.hospitalName ? 'border-red-300' : 'border-slate-200'} rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition text-slate-900 font-black`}
                      placeholder="e.g. Apollo Memorial Hospital"
                      value={formData.hospitalName}
                      onChange={e => setFormData({...formData, hospitalName: e.target.value})}
                    />
                    {errors.hospitalName && <p className="text-[10px] text-red-600 font-black mt-2 uppercase tracking-tight ml-1">{errors.hospitalName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Headquarters Address</label>
                    <input 
                      type="text" 
                      className={`w-full p-4 bg-slate-50 border ${errors.address ? 'border-red-300' : 'border-slate-200'} rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition text-slate-900 font-black`}
                      placeholder="Street name, City..."
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                    {errors.address && <p className="text-[10px] text-red-600 font-black mt-2 uppercase tracking-tight ml-1">{errors.address}</p>}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Email / Username</label>
                <input 
                  type="email" 
                  className={`w-full p-4 bg-slate-50 border ${errors.email ? 'border-red-300' : 'border-slate-200'} rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition text-slate-900 font-black`}
                  placeholder="user@domain.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
                {errors.email && <p className="text-[10px] text-red-600 font-black mt-2 uppercase tracking-tight ml-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Password</label>
                  <input 
                    type="password" 
                    className={`w-full p-4 bg-slate-50 border ${errors.password ? 'border-red-300' : 'border-slate-200'} rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition text-slate-900 font-black`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  {errors.password && <p className="text-[10px] text-red-600 font-black mt-2 uppercase tracking-tight ml-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Confirm</label>
                  <input 
                    type="password" 
                    className={`w-full p-4 bg-slate-50 border ${errors.confirmPassword ? 'border-red-300' : 'border-slate-200'} rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition text-slate-900 font-black`}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                  {errors.confirmPassword && <p className="text-[10px] text-red-600 font-black mt-2 uppercase tracking-tight ml-1">{errors.confirmPassword}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Primary Contact</label>
                <input 
                  type="tel" 
                  className={`w-full p-4 bg-slate-50 border ${errors.contactNumber ? 'border-red-300' : 'border-slate-200'} rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition text-slate-900 font-black`}
                  placeholder="+1 (000) 000-0000"
                  value={formData.contactNumber}
                  onChange={e => setFormData({...formData, contactNumber: e.target.value})}
                />
                {errors.contactNumber && <p className="text-[10px] text-red-600 font-black mt-2 uppercase tracking-tight ml-1">{errors.contactNumber}</p>}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">
                  {role === UserRole.DOCTOR ? 'Verification License (PDF)' : 'Accreditation Certification (PDF)'}
                </label>
                <div className={`relative border-2 border-dashed ${errors.file ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'} rounded-3xl p-10 hover:bg-white transition-all duration-300 text-center cursor-pointer group shadow-inner`}>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="application/pdf" />
                  <Upload className={`w-12 h-12 mx-auto mb-3 transition-transform group-hover:-translate-y-1 ${errors.file ? 'text-red-400' : 'text-slate-300 group-hover:text-primary-500'}`} />
                  <p className="text-sm font-black text-slate-600 uppercase tracking-tighter">{file ? file.name : "Select Certification PDF"}</p>
                </div>
                {errors.file && <p className="text-[10px] text-red-600 font-black mt-2 uppercase tracking-tight ml-1">{errors.file}</p>}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-base tracking-[0.2em] hover:bg-black transition-all duration-300 shadow-2xl disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  SAVING...
                </>
              ) : 'Submit Registration'}
            </button>
          </form>
          
          <div className="mt-12 text-center">
             <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
               Already have account? <Link to="/login" className="text-primary-600 hover:underline">Log In</Link>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
