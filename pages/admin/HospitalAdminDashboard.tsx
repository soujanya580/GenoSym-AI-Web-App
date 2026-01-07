
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUsers, approveDoctor, getPatientCases, getActionDiary } from '../../services/mockBackend';
import { User, UserRole, RegistrationStatus, PatientCase } from '../../types';
import { useAuth } from '../../App';
import { Building2, Stethoscope, Users, Eye, FileText, X, Search, ShieldAlert, Download, RefreshCw, CheckCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'STAFF' | 'CASES' | 'DIARY'>('STAFF');
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  
  const [decisionModal, setDecisionModal] = useState<{isOpen: boolean, email: string | null, type: 'APPROVE' | 'REJECT'}>({ isOpen: false, email: null, type: 'APPROVE' });
  const [decisionReason, setDecisionReason] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(() => {
    if (!currentUser?.hospitalId) return;
    const allUsers = getUsers();
    setDoctors(allUsers.filter(u => u.role === UserRole.DOCTOR && u.hospitalId === currentUser.hospitalId));
    setPatients(getPatientCases(currentUser.email));
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
          {['STAFF', 'CASES', 'DIARY'].map((t) => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              {t}
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
                    <tr><td colSpan={3} className="px-10 py-24 text-center text-slate-300 font-black uppercase tracking-widest">No staff records found</td></tr>
                  ) : (
                    filteredDoctors.map(doc => (
                      <tr key={doc.email} className="hover:bg-slate-50/50 transition-colors">
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
                          {doc.status === RegistrationStatus.PENDING ? (
                            <div className="flex justify-end gap-3 no-print">
                              <button onClick={() => setDecisionModal({ isOpen: true, email: doc.email, type: 'APPROVE' })} className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95">Approve</button>
                              <button onClick={() => setDecisionModal({ isOpen: true, email: doc.email, type: 'REJECT' })} className="px-6 py-3 bg-white border border-red-100 text-red-600 text-[10px] font-black uppercase rounded-2xl hover:bg-red-50 active:scale-95">Reject</button>
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
        {activeTab === 'CASES' && (
          <div className="bg-white p-24 rounded-[3rem] border border-slate-200 text-center text-slate-400 font-black uppercase tracking-widest">Institutional Patient Registry Active</div>
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
    </div>
  );
};

export default HospitalAdminDashboard;
