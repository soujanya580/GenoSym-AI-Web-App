
import React, { useState, useEffect } from 'react';
import { getUsers, approveDoctor, getPatientCases } from '../../services/mockBackend';
import { User, UserRole, RegistrationStatus, PatientCase } from '../../types';
import { useAuth } from '../../App';
import { Check, X, Stethoscope, Users, Eye, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HospitalAdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<User[]>([]);
  const [patients, setPatients] = useState<PatientCase[]>([]);
  const [activeTab, setActiveTab] = useState<'DOCTORS' | 'PATIENTS'>('DOCTORS');
  const [rejectModal, setRejectModal] = useState<{isOpen: boolean, email: string | null}>({ isOpen: false, email: null });
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = () => {
    if (!currentUser?.hospitalId) return;
    // Filter doctors belonging to this hospital
    const allUsers = getUsers();
    const hospitalDoctors = allUsers.filter(u => u.role === UserRole.DOCTOR && u.hospitalId === currentUser.hospitalId);
    
    // Sort so PENDING is first
    hospitalDoctors.sort((a, b) => (a.status === RegistrationStatus.PENDING ? -1 : 1));
    
    setDoctors(hospitalDoctors);
    
    const hospitalPatients = getPatientCases(); 
    setPatients(hospitalPatients);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleApprove = async (email: string) => {
    if (confirm('Approve this doctor? They will receive an email and gain platform access.')) {
      await approveDoctor(email, true);
      fetchData();
    }
  };

  const openRejectModal = (email: string) => {
    setRejectModal({ isOpen: true, email });
    setRejectReason('');
  };

  const submitRejection = async () => {
    if (!rejectModal.email || !rejectReason.trim()) return;
    await approveDoctor(rejectModal.email, false, rejectReason);
    setRejectModal({ isOpen: false, email: null });
    fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hospital Administration</h1>
          <p className="text-gray-500">Manage doctor access and view patient registry.</p>
        </div>
        <div className="bg-white border p-1 rounded-lg shadow-sm flex">
          <button 
            onClick={() => setActiveTab('DOCTORS')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'DOCTORS' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Doctors
          </button>
          <button 
            onClick={() => setActiveTab('PATIENTS')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'PATIENTS' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Patients
          </button>
        </div>
      </div>

      {activeTab === 'DOCTORS' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Doctor Access Requests</h3>
            </div>
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100 font-bold">
              {doctors.filter(d => d.status === RegistrationStatus.PENDING).length} Pending
            </span>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {doctors.map((doc) => (
                <tr key={doc.email} className={doc.status === RegistrationStatus.PENDING ? 'bg-amber-50/30' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border 
                      ${doc.status === RegistrationStatus.APPROVED ? 'bg-green-100 text-green-800 border-green-200' : 
                        doc.status === RegistrationStatus.REJECTED ? 'bg-red-100 text-red-800 border-red-200' : 
                        'bg-amber-100 text-amber-800 border-amber-200'}`}>
                      {doc.status === RegistrationStatus.PENDING && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {doc.status === RegistrationStatus.PENDING ? (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleApprove(doc.email)} 
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm transition"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => openRejectModal(doc.email)} 
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded shadow-sm transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {doctors.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No doctors registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Users className="text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Patient Registry (Read Only)</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnosis Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.patientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{p.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.age}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${p.diagnosisStatus === 'Diagnosed' ? 'bg-green-100 text-green-800' : 
                        p.diagnosisStatus === 'Analyzing' ? 'bg-blue-100 text-blue-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {p.diagnosisStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => navigate(`/patient/${p.id}`)}
                      className="text-primary-600 hover:text-primary-900 flex items-center justify-end gap-1 ml-auto"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No patients found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-up">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reject Doctor Registration</h3>
            <p className="text-sm text-slate-500 mb-4">
              Please provide a mandatory reason for this rejection. This will be included in the email notification to the doctor.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none mb-4"
              placeholder="Enter rejection reason here..."
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setRejectModal({ isOpen: false, email: null })}
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

export default HospitalAdminDashboard;
