
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientById, addLog } from '../../services/mockBackend';
import { PatientCase, UserRole } from '../../types';
import { useAuth } from '../../App';
import { 
  User, Calendar, Activity, FileText, Dna, Image as ImageIcon, 
  Brain, ShieldCheck, Clock, ChevronRight, AlertCircle, Lock, TestTube 
} from 'lucide-react';

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<PatientCase | null>(null);

  useEffect(() => {
    if (id) {
      const data = getPatientById(id);
      setPatient(data || null);
    }
  }, [id]);

  if (!patient) {
    return <div className="p-8 text-center text-gray-500">Patient not found</div>;
  }

  const handleOpenAnalysis = () => {
    if (user?.role === UserRole.HOSPITAL_ADMIN) return;
    addLog(`[AUDIT] Dr. ${user?.name} opened analysis workspace for ${patient.id}`, 'INFO');
    navigate('/doctor/analysis', { state: { caseId: patient.id } });
  };

  const isHospitalAdmin = user?.role === UserRole.HOSPITAL_ADMIN;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-2xl">
            {patient.patientName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{patient.patientName}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{patient.id}</span>
              <span>•</span>
              <span>{patient.age} Years Old</span>
              <span>•</span>
              <span>{patient.gender}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className={`px-3 py-1 rounded-full text-sm font-bold border ${
             patient.diagnosisStatus === 'Diagnosed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
             patient.diagnosisStatus === 'Analyzing' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
             'bg-amber-50 text-amber-700 border-amber-100'
           }`}>
             {patient.diagnosisStatus}
           </div>
           <p className="text-xs text-slate-400">Last Updated: {new Date(patient.lastUpdated).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Demographics & Consent */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" /> Patient Details
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 text-sm">Date of Birth</span>
                <span className="text-slate-900 font-medium text-sm">Jan 12, {new Date().getFullYear() - patient.age}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 text-sm">Blood Type</span>
                <span className="text-slate-900 font-medium text-sm">{patient.bloodType || 'Unknown'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 text-sm">Contact</span>
                <span className="text-slate-900 font-medium text-sm">Hidden (HIPAA)</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-400" /> Consent & Privacy
            </h3>
            <div className="flex items-center gap-3 mb-4">
               <div className={`w-3 h-3 rounded-full ${patient.consentStatus ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
               <span className="text-sm font-medium text-slate-700">
                 {patient.consentStatus ? 'Full Research Consent Signed' : 'Consent Pending'}
               </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Patient has agreed to data processing for rare disease diagnostics within the federated learning network. Data remains anonymized.
            </p>
            <button className="mt-4 w-full py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 font-medium">
              View Signed Forms
            </button>
          </div>
        </div>

        {/* Middle Column: Data Sources & Analysis Action */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" /> Clinical Data Sources
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-center ${patient.dataTypes.includes('Genomic') ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400 grayscale'}`}>
                <Dna className="w-6 h-6" />
                <span className="text-xs font-bold">Genomic</span>
              </div>
              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-center ${patient.dataTypes.includes('Biomarker') ? 'bg-teal-50 border-teal-100 text-teal-700' : 'bg-slate-50 border-slate-100 text-slate-400 grayscale'}`}>
                <TestTube className="w-6 h-6" />
                <span className="text-xs font-bold">Biomarker</span>
              </div>
              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-center ${patient.dataTypes.includes('Proteomic') ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-slate-50 border-slate-100 text-slate-400 grayscale'}`}>
                <Activity className="w-6 h-6" />
                <span className="text-xs font-bold">Proteomic</span>
              </div>
              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-center ${patient.dataTypes.includes('Imaging') ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400 grayscale'}`}>
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs font-bold">Imaging</span>
              </div>
              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-center ${patient.dataTypes.includes('EHR') ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-400 grayscale'}`}>
                <FileText className="w-6 h-6" />
                <span className="text-xs font-bold">EHR History</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              {isHospitalAdmin ? (
                 <div className="bg-gray-100 p-4 rounded-xl text-center border border-gray-200">
                   <Lock className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                   <p className="text-sm font-bold text-gray-600">Analysis Restricted</p>
                   <p className="text-xs text-gray-500 mt-1">Hospital Administrators cannot view detailed diagnostic insights.</p>
                 </div>
              ) : (
                <button 
                  onClick={handleOpenAnalysis}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition flex items-center justify-center gap-2"
                >
                  <Brain className="w-5 h-5" /> Open Case Analysis
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h3 className="text-lg font-bold text-slate-900 mb-2">Symptoms</h3>
             <div className="flex flex-wrap gap-2">
               {patient.symptoms.map((s, i) => (
                 <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full border border-red-100 font-medium">
                   {s}
                 </span>
               ))}
             </div>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
           <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" /> Case History
           </h3>
           <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
             {patient.timeline.map((event, idx) => (
               <div key={event.id} className="relative pl-6">
                 <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                   event.type === 'medical' ? 'bg-blue-500' : 
                   event.type === 'upload' ? 'bg-purple-500' : 'bg-slate-400'
                 }`}></div>
                 <span className="text-xs font-mono text-slate-400 block mb-1">{event.date}</span>
                 <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                 <p className="text-sm text-slate-500 mt-1">{event.description}</p>
               </div>
             ))}
             
             {/* Future Placeholder */}
             <div className="relative pl-6 opacity-50">
               <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-slate-200"></div>
               <h4 className="text-sm font-bold text-slate-400">Next Follow-up</h4>
               <p className="text-sm text-slate-400">Scheduled for next month</p>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default PatientDetail;