
import React, { useState, useEffect, useCallback } from 'react';
import { getHospitals, approveHospital, getSystemAnalytics, getAuditLogs, getActionDiary, getUsers } from '../../services/mockBackend';
import { Hospital, RegistrationStatus, AuditLogEntry, User } from '../../types';
import { Building2, AlertTriangle, FileCheck, Eye, BookOpen, ShieldAlert, TrendingUp, BarChart3, Users, Mail, UserCheck, Search, Filter, X, MapPin, Phone, Calendar, FileText, CheckCircle, ShieldCheck } from 'lucide-react';
import { CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, BarChart, Bar, Cell } from 'recharts';

const GROWTH_DATA = [
  { name: 'Week 1', hospitals: 1, activity: 10 },
  { name: 'Week 2', hospitals: 2, activity: 25 },
  { name: 'Week 3', hospitals: 4, activity: 45 },
  { name: 'Week 4', hospitals: 8, activity: 70 },
  { name: 'Week 5', hospitals: 12, activity: 110 },
];

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'HOSPITALS' | 'USERS' | 'LEDGER' | 'AUDIT'>('OVERVIEW');
  const [hospitalFilter, setHospitalFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [decisionModal, setDecisionModal] = useState<{ isOpen: boolean, id: string | null, type: 'APPROVE' | 'REJECT' }>({ isOpen: false, id: null, type: 'APPROVE' });
  const [viewModal, setViewModal] = useState<{ isOpen: boolean, hospital: Hospital | null }>({ isOpen: false, hospital: null });
  const [docReviewModal, setDocReviewModal] = useState<{ isOpen: boolean, title: string }>({ isOpen: false, title: '' });
  const [decisionReason, setDecisionReason] = useState('');

  const fetchData = useCallback(() => {
    const allHospitals = getHospitals();
    const currentUsers = getUsers();
    setHospitals(allHospitals);
    setAllUsers(currentUsers);
    setAnalytics(getSystemAnalytics());
    setAuditLogs(getAuditLogs());
    setDiaryEntries(getActionDiary().filter(e => e.type === 'HOSPITAL'));
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener('usersUpdated', fetchData);
    window.addEventListener('diaryUpdated', fetchData);
    window.addEventListener('logUpdated', fetchData);
    const interval = setInterval(fetchData, 3000);
    return () => {
      window.removeEventListener('usersUpdated', fetchData);
      window.removeEventListener('diaryUpdated', fetchData);
      window.removeEventListener('logUpdated', fetchData);
      clearInterval(interval);
    };
  }, [fetchData]);

  const openDecisionModal = (id: string, type: 'APPROVE' | 'REJECT') => {
    setDecisionModal({ isOpen: true, id, type });
    setDecisionReason('');
  };

  const handleDecisionSubmit = async () => {
    if (!decisionModal.id || !decisionReason.trim()) return;
    const isApproved = decisionModal.type === 'APPROVE';
    await approveHospital(decisionModal.id, isApproved, decisionReason);
    setDecisionModal({ isOpen: false, id: null, type: 'APPROVE' });
    fetchData();
  };

  const filteredHospitals = hospitals.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || h.adminEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = hospitalFilter === 'ALL' ? true : h.status === hospitalFilter;
    return matchesSearch && matchesStatus;
  }).sort((a,b) => (a.status === 'PENDING' && b.status !== 'PENDING' ? -1 : 1));

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Command Center</h1>
          <p className="text-slate-500 mt-1 font-bold uppercase text-xs tracking-[0.2em]">Platform Governance</p>
        </div>
        <div className="bg-white border border-slate-200 p-2 rounded-[1.5rem] shadow-sm flex flex-wrap gap-1">
          {['OVERVIEW', 'HOSPITALS', 'USERS', 'LEDGER', 'AUDIT'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>
              {tab === 'LEDGER' ? 'Diary' : tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl text-blue-600 flex items-center justify-center shadow-inner"><Building2 className="w-8 h-8" /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Institutions</p><p className="text-3xl font-black text-slate-900">{analytics.totalHospitals}</p></div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl text-amber-600 flex items-center justify-center shadow-inner"><AlertTriangle className="w-8 h-8" /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p><p className="text-3xl font-black text-slate-900">{analytics.pendingHospitals}</p></div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl text-emerald-600 flex items-center justify-center shadow-inner"><Users className="w-8 h-8" /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Users</p><p className="text-3xl font-black text-slate-900">{analytics.totalUsers}</p></div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl text-purple-600 flex items-center justify-center shadow-inner"><TrendingUp className="w-8 h-8" /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health</p><p className="text-3xl font-black text-slate-900 tracking-tighter">ACTIVE</p></div>
            </div>
          </div>
          {/* Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter">
                <BarChart3 className="w-5 h-5 text-primary-500" /> Institution Status
               </h3>
               <div className="h-72">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={[
                     { name: 'Approved', value: hospitals.filter(h => h.status === 'APPROVED').length, color: '#10b981' },
                     { name: 'Pending', value: hospitals.filter(h => h.status === 'PENDING').length, color: '#f59e0b' },
                     { name: 'Rejected', value: hospitals.filter(h => h.status === 'REJECTED').length, color: '#ef4444' },
                   ]}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" fontSize={10} stroke="#334155" fontWeight="black" />
                     <YAxis fontSize={10} stroke="#94a3b8" />
                     <Tooltip cursor={{fill: '#f8fafc'}} />
                     <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                       <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> Platform Scaling
               </h3>
               <div className="h-72">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={GROWTH_DATA}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" fontSize={10} stroke="#334155" fontWeight="black" />
                     <YAxis fontSize={10} stroke="#94a3b8" />
                     <Tooltip />
                     <Line type="monotone" dataKey="activity" stroke="#6366f1" strokeWidth={6} dot={{r: 8, fill: '#6366f1', strokeWidth: 3, stroke: '#fff'}} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'HOSPITALS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 no-print">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input type="text" placeholder="Search Institutions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold transition" />
             </div>
             <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                {['PENDING', 'APPROVED', 'ALL'].map(f => (
                  <button key={f} onClick={() => setHospitalFilter(f as any)} className={`px-8 py-3 text-[10px] font-black rounded-xl transition uppercase tracking-widest ${hospitalFilter === f ? 'bg-white text-slate-900 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>
                    {f}
                  </button>
                ))}
              </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b">
                  <tr>
                    <th className="px-10 py-6">Institution Identity</th>
                    <th className="px-10 py-6 text-center">Lifecycle Status</th>
                    <th className="px-10 py-6 text-right">Administrative Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHospitals.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary-100 border border-primary-200 rounded-2xl flex items-center justify-center font-black text-primary-700 shadow-inner">{h.name.charAt(0)}</div>
                          <div><p className="text-base font-black text-slate-900 leading-tight">{h.name}</p><p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{h.adminEmail}</p></div>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase border shadow-sm ${h.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : h.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'}`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-3 no-print">
                          <button onClick={() => setViewModal({ isOpen: true, hospital: h })} className="p-3 bg-slate-100 text-slate-400 hover:text-primary-600 rounded-xl transition hover:bg-primary-50"><Eye className="w-5 h-5" /></button>
                          {h.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <button onClick={() => openDecisionModal(h.id, 'APPROVE')} className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition">Approve</button>
                              <button onClick={() => openDecisionModal(h.id, 'REJECT')} className="px-6 py-3 bg-white border border-red-200 text-red-600 text-[10px] font-black uppercase rounded-2xl hover:bg-red-50 transition">Deny</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Detailed View Modal */}
      {viewModal.isOpen && viewModal.hospital && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-[120] px-6">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl p-16 border border-slate-200 animate-scale-up relative">
            <button onClick={() => setViewModal({ isOpen: false, hospital: null })} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition"><X className="w-6 h-6" /></button>
            <div className="flex items-center gap-6 mb-10">
              <div className="w-20 h-20 bg-primary-600 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-primary-500/30">
                {viewModal.hospital.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{viewModal.hospital.name}</h3>
                <span className={`mt-2 inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase border ${viewModal.hospital.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{viewModal.hospital.status} Registry</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Identity</p>
                <p className="text-sm font-bold text-slate-800">{viewModal.hospital.adminEmail}</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">{viewModal.hospital.address}</p>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Dossier</p>
                <button 
                  onClick={() => setDocReviewModal({ isOpen: true, title: viewModal.hospital?.accreditationDocument || 'VERIFY_DOC.PDF' })}
                  className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl w-full hover:bg-white hover:border-primary-200 transition group"
                >
                  <FileText className="w-6 h-6 text-primary-600 group-hover:scale-110 transition" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Review Accreditation</p>
                    <p className="text-[10px] text-slate-400 font-bold">DIGITAL INSPECTION</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex gap-4">
               {viewModal.hospital.status === 'PENDING' && (
                 <>
                  <button onClick={() => { setViewModal({ isOpen: false, hospital: null }); openDecisionModal(viewModal.hospital!.id, 'REJECT'); }} className="flex-1 py-5 text-red-600 font-black uppercase text-xs tracking-widest border border-red-100 hover:bg-red-50 rounded-2xl transition active:scale-95">Deny Entry</button>
                  <button onClick={() => { setViewModal({ isOpen: false, hospital: null }); openDecisionModal(viewModal.hospital!.id, 'APPROVE'); }} className="flex-[2] py-5 bg-emerald-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition active:scale-95">Verify & Approve</button>
                 </>
               )}
               {viewModal.hospital.status !== 'PENDING' && (
                 <button onClick={() => setViewModal({ isOpen: false, hospital: null })} className="w-full py-5 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl">Close Dashboard</button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Final Decision Modal */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[150] px-6">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl p-16 border border-slate-200 animate-scale-up text-center">
            <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-10 mx-auto shadow-inner ${decisionModal.type === 'APPROVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              <ShieldAlert className="w-14 h-14" />
            </div>
            <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Administrative Verdict</h3>
            <p className="text-base text-slate-500 mb-10 leading-relaxed font-bold">Document the final reasoning for this {decisionModal.type.toLowerCase()} decision.</p>
            <textarea 
              value={decisionReason} 
              onChange={(e) => setDecisionReason(e.target.value)}
              className="w-full h-44 p-6 border rounded-[2rem] outline-none resize-none mb-10 bg-slate-50 font-black text-slate-900 border-slate-200 focus:ring-4 transition-all focus:ring-primary-500/10"
              placeholder="e.g. Institutional license verified against national database."
            />
            <div className="flex gap-6">
              <button onClick={() => setDecisionModal({ isOpen: false, id: null, type: 'APPROVE' })} className="flex-1 py-6 text-slate-500 font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-100 rounded-3xl transition-all">Cancel</button>
              <button 
                onClick={handleDecisionSubmit} 
                disabled={!decisionReason.trim()} 
                className={`flex-[2] py-6 text-white font-black uppercase text-xs tracking-[0.2em] rounded-3xl shadow-2xl transition-all active:scale-95 disabled:opacity-30 ${decisionModal.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}`}
              >
                Sign & Finalize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High Fidelity Doc Reviewer Portal */}
      {docReviewModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[200] p-12">
          <div className="bg-white rounded-[4rem] w-full max-w-5xl h-full flex flex-col shadow-2xl animate-scale-up overflow-hidden">
             <div className="p-10 border-b flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                   <ShieldCheck className="w-8 h-8 text-emerald-600" />
                   <div>
                     <h2 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Document Audit</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Resource: {docReviewModal.title}</p>
                   </div>
                </div>
                <button onClick={() => setDocReviewModal({ isOpen: false, title: '' })} className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition shadow-sm"><X className="w-6 h-6" /></button>
             </div>
             <div className="flex-1 bg-slate-100 p-12 overflow-y-auto flex items-center justify-center">
                <div className="w-full max-w-3xl bg-white shadow-2xl p-20 rounded-lg min-h-[800px] border relative">
                   <div className="absolute top-10 right-10 flex gap-4">
                     <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle className="w-8 h-8" /></div>
                   </div>
                   <div className="space-y-10">
                     <div className="h-8 bg-slate-100 w-1/3 rounded animate-pulse"></div>
                     <div className="space-y-4">
                       <div className="h-4 bg-slate-50 w-full rounded animate-pulse"></div>
                       <div className="h-4 bg-slate-50 w-full rounded animate-pulse"></div>
                       <div className="h-4 bg-slate-50 w-5/6 rounded animate-pulse"></div>
                     </div>
                     <div className="h-64 bg-slate-50 w-full rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                       <ShieldAlert className="w-20 h-20 text-slate-200" />
                     </div>
                     <div className="text-center pt-12">
                        <p className="text-xs font-mono text-slate-400 font-bold uppercase tracking-widest">--- END OF OFFICIAL ACCREDITATION DOSSIER ---</p>
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

export default SuperAdminDashboard;
