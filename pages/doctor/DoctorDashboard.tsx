
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import { getPatientCases, addLog } from '../../services/mockBackend';
import { PatientCase } from '../../types';
import { Users, FileText, Brain, Bell, Plus, ShieldCheck, Lock, Clock, Search, ArrowRight, Activity, Globe } from 'lucide-react';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<PatientCase[]>([]);

  useEffect(() => {
    if (user) {
      setCases(getPatientCases(user.email));
    }
  }, [user]);

  const handleStartNewCase = () => {
    addLog(`[AUDIT] ACTION: Dr. ${user?.name} initiated new case creation`, 'INFO');
    navigate('/doctor/new-case'); 
  };

  const handlePatientClick = (caseId: string, patientName: string) => {
    addLog(`[AUDIT] ACCESS: Dr. ${user?.name} accessed patient record ${caseId} - ${patientName}`, 'ALERT');
    navigate(`/patient/${caseId}`);
  };

  const handleQuickAnalysis = (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation(); // Prevent opening detail view
    addLog(`[AUDIT] ACTION: Dr. ${user?.name} quick-launched analysis for ${caseId}`, 'INFO');
    navigate('/doctor/analysis', { state: { caseId } });
  };

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      {/* HIPAA Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-lg flex flex-col md:flex-row items-center justify-between shadow-md border-l-4 border-blue-500 gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-blue-400" />
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider">HIPAA & GDPR Compliant Environment</h3>
            <p className="text-xs text-slate-400">Patient data access is strictly audited. Authorized personnel only.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1 rounded-full">
          <Lock className="w-3 h-3" />
          <span>256-bit SSL Encrypted Session</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Doctor Portal</h1>
          <p className="text-slate-500 mt-1">Welcome back, Doctor.</p>
        </div>
        <button 
          onClick={handleStartNewCase}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-600/20 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Start New Case Analysis
        </button>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        
        {/* Card 1: My Patients */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400">Total</span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-900">{cases.length}</h3>
            <p className="text-sm text-slate-500 font-medium">My Patients</p>
          </div>
        </div>

        {/* Card 2: Start New Case (Quick Action) */}
        <div 
          onClick={handleStartNewCase}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group flex flex-col justify-between h-40 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-primary-50 opacity-0 group-hover:opacity-100 transition duration-300" />
          <div className="flex justify-between items-start relative z-10">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
              <Plus className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-primary-700 group-hover:text-primary-800">Start New Case</h3>
            <p className="text-sm text-slate-500 mt-1">Initiate diagnostic workflow</p>
          </div>
        </div>

        {/* Card 3: Federated Network (New) */}
        <div 
          onClick={() => navigate('/federated-network')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition flex flex-col justify-between h-40 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-100 transition">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Active</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700">Network Status</h3>
            <p className="text-sm text-slate-500 font-medium">View Global Training</p>
          </div>
        </div>

        {/* Card 4: Medora-AI Assistant */}
        <div 
          onClick={() => navigate('/medora')}
          className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg text-white cursor-pointer flex flex-col justify-between h-40 hover:scale-[1.02] transition"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Brain className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold">Medora AI</h3>
            <p className="text-indigo-100 text-sm opacity-90">Assistant Active &rarr;</p>
          </div>
        </div>

        {/* Card 5: Notifications */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition flex flex-col justify-between h-40">
           <div className="flex justify-between items-start">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Bell className="w-5 h-5" />
            </div>
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
            <p className="text-sm text-slate-500 mt-1">System Updates</p>
          </div>
        </div>

      </div>

      {/* Patient List Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">Assigned Patient Cases</h3>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="w-full sm:w-72 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white transition"
            />
          </div>
        </div>
        
        {cases.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No patients currently assigned.</p>
            <button onClick={handleStartNewCase} className="mt-2 text-primary-600 hover:underline text-sm">Create your first case</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cases.map(c => (
              <div 
                key={c.id} 
                onClick={() => handlePatientClick(c.id, c.patientName)}
                className="p-6 hover:bg-slate-50 transition cursor-pointer group flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg group-hover:bg-primary-100 group-hover:text-primary-600 transition shrink-0">
                    {c.patientName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-primary-700 transition text-lg">{c.patientName}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="font-mono bg-slate-100 px-1.5 rounded">{c.id}</span>
                      <span className="text-slate-300">•</span>
                      <span>{c.age} Years Old</span>
                      <span className="text-slate-300">•</span>
                      <span className="flex gap-1">
                        {c.dataTypes.map(dt => (
                           <span key={dt} className="px-1.5 bg-gray-100 rounded text-[10px]">{dt}</span>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto justify-between sm:justify-end">
                  <div className="flex gap-4 w-full sm:w-auto justify-between">
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${c.diagnosisStatus === 'Diagnosed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          c.diagnosisStatus === 'Analyzing' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                          'bg-slate-50 text-slate-600 border-slate-100'}`}>
                        {c.diagnosisStatus === 'Analyzing' && <Activity className="w-3 h-3 mr-1 animate-pulse" />}
                        {c.diagnosisStatus}
                      </span>
                    </div>
                    
                    <div className="text-center sm:text-left hidden sm:block">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Last Updated</p>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(c.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Open Case Analysis Button - Distinct Action */}
                    <button 
                      onClick={(e) => handleQuickAnalysis(e, c.id)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white border border-primary-200 text-primary-600 text-sm font-bold rounded-lg hover:bg-primary-50 hover:border-primary-300 transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <Brain className="w-4 h-4" /> Analysis
                    </button>
                    
                    <div className="p-2 text-slate-300 group-hover:text-primary-600 transition rounded-full hover:bg-slate-100">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
