
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getHospitals, approveHospital, getSystemAnalytics, getAuditLogs, getActionDiary, getUsers } from '../../services/mockBackend';
import { Hospital, RegistrationStatus, AuditLogEntry, User } from '../../types';
import { Building2, AlertTriangle, FileCheck, Eye, BookOpen, ShieldAlert, TrendingUp, BarChart3, Users, Mail, UserCheck, Search, Filter, X, MapPin, Phone, Calendar, FileText, CheckCircle, ShieldCheck, Printer, Download, RefreshCw, Activity, Lock } from 'lucide-react';
import { CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, BarChart, Bar, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  const [docReviewModal, setDocReviewModal] = useState<{ isOpen: boolean, title: string, context?: { name: string, hospital?: string, id?: string } }>({ isOpen: false, title: '' });
  const [decisionReason, setDecisionReason] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const licenseRef = useRef<HTMLDivElement>(null);

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
    return () => {
      window.removeEventListener('usersUpdated', fetchData);
      window.removeEventListener('diaryUpdated', fetchData);
      window.removeEventListener('logUpdated', fetchData);
    };
  }, [fetchData]);

  const handleDownloadLicense = async () => {
    if (!licenseRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(licenseRef.current, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`Credential_${docReviewModal.context?.name?.replace(/\s+/g, '_')}_${docReviewModal.context?.id}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

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

      {activeTab === 'USERS' && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                 <Users className="w-6 h-6 text-primary-600" /> Platform User Directory
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {allUsers.map((u, i) => (
                    <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-lg transition-all group">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-900 shadow-sm group-hover:bg-primary-600 group-hover:text-white transition-colors">{u.name.charAt(0)}</div>
                          <div>
                             <p className="text-sm font-black text-slate-900 leading-tight">{u.name}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{u.role}</p>
                          </div>
                       </div>
                       <div className="space-y-2 pt-4 border-t border-slate-200">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Mail className="w-3 h-3" /> {u.email}</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${u.status === 'APPROVED' ? 'text-emerald-500' : 'text-amber-500'}`}>
                             <div className={`w-2 h-2 rounded-full ${u.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-amber-500'}`} /> {u.status}
                          </p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'LEDGER' && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 mb-10">
                 <div className="p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-2xl"><BookOpen className="w-7 h-7" /></div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Global Decision Diary</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform-wide Audit Log</p>
                 </div>
              </div>

              <div className="space-y-6">
                 {diaryEntries.map((entry, idx) => (
                    <div key={idx} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-white hover:shadow-xl transition-all">
                       <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${entry.action === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                             {entry.action === 'APPROVED' ? <CheckCircle className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
                          </div>
                          <div>
                             <p className="text-lg font-black text-slate-900 tracking-tight">{entry.targetName}</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: {entry.action}</p>
                          </div>
                       </div>
                       <div className="flex-1 md:px-12">
                          <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-tight">Rationale: {entry.reason}</p>
                       </div>
                       <div className="text-right shrink-0">
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{new Date(entry.timestamp).toLocaleDateString()}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'AUDIT' && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full blur-[100px]" />
              <div className="relative z-10">
                 <div className="flex items-center gap-5 mb-10">
                    <div className="p-4 bg-white/10 rounded-2xl"><Activity className="w-8 h-8 text-primary-400" /></div>
                    <h3 className="text-3xl font-black tracking-tight uppercase italic">Security Audit Ledger</h3>
                 </div>
                 <div className="space-y-4">
                    {auditLogs.map((log, i) => (
                       <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-6">
                             <div className={`w-2 h-2 rounded-full ${log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                             <div>
                                <p className="text-sm font-black text-white">{log.action}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.userEmail} • {log.ipAddress}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modals and Overlays */}
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
                  onClick={() => setDocReviewModal({ 
                    isOpen: true, 
                    title: viewModal.hospital?.accreditationDocument || 'ACCREDITATION.PDF',
                    context: { name: viewModal.hospital?.name || '', id: viewModal.hospital?.id }
                  })}
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
                className={`flex-[2] py-6 text-white font-black uppercase text-xs tracking-[0.2em] rounded-3xl shadow-2xl transition-all active:scale-95 disabled:opacity-30 ${decisionModal.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'}`}
              >
                Sign & Finalize
              </button>
            </div>
          </div>
        </div>
      )}

      {docReviewModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[200] p-6 lg:p-12 overflow-y-auto">
          <div className="bg-white rounded-[4rem] w-full max-w-5xl min-h-[90vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden my-auto">
             <div className="p-10 border-b flex justify-between items-center bg-slate-900 text-white no-print">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-emerald-600 rounded-xl"><ShieldCheck className="w-8 h-8 text-white" /></div>
                   <div>
                     <h2 className="text-2xl font-black tracking-tight uppercase">Credential Audit Portal</h2>
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">Resource Archive: {docReviewModal.title}</p>
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
                    onClick={() => setDocReviewModal({ isOpen: false, title: '' })} 
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
                        <span className="text-8xl font-black uppercase rotate-[-30deg]">OFFICIAL GENOSYM VERIFIED CREDENTIAL</span>
                      </div>
                   </div>

                   <div className="relative z-10 space-y-12 text-center font-serif text-slate-800">
                     <h1 className="text-5xl font-bold tracking-tight mb-2 border-b-2 border-slate-200 pb-8">Medical Practice License <span className="text-xl block text-slate-400 mt-2 font-sans font-black uppercase tracking-widest">(Demo Only)</span></h1>
                     <div className="grid grid-cols-1 text-left gap-8 text-xl">
                        <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                           <span className="font-sans font-black uppercase text-xs text-slate-400 tracking-widest">License Number:</span>
                           <span className="font-bold">MED-FAKE-IND-1000{docReviewModal.context?.id?.slice(-1) || '1'}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                           <span className="font-sans font-black uppercase text-xs text-slate-400 tracking-widest">Entity / Practitioner Name:</span>
                           <span className="font-bold text-2xl uppercase tracking-tighter">{docReviewModal.context?.name || 'Dr. Aarav Menon'}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                           <span className="font-sans font-black uppercase text-xs text-slate-400 tracking-widest">Affiliated Institution:</span>
                           <span className="font-bold">{docReviewModal.context?.hospital || 'Apollo Health Centre'}</span>
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
                     <div className="pt-12 text-sm text-slate-400 italic font-sans leading-relaxed">
                        "This license is auto-generated for academic demonstration and testing purposes only. It is not a real medical license and holds no legal validity within any jurisdiction."
                     </div>
                     <div className="pt-16 flex justify-between items-center px-10">
                        <div className="text-left">
                           <div className="w-64 border-b border-slate-900 mb-2"></div>
                           <p className="text-[10px] font-black font-sans uppercase tracking-widest text-slate-400">Authorized Digital Signature</p>
                        </div>
                        <div className="text-right">
                           <div className="w-32 h-32 border-4 border-slate-100 rounded-2xl flex items-center justify-center p-4">
                              <span className="text-[10px] font-black font-sans text-slate-300 uppercase leading-tight">[DEMO SEAL]</span>
                           </div>
                           <p className="text-[10px] font-black font-sans uppercase tracking-widest text-slate-400 mt-2">Official Seal</p>
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

export default SuperAdminDashboard;
