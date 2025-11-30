
import React, { useState, useEffect } from 'react';
import { getHospitals, approveHospital, approveDoctor, getSystemAnalytics, getAuditLogs, getUsers } from '../../services/mockBackend';
import { Hospital, User, RegistrationStatus, AuditLogEntry, UserRole } from '../../types';
import { Check, X, Building2, Shield, Search, FileText, Mail, Users, Activity, Download, Filter, AlertTriangle, Share2, FileCheck, Lock, Stethoscope, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// Mock Growth Data for Chart
const GROWTH_DATA = [
  { month: 'Jan', hospitals: 2, doctors: 5 },
  { month: 'Feb', hospitals: 3, doctors: 12 },
  { month: 'Mar', hospitals: 5, doctors: 25 },
  { month: 'Apr', hospitals: 8, doctors: 45 },
  { month: 'May', hospitals: 12, doctors: 80 },
  { month: 'Jun', hospitals: 15, doctors: 120 },
];

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'HOSPITALS' | 'DOCTORS' | 'AUDIT'>('OVERVIEW');
  
  // Hospital Tab Filter State
  const [hospitalFilter, setHospitalFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  
  // Doctor Tab Filter State
  const [doctorFilter, setDoctorFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Audit Log Filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'SUSPICIOUS' | 'FAILURE'>('ALL');

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Rejection Modal State
  const [rejectModal, setRejectModal] = useState<{isOpen: boolean, id: string | null, type: 'HOSPITAL' | 'DOCTOR'}>({ isOpen: false, id: null, type: 'HOSPITAL' });
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = () => {
    setIsRefreshing(true);
    setHospitals(getHospitals());
    const allUsers = getUsers();
    setDoctors(allUsers.filter(u => u.role === UserRole.DOCTOR));
    setAnalytics(getSystemAnalytics());
    setAuditLogs(getAuditLogs());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 seconds to show new pending requests immediately
    const interval = setInterval(fetchData, 5000);
    window.addEventListener('logUpdated', fetchData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('logUpdated', fetchData);
    };
  }, []);

  // --- Hospital Actions ---
  const handleApproveHospital = async (id: string) => {
    if (confirm('Confirm approval for this institution? Emails will be sent.')) {
      await approveHospital(id, true);
      fetchData();
    }
  };

  const openRejectHospitalModal = (id: string) => {
    setRejectModal({ isOpen: true, id: id, type: 'HOSPITAL' });
    setRejectReason('');
  };

  // --- Doctor Actions ---
  const handleApproveDoctor = async (email: string) => {
    if (confirm('Confirm approval for this doctor? Access will be granted immediately.')) {
      await approveDoctor(email, true);
      fetchData();
    }
  };

  const openRejectDoctorModal = (email: string) => {
    setRejectModal({ isOpen: true, id: email, type: 'DOCTOR' });
    setRejectReason('');
  };

  const submitRejection = async () => {
    if (!rejectModal.id || !rejectReason.trim()) return;
    
    if (rejectModal.type === 'HOSPITAL') {
      await approveHospital(rejectModal.id, false, rejectReason);
    } else {
      await approveDoctor(rejectModal.id, false, rejectReason);
    }
    
    setRejectModal({ isOpen: false, id: null, type: 'HOSPITAL' });
    fetchData();
  };

  const handleExportCSV = () => {
    const headers = ['Hospital Name', 'Admin Email', 'Status', 'Registered At', 'Address', 'Contact'];
    const rows = hospitals
      .filter(h => hospitalFilter === 'ALL' || h.status === hospitalFilter)
      .map(h => [h.name, h.adminEmail, h.status, h.registeredAt, h.address, h.contactNumber]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genosym_hospitals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Masking Helper for Patient IDs
  const maskId = (id?: string) => {
    if (!id) return '-';
    if (id.startsWith('PAT')) {
      // Keep prefix and last 3 chars: PAT-****-123
      return id.replace(/^(PAT-).+(.{3})$/, '$1****-$2'); 
    }
    return id;
  };

  // Filtered Lists
  const filteredHospitals = hospitals.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          h.adminEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = hospitalFilter === 'ALL' ? true : h.status === hospitalFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDoctors = doctors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = doctorFilter === 'ALL' ? true : d.status === doctorFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = log.userEmail.toLowerCase().includes(auditSearch.toLowerCase()) || 
                          log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          (log.resourceId && log.resourceId.toLowerCase().includes(auditSearch.toLowerCase()));
    
    if (auditFilter === 'SUSPICIOUS') return matchesSearch && log.status === 'SUSPICIOUS';
    if (auditFilter === 'FAILURE') return matchesSearch && log.status === 'FAILURE';
    return matchesSearch;
  });

  const handleAuditExport = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'IP Address', 'Resource', 'Status', 'Details'];
    const rows = filteredAuditLogs.map(l => [
      l.timestamp, l.userEmail, l.userRole, l.action, l.ipAddress, l.resourceId || '', l.status, l.details
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genosym_audit_ledger_${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 font-sans relative">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Super Admin Console</h1>
          <p className="text-slate-500 mt-1">Platform Oversight: Soujanya S. & Sheethal N.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData}
            className={`p-2 rounded-full hover:bg-slate-100 text-slate-500 transition ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="bg-white border p-1 rounded-lg shadow-sm flex flex-wrap">
            <button 
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'OVERVIEW' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => { setActiveTab('HOSPITALS'); setHospitalFilter('PENDING'); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'HOSPITALS' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Hospitals
            </button>
            <button 
              onClick={() => { setActiveTab('DOCTORS'); setDoctorFilter('PENDING'); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'DOCTORS' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Doctor Requests
            </button>
            <button 
              onClick={() => setActiveTab('AUDIT')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'AUDIT' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Audit Ledger
            </button>
          </div>
        </div>
      </div>

      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Hospitals Onboarded</p>
                  <h3 className="text-2xl font-bold text-slate-900">{analytics.totalHospitals}</h3>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Federated Nodes</p>
                  <h3 className="text-2xl font-bold text-slate-900">{analytics.activeNodes || 0}</h3>
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">● Online</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Pending Approvals</p>
                  <h3 className="text-2xl font-bold text-slate-900">{analytics.pendingDoctorApprovals + analytics.pendingHospitals}</h3>
                  <p className="text-xs text-slate-400">Docs & Hospitals</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Platform Users</p>
                  <h3 className="text-2xl font-bold text-slate-900">{analytics.totalUsers}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Platform Growth Trends</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={GROWTH_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="hospitals" stroke="#2563eb" strokeWidth={3} name="Hospitals" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="doctors" stroke="#10b981" strokeWidth={3} name="Doctors" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- HOSPITALS TAB --- */}
      {activeTab === 'HOSPITALS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
               <button 
                 onClick={() => setHospitalFilter('PENDING')} 
                 className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${hospitalFilter === 'PENDING' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <AlertTriangle className="w-4 h-4" /> Pending ({analytics.pendingHospitals})
               </button>
               <button 
                 onClick={() => setHospitalFilter('APPROVED')} 
                 className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${hospitalFilter === 'APPROVED' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Check className="w-4 h-4" /> Approved ({analytics.activeHospitals})
               </button>
               <button 
                 onClick={() => setHospitalFilter('REJECTED')} 
                 className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${hospitalFilter === 'REJECTED' ? 'bg-white shadow-sm text-red-700' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <X className="w-4 h-4" /> Rejected ({analytics.rejectedHospitals})
               </button>
               <button 
                 onClick={() => setHospitalFilter('ALL')} 
                 className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${hospitalFilter === 'ALL' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Filter className="w-4 h-4" /> All
               </button>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>
          
          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             {filteredHospitals.length === 0 ? (
               <div className="p-12 text-center text-slate-500">
                 <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                 <p className="text-lg font-medium">No hospitals found</p>
                 <p className="text-sm">Try adjusting your filters or search query.</p>
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Institution</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Documents</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Date</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredHospitals.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3 shrink-0">
                              {h.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{h.name}</div>
                              <div className="text-xs text-slate-500">{h.address}</div>
                              <div className="text-xs text-primary-600 mt-0.5">{h.adminEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => alert(`Viewing ${h.accreditationDocument || 'License.pdf'}`)}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded border border-slate-200 transition"
                          >
                            <FileText className="w-3 h-3" /> {h.accreditationDocument || 'License.pdf'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                            ${h.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                              h.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' : 
                              'bg-amber-50 text-amber-700 border-amber-100'}`}>
                            {h.status === 'APPROVED' && <Check className="w-3 h-3 mr-1" />}
                            {h.status === 'REJECTED' && <X className="w-3 h-3 mr-1" />}
                            {h.status === 'PENDING' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {h.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {new Date(h.registeredAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {h.status === 'PENDING' ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleApproveHospital(h.id)} 
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm transition"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => openRejectHospitalModal(h.id)} 
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded shadow-sm transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No actions</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>
      )}

      {/* --- DOCTORS TAB --- */}
      {activeTab === 'DOCTORS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
               <button 
                 onClick={() => setDoctorFilter('PENDING')} 
                 className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${doctorFilter === 'PENDING' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <AlertTriangle className="w-4 h-4" /> Pending ({analytics.pendingDoctorApprovals})
               </button>
               <button 
                 onClick={() => setDoctorFilter('APPROVED')} 
                 className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${doctorFilter === 'APPROVED' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Check className="w-4 h-4" /> Approved ({filteredDoctors.filter(d => d.status === 'APPROVED').length})
               </button>
               <button 
                 onClick={() => setDoctorFilter('REJECTED')} 
                 className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${doctorFilter === 'REJECTED' ? 'bg-white shadow-sm text-red-700' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <X className="w-4 h-4" /> Rejected
               </button>
               <button 
                 onClick={() => setDoctorFilter('ALL')} 
                 className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${doctorFilter === 'ALL' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Filter className="w-4 h-4" /> All
               </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 lg:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search doctor name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
            </div>
          </div>

          {/* Doctors Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             {filteredDoctors.length === 0 ? (
               <div className="p-12 text-center text-slate-500">
                 <Stethoscope className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                 <p className="text-lg font-medium">No doctors found</p>
                 <p className="text-sm">Try adjusting your filters.</p>
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">License</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredDoctors.map((doc) => (
                      <tr key={doc.email} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-3 shrink-0">
                              {doc.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{doc.name}</div>
                              <div className="text-xs text-slate-500">{doc.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => alert(`Viewing ${doc.licenseDocument || 'license.pdf'}`)}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded border border-slate-200 transition"
                          >
                            <FileText className="w-3 h-3" /> {doc.licenseDocument || 'license.pdf'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                            ${doc.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                              doc.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' : 
                              'bg-amber-50 text-amber-700 border-amber-100'}`}>
                            {doc.status === 'APPROVED' && <Check className="w-3 h-3 mr-1" />}
                            {doc.status === 'REJECTED' && <X className="w-3 h-3 mr-1" />}
                            {doc.status === 'PENDING' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {doc.contactNumber || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {doc.status === 'PENDING' ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleApproveDoctor(doc.email)} 
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm transition"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => openRejectDoctorModal(doc.email)} 
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded shadow-sm transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>
      )}

      {/* --- IMMUTABLE AUDIT LEDGER (REPLACES LOGS) --- */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in flex flex-col h-[600px]">
          
          {/* Audit Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-200 rounded-lg">
                <FileCheck className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Immutable Audit Ledger</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> WORM Storage (Write Once, Read Many)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Filters */}
              <div className="flex bg-white border border-slate-300 rounded-lg p-1">
                <button 
                  onClick={() => setAuditFilter('ALL')} 
                  className={`px-3 py-1 text-xs font-bold rounded ${auditFilter === 'ALL' ? 'bg-slate-100 text-slate-800' : 'text-slate-500'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setAuditFilter('SUSPICIOUS')} 
                  className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${auditFilter === 'SUSPICIOUS' ? 'bg-amber-100 text-amber-700' : 'text-slate-500'}`}
                >
                  <AlertTriangle className="w-3 h-3" /> Suspicious
                </button>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search user, action, ID..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none w-64"
                />
              </div>
              {/* Export */}
              <button onClick={handleAuditExport} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Audit Table */}
          <div className="flex-1 overflow-y-auto custom-scroll">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs tracking-wider">User & Role</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs tracking-wider">Resource</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs tracking-wider">IP Address</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-xs tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className={`hover:bg-slate-50 transition font-mono ${log.status === 'SUSPICIOUS' ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{log.userEmail}</div>
                      <div className="text-xs text-slate-400">{log.userRole}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.caseId && <div className="text-blue-600">Case: {log.caseId}</div>}
                      {log.resourceId && <div className="text-slate-500">ID: {maskId(log.resourceId)}</div>}
                      {!log.caseId && !log.resourceId && <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {log.ipAddress}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                        log.status === 'SUCCESS' ? 'text-green-700 bg-green-50' :
                        log.status === 'FAILURE' ? 'text-red-700 bg-red-50' :
                        'text-amber-700 bg-amber-50 border border-amber-200'
                      }`}>
                        {log.status === 'SUSPICIOUS' && <AlertTriangle className="w-3 h-3" />}
                        {log.status}
                      </span>
                      {log.status !== 'SUCCESS' && (
                        <div className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={log.details}>
                          {log.details}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAuditLogs.length === 0 && (
              <div className="p-12 text-center text-slate-400">No audit records found matching criteria.</div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-up">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reject {rejectModal.type === 'HOSPITAL' ? 'Institution' : 'Doctor'} Registration</h3>
            <p className="text-sm text-slate-500 mb-4">
              Please provide a mandatory reason for this rejection. This will be included in the email notification.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none mb-4"
              placeholder="Enter rejection reason here..."
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setRejectModal({ isOpen: false, id: null, type: 'HOSPITAL' })}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={submitRejection}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
