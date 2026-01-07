
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUsers, approveDoctor, getPatientCases, getActionDiary } from '../../services/mockBackend';
import { User, UserRole, RegistrationStatus, PatientCase } from '../../types';
import { useAuth } from '../../App';
import { Building2, Stethoscope, Users, Eye, FileText, X, Search, ShieldAlert, Download, RefreshCw, CheckCircle, ShieldCheck, Printer, BookOpen, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const HospitalAdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const exportRef = useRef<HTMLDivElement>(null);
  const licenseRef = useRef<HTMLDivElement>(null);
  
  const [doctors, setDoctors] = useState<User[]>([]);
  const [hospitalCases, setHospitalCases] = useState<PatientCase[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'STAFF' | 'CASES' | 'DIARY'>('STAFF');
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  
  const [decisionModal, setDecisionModal] = useState<{isOpen: boolean, email: string | null, type: 'APPROVE' | 'REJECT'}>({ isOpen: false, email: null, type: 'APPROVE' });
  const [viewDocModal, setViewDocModal] = useState<{ isOpen: boolean, user: User | null }>({ isOpen: false, user: null });
  const [decisionReason, setDecisionReason] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(() => {
    if (!currentUser?.hospitalId) return;
    const allUsers = getUsers();
    const hospitalStaff = allUsers.filter(u => u.role === UserRole.DOCTOR && u.hospitalId === currentUser.hospitalId);
    setDoctors(hospitalStaff);
    
    // In hospital admin mode, getPatientCases(currentUser.email) returns all cases for the hospital
    setHospitalCases(getPatientCases(currentUser.email));
    setDiaryEntries(getActionDiary(currentUser.hospitalId).filter(e => e.type === 'DOCTOR'));
  }, [currentUser]);

  useEffect(() => {
    fetchData();
    window.addEventListener('usersUpdated', fetchData);
    window.addEventListener('diaryUpdated', fetchData);
    return () => {
      window.removeEventListener('usersUpdated', fetchData);
      window.removeEventListener('diaryUpdated', fetchData);
    };
  }, [fetchData]);

  const handleDecisionSubmit = async () => {
    if (!decisionModal.email || !decisionReason.trim()) return;
    await approveDoctor(decisionModal.email, decisionModal.type === 'APPROVE', decisionReason, currentUser!.email);
    setDecisionModal({ isOpen: false, email: null, type: 'APPROVE' });
    setDecisionReason('');
    fetchData();
  };

  const handleDownloadLicense = async () => {
    if (!licenseRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(licenseRef.current, { scale: 3 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`Staff_License_${viewDocModal.user?.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, { scale: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`Institutional_Audit_${currentUser?.hospitalId}.pdf`);
    } finally { setIsExporting(false); }
  };

  const filteredDoctors = doctors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filter === 'ALL' ? true : d.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 no-print">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-primary-100 rounded-[2rem] text-primary-600 shadow-inner group"><Building2 className="w-10 h-10 group-hover:scale-110 transition" /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Institutional Portal</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Institutional ID: {currentUser?.hospitalId}</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          {[
            { id: 'STAFF', label: 'Medical Staff' },
            { id: 'CASES', label: 'Case Registry' },
            { id: 'DIARY', label: 'Action Diary' }
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              {t.label}
            </button>
          ))}
          <button onClick={handleExportPDF} disabled={isExporting} className="ml-4 p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition disabled:opacity-50"><Download className="w-4 h-4" /></button>
        </div>
      </div>

      <div ref={exportRef} className="space-y-6">
        {activeTab === 'STAFF' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 no-print">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input type="text" placeholder="Search Identity..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" />
               </div>
               <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                  {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
                    <button key={f} onClick={() => setFilter(f as any)} className={`px-6 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${filter === f ? 'bg-white text-slate-900 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
                  ))}
               </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-10 py-6">Practitioner Identity</th>
                    <th className="px-10 py-6 text-center">Security State</th>
                    <th className="px-10 py-6 text-right">Administrative Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoctors.length === 0 ? (
                    <tr><td colSpan={3} className="px-10 py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <Users className="w-12 h-12 text-slate-200" />
                            <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No medical staff records found.</p>
                        </div>
                    </td></tr>
                  ) : (
                    filteredDoctors.map(doc => (
                      <tr key={doc.email} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6">
                           <div className="font-black text-slate-900">{doc.name}</div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{doc.email}</div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full border ${doc.status === RegistrationStatus.APPROVED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : doc.status === RegistrationStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <div className="flex justify-end gap-3 no-print">
                              <button onClick={() => setViewDocModal({ isOpen: true, user: doc })} className="p-3 bg-slate-100 text-slate-400 hover:text-primary-600 rounded-xl transition hover:bg-primary-50"><Eye className="w-5 h-5" /></button>
                              {doc.status === RegistrationStatus.PENDING ? (
                                <>
                                  <button onClick={() => setDecisionModal({ isOpen: true, email: doc.email, type: 'APPROVE' })} className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition">Approve</button>
                                  <button onClick={() => setDecisionModal({ isOpen: true, email: doc.email, type: 'REJECT' })} className="px-6 py-3 bg-white border border-red-100 text-red-600 text-[10px] font-black uppercase rounded-2xl hover:bg-red-50 active:scale-95 transition">Reject</button>
                                </>
                              ) : <div className="text-slate-300 font-black text-[10px] uppercase tracking-widest pr-4 flex items-center">RESOLVED</div>}
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'CASES' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                   <FileText className="w-6 h-6 text-primary-600" /> Institutional Case Registry
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {hospitalCases.length === 0 ? (
                      <div className="col-span-full p-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                         <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                         <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No institutional cases found yet.</p>
                      </div>
                   ) : (
                      hospitalCases.map((c) => (
                         <div key={c.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-lg transition-all group cursor-pointer" onClick={() => navigate(`/patient/${c.id}`)}>
                            <div className="flex justify-between items-start mb-4">
                               <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center font-black text-white">{c.patientName.charAt(0)}</div>
                               <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">{c.diagnosisStatus}</span>
                            </div>
                            <h4 className="font-black text-slate-900 tracking-tight">{c.patientName}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {c.id}</p>
                            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">By: {c.assignedDoctorEmail.split('@')[0]}</p>
                               <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-1 transition" />
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'DIARY' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                   <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl"><BookOpen className="w-6 h-6" /></div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Decision Ledger</h3>
                </div>
                
                <div className="space-y-4">
                   {diaryEntries.length === 0 ? (
                      <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                         <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                         <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No administrative actions recorded yet.</p>
                      </div>
                   ) : (
                      diaryEntries.map((entry, idx) => (
                         <div key={idx} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:bg-white hover:shadow-md transition-all">
                            <div className="flex items-center gap-5">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${entry.action === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                  {entry.action === 'APPROVED' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                               </div>
                               <div>
                                  <p className="text-base font-black text-slate-900 tracking-tight">Staff: {entry.targetName}</p>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized By: {entry.actorEmail}</p>
                               </div>
                            </div>
                            <div className="flex-1 md:px-10">
                               <p className="text-xs text-slate-500 font-bold leading-relaxed">Rationale: {entry.reason}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(entry.timestamp).toLocaleDateString()}</p>
                               <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        )}
      </div>

      {decisionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-[250] px-6 no-print">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl p-16 border border-slate-200 animate-scale-up text-center">
            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-10 mx-auto ${decisionModal.type === 'APPROVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              <ShieldAlert className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">Decision Rationale</h3>
            <p className="text-slate-500 mb-8 font-bold leading-relaxed">Provide administrative reasoning for this {decisionModal.type.toLowerCase()} action.</p>
            <textarea value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none text-slate-900 font-black focus:ring-4 transition-all" placeholder="Enter mandatory rationale..." />
            <div className="flex gap-6 mt-10">
              <button onClick={() => setDecisionModal({ isOpen: false, email: null, type: 'APPROVE' })} className="flex-1 py-6 text-slate-500 font-black uppercase text-xs hover:bg-slate-100 rounded-[2rem]">Cancel</button>
              <button onClick={handleDecisionSubmit} disabled={!decisionReason.trim()} className={`flex-[2] py-6 text-white font-black uppercase text-xs rounded-[2rem] shadow-2xl disabled:opacity-30 ${decisionModal.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'}`}>Finalize Resolution</button>
            </div>
          </div>
        </div>
      )}

      {viewDocModal.isOpen && viewDocModal.user && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[300] p-6 lg:p-12 overflow-y-auto no-print">
          <div className="bg-white rounded-[4rem] w-full max-w-5xl min-h-[90vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden my-auto">
             <div className="p-10 border-b flex justify-between items-center bg-slate-900 text-white">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-emerald-600 rounded-xl"><ShieldCheck className="w-8 h-8 text-white" /></div>
                   <div>
                     <h2 className="text-2xl font-black tracking-tight uppercase">Staff Credential Audit</h2>
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">Resource Archive: {viewDocModal.user.licenseDocument || 'MEDICAL_LICENSE.PDF'}</p>
                   </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleDownloadLicense} 
                    disabled={isExporting}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-emerald-700 transition shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExporting ? 'Generating...' : 'Download PDF'}
                  </button>
                  <button 
                    onClick={() => setViewDocModal({ isOpen: false, user: null })} 
                    className="p-3 bg-white/10 text-white hover:bg-white/20 rounded-2xl transition shadow-sm flex items-center gap-2"
                  >
                    <X className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest mr-2">Close View</span>
                  </button>
                </div>
             </div>
             <div className="flex-1 bg-slate-100 p-8 lg:p-20 flex items-center justify-center overflow-y-auto">
                <div ref={licenseRef} className="w-full max-w-3xl bg-white shadow-2xl p-16 lg:p-24 rounded-none border-[12px] border-slate-50 relative print:shadow-none print:border-none">
                   <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden">
                      <div className="w-[600px] h-[600px] border-[40px] border-slate-900 rounded-full flex items-center justify-center text-center">
                        <span className="text-8xl font-black uppercase rotate-[-30deg]">OFFICIAL INSTITUTIONAL RECORD</span>
                      </div>
                   </div>

                   <div className="relative z-10 space-y-12 text-center font-serif text-slate-800">
                     <h1 className="text-5xl font-bold tracking-tight mb-2 border-b-2 border-slate-200 pb-8">Medical Practice License <span className="text-xl block text-slate-400 mt-2 font-sans font-black uppercase tracking-widest">(Demo Only)</span></h1>
                     
                     <div className="grid grid-cols-1 text-left gap-8 text-xl">
                        <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                           <span className="font-sans font-black uppercase text-xs text-slate-400 tracking-widest">License Number:</span>
                           <span className="font-bold">MED-FAKE-IND-1000{viewDocModal.user.email.length % 10}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                           <span className="font-sans font-black uppercase text-xs text-slate-400 tracking-widest">Doctor Name:</span>
                           <span className="font-bold text-2xl uppercase tracking-tighter">{viewDocModal.user.name}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                           <span className="font-sans font-black uppercase text-xs text-slate-400 tracking-widest">Affiliated Hospital:</span>
                           <span className="font-bold">{currentUser?.hospitalId || 'Genosym Health Network'}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                           <span className="font-sans font-black uppercase text-xs text-slate-400 tracking-widest">Issued By:</span>
                           <span className="font-bold italic">National Medical Licensing Authority (Demo)</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                           <span className="font-sans font-black uppercase text-xs text-slate-400 tracking-widest">Validity:</span>
                           <span className="font-bold">01-Jan-2025 to 31-Dec-2030</span>
                        </div>
                     </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalAdminDashboard;
