
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUsers, approveDoctor, getPatientCases, getActionDiary } from '../../services/mockBackend';
import { User, UserRole, RegistrationStatus, PatientCase } from '../../types';
import { useAuth } from '../../App';
import { Building2, Stethoscope, Users, Eye, AlertTriangle, FileText, UserPlus, ShieldAlert, BookOpen, Download, LayoutDashboard, Search, File, X, Filter, CheckCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const HospitalAdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const exportRef = useRef<HTMLDivElement>(null);
  
  const [doctors, setDoctors] = useState<User[]>([]);
  const [patients, setPatients] = useState<PatientCase[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'PRACTITIONERS' | 'PATIENTS' | 'DIARY'>('PRACTITIONERS');
  const [doctorFilter, setDoctorFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  
  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{isOpen: boolean, email: string | null, type: 'APPROVE' | 'REJECT'}>({ isOpen: false, email: null, type: 'APPROVE' });
  const [decisionReason, setDecisionReason] = useState('');

  const [docViewModal, setDocViewModal] = useState<{isOpen: boolean, user: User | null}>({ isOpen: false, user: null });
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(() => {
    if (!currentUser?.hospitalId) return;
    const allUsers = getUsers();
    const hospitalDoctors = allUsers.filter(u => u.role === UserRole.DOCTOR && u.hospitalId === currentUser.hospitalId);
    setDoctors(hospitalDoctors);
    const allCases = getPatientCases(currentUser.email);
    setPatients(allCases);
    const diary = getActionDiary(currentUser.hospitalId);
    setDiaryEntries(diary.filter(e => e.type === 'DOCTOR'));
  }, [currentUser]);

  useEffect(() => {
    fetchData();
    window.addEventListener('usersUpdated', fetchData);
    window.addEventListener('diaryUpdated', fetchData);
    window.addEventListener('logUpdated', fetchData);
    return () => {
      window.removeEventListener('usersUpdated', fetchData);
      window.removeEventListener('diaryUpdated', fetchData);
      window.removeEventListener('logUpdated', fetchData);
    };
  }, [fetchData]);

  const openDecisionModal = (email: string, type: 'APPROVE' | 'REJECT') => {
    setDecisionModal({ isOpen: true, email, type });
    setDecisionReason(type === 'APPROVE' ? 'Credentials verified and license authenticated.' : '');
  };

  const handleDecisionSubmit = async () => {
    if (!decisionModal.email || !decisionReason.trim()) return;
    const isApproved = decisionModal.type === 'APPROVE';
    await approveDoctor(decisionModal.email, isApproved, decisionReason, currentUser?.email);
    setDecisionModal({ isOpen: false, email: null, type: 'APPROVE' });
    setDecisionReason('');
    fetchData();
  };

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`Institutional_Audit_${currentUser?.hospitalId}.pdf`);
    } catch (err) { alert("PDF Generation failed."); } finally { setIsExporting(false); }
  };

  const filteredDoctors = doctors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = doctorFilter === 'ALL' ? true : d.status === doctorFilter;
    return matchesSearch && matchesFilter;
  }).sort((a,b) => (a.status === RegistrationStatus.PENDING && b.status !== RegistrationStatus.PENDING ? -1 : 1));

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-12">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 no-print">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-primary-100 rounded-[2rem] text-primary-600 shadow-inner group"><Building2 className="w-10 h-10 group-hover:scale-110 transition" /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Institution Portal</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">ID: {currentUser?.hospitalId}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
            {['PRACTITIONERS', 'PATIENTS', 'DIARY'].map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab as any); setSearchTerm(''); }} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                {tab === 'PRACTITIONERS' ? 'Staff' : tab === 'PATIENTS' ? 'Cases' : 'Diary'}
              </button>
            ))}
          </div>
          <button onClick={handleExportPDF} disabled={isExporting} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-black transition disabled:opacity-50 shadow-xl shadow-slate-900/20 uppercase tracking-widest active:scale-95">
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {isExporting ? 'Generating...' : 'Export Audit PDF'}
          </button>
        </div>
      </div>

      <div ref={exportRef} className="space-y-8">
        {activeTab === 'PRACTITIONERS' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 no-print">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input type="text" placeholder="Search Staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold transition" />
               </div>
               <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                  {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
                    <button key={f} onClick={() => setDoctorFilter(f as any)} className={`px-6 py-2.5 text-[10px] font-black rounded-xl transition-all duration-300 uppercase tracking-widest ${doctorFilter === f ? 'bg-white text-slate-900 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
                  ))}
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Practitioner</th>
                    <th className="px-10 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Credentials</th>
                    <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Decision</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredDoctors.length === 0 ? (
                    <tr><td colSpan={4} className="px-10 py-24 text-center text-slate-300 font-black uppercase tracking-widest">No staff records found</td></tr>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <tr key={doc.email} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6"><div className="font-black text-slate-900">{doc.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{doc.email}</div></td>
                        <td className="px-10 py-6 text-center"><span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full border ${doc.status === RegistrationStatus.APPROVED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : doc.status === RegistrationStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{doc.status}</span></td>
                        <td className="px-10 py-6"><button onClick={() => setDocViewModal({ isOpen: true, user: doc })} className="flex items-center gap-2 text-[10px] text-primary-600 font-black uppercase hover:underline"><FileText className="w-4 h-4" /> Review</button></td>
                        <td className="px-10 py-6 text-right">
                          {doc.status === RegistrationStatus.PENDING ? (
                            <div className="flex justify-end gap-3 no-print">
                              <button onClick={() => openDecisionModal(doc.email, 'APPROVE')} className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95">Approve</button>
                              <button onClick={() => openDecisionModal(doc.email, 'REJECT')} className="px-6 py-3 bg-white border border-red-100 text-red-600 text-[10px] font-black uppercase rounded-2xl hover:bg-red-50 active:scale-95">Deny</button>
                            </div>
                          ) : <div className="text-slate-300 font-black text-[10px] uppercase tracking-widest pr-4">Resolved</div>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'PATIENTS' && <div className="bg-white rounded-[3rem] border border-slate-200 p-24 text-center text-slate-400 font-black uppercase tracking-widest">Institutional Case Registry Active</div>}
      </div>

      {decisionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-[250] px-6">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl p-16 border border-slate-200 animate-scale-up text-center">
            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-10 mx-auto ${decisionModal.type === 'APPROVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}><ShieldAlert className="w-12 h-12" /></div>
            <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">Resolution Verdict</h3>
            <p className="text-slate-500 mb-8 font-bold leading-relaxed">Please state the mandatory rationale for this {decisionModal.type.toLowerCase()} decision.</p>
            <textarea value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none text-slate-900 font-black focus:ring-4 transition-all" placeholder="Enter audit reasoning..." />
            <div className="flex gap-6 mt-10">
              <button onClick={() => setDecisionModal({ isOpen: false, email: null, type: 'APPROVE' })} className="flex-1 py-6 text-slate-500 font-black uppercase text-xs hover:bg-slate-100 rounded-[2rem]">Cancel</button>
              <button onClick={handleDecisionSubmit} disabled={!decisionReason.trim()} className={`flex-[2] py-6 text-white font-black uppercase text-xs rounded-[2rem] shadow-2xl disabled:opacity-30 ${decisionModal.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'}`}>Finalize & Log</button>
            </div>
          </div>
        </div>
      )}

      {docViewModal.isOpen && docViewModal.user && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[150] px-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-slate-200 animate-scale-up overflow-hidden">
            <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-5"><div className="p-4 bg-primary-600 text-white rounded-[1.5rem] shadow-lg"><FileText className="w-8 h-8" /></div><div><h3 className="text-2xl font-black text-slate-900 tracking-tight">Credential Audit Portal</h3><p className="text-[10px] text-slate-400 font-black uppercase mt-1">{docViewModal.user.name}</p></div></div>
              <button onClick={() => setDocViewModal({ isOpen: false, user: null })} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition shadow-sm"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 p-10 overflow-y-auto flex flex-col lg:flex-row gap-10">
              <div className="lg:w-2/3 bg-slate-100 rounded-[3rem] border border-slate-200 flex items-center justify-center"><div className="w-full max-w-md bg-white p-12 rounded-2xl shadow-xl border border-slate-200 rotate-1 animate-pulse"><div className="h-4 bg-slate-50 w-full mb-4 rounded"></div><div className="h-4 bg-slate-50 w-3/4 mb-4 rounded"></div><div className="h-4 bg-slate-50 w-5/6 rounded"></div><div className="mt-10 pt-10 border-t flex justify-between"><div className="w-16 h-4 bg-slate-100 rounded"></div><div className="w-16 h-4 bg-slate-100 rounded"></div></div></div></div>
              <div className="lg:w-1/3 space-y-8">
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Metadata</h4><div className="space-y-5"><div><p className="text-[10px] font-black text-slate-500 uppercase">Document Name</p><p className="text-sm font-black text-slate-900">{docViewModal.user.licenseDocument || 'VERIFY_DOC.PDF'}</p></div><div><p className="text-[10px] font-black text-slate-500 uppercase">Status</p><p className="text-sm font-black text-slate-900 uppercase">{docViewModal.user.status}</p></div></div></div>
                {docViewModal.user.status === RegistrationStatus.PENDING && (
                  <div className="space-y-4">
                    <button onClick={() => { openDecisionModal(docViewModal.user!.email, 'APPROVE'); setDocViewModal({ isOpen: false, user: null }); }} className="w-full py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95">Approve Account</button>
                    <button onClick={() => { openDecisionModal(docViewModal.user!.email, 'REJECT'); setDocViewModal({ isOpen: false, user: null }); }} className="w-full py-6 bg-white border-2 border-red-50 text-red-600 rounded-[1.5rem] font-black uppercase text-xs hover:bg-red-50 transition active:scale-95">Deny Entry</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalAdminDashboard;
