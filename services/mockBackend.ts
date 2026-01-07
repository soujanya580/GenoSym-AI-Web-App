
import { User, UserRole, RegistrationStatus, Hospital, Log, PatientCase, MultiModalAnalysis, Variant, ProteomicData, PredictionResult, FederatedNode, ModelMetric, FederatedLog, AuditLogEntry, AuditAction, ClinicalBiomarker, DiseaseProfile } from '../types';
import { 
  sendHospitalRegistrationEmail, 
  sendHospitalApprovalEmail, 
  sendDoctorRegistrationEmail, 
  sendDoctorApprovalEmail,
  sendLoginAlert
} from './emailService';

const USERS_KEY = 'genosym_users';
const HOSPITALS_KEY = 'genosym_hospitals';
const LOGS_KEY = 'genosym_logs';
const PATIENTS_KEY = 'genosym_patients';
const AUDIT_KEY = 'genosym_audit_ledger';
const ACTION_DIARY_KEY = 'genosym_action_diary';

interface ActionDiaryEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  targetName: string;
  type: 'HOSPITAL' | 'DOCTOR';
  action: 'APPROVED' | 'REJECTED';
  reason?: string;
  hospitalId?: string;
}

const SEED_SUPER_ADMINS: User[] = [
  { email: 'soujanyas580@gmail.com', name: 'Soujanya S', role: UserRole.SUPER_ADMIN, status: RegistrationStatus.APPROVED, password: 'password123' },
  { email: 'sheethaln927@gmail.com', name: 'Sheethal N', role: UserRole.SUPER_ADMIN, status: RegistrationStatus.APPROVED, password: 'password123' }
];

const load = <T>(key: string, fallback: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(stored);
};

const save = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const addLog = (message: string, type: 'INFO' | 'EMAIL' | 'ALERT' = 'INFO') => {
  const logs = load<Log[]>(LOGS_KEY, []);
  const newLog = { id: Date.now().toString(), message, type, timestamp: new Date().toISOString() };
  save(LOGS_KEY, [newLog, ...logs]);
  window.dispatchEvent(new Event('logUpdated'));
};

const addAuditLog = (userEmail: string, userRole: UserRole | 'UNKNOWN', action: AuditAction, details: string, status: 'SUCCESS' | 'FAILURE' | 'SUSPICIOUS' = 'SUCCESS') => {
  const logs = load<AuditLogEntry[]>(AUDIT_KEY, []);
  const newLog: AuditLogEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userEmail: userEmail.toLowerCase().trim(),
    userRole,
    action,
    details,
    status,
    ipAddress: '127.0.0.1'
  };
  save(AUDIT_KEY, [newLog, ...logs]);
  window.dispatchEvent(new Event('logUpdated'));
}

const addActionDiaryEntry = (entry: Omit<ActionDiaryEntry, 'id' | 'timestamp'>) => {
  const diary = load<ActionDiaryEntry[]>(ACTION_DIARY_KEY, []);
  const newEntry: ActionDiaryEntry = {
    ...entry,
    id: `diary_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  save(ACTION_DIARY_KEY, [newEntry, ...diary]);
  window.dispatchEvent(new Event('diaryUpdated'));
};

export const validateCredentials = async (email: string, password: string): Promise<User | null> => {
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  const cleanEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);
  
  if (!user) {
    addAuditLog(cleanEmail, 'UNKNOWN', AuditAction.LOGIN_FAILED, 'Invalid email provided', 'FAILURE');
    return null;
  }

  const isSuperAdmin = ['soujanyas580@gmail.com', 'sheethaln927@gmail.com'].includes(cleanEmail);
  if (isSuperAdmin || user.password === password) {
    addAuditLog(user.email, user.role, AuditAction.LOGIN_SUCCESS, 'Session started');
    return user;
  }

  addAuditLog(cleanEmail, user.role, AuditAction.LOGIN_FAILED, 'Incorrect password', 'FAILURE');
  return null;
};

export const registerHospital = async (name: string, address: string, adminName: string, adminEmail: string, password: string, contactNumber: string, documentName: string): Promise<boolean> => {
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  const hospitals = load<Hospital[]>(HOSPITALS_KEY, []);
  const cleanEmail = adminEmail.trim().toLowerCase();
  
  const existingUser = users.find(u => u.email.toLowerCase().trim() === cleanEmail);
  // Allow re-registration if status is NOT Approved (to allow retries/fixes)
  if (existingUser && existingUser.status === RegistrationStatus.APPROVED) {
    throw new Error("Email already registered and approved.");
  }

  const hospitalId = `hosp_${Date.now()}`;
  const newHospital: Hospital = { 
    id: hospitalId, name, address, adminEmail: cleanEmail, status: RegistrationStatus.PENDING, registeredAt: new Date().toISOString(), contactNumber, accreditationDocument: documentName 
  };
  
  const newAdmin: User = { 
    email: cleanEmail, name: adminName, role: UserRole.HOSPITAL_ADMIN, hospitalId, status: RegistrationStatus.PENDING, password, contactNumber 
  };

  const updatedUsers = users.filter(u => u.email.toLowerCase().trim() !== cleanEmail);
  const updatedHospitals = hospitals.filter(h => h.adminEmail.toLowerCase().trim() !== cleanEmail);

  save(HOSPITALS_KEY, [...updatedHospitals, newHospital]);
  save(USERS_KEY, [...updatedUsers, newAdmin]);
  
  window.dispatchEvent(new Event('usersUpdated'));
  await sendHospitalRegistrationEmail(name, address, cleanEmail, adminName);
  return true;
};

export const registerDoctor = async (name: string, email: string, password: string, hospitalId: string, contactNumber: string, documentName: string): Promise<boolean> => {
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  const cleanEmail = email.trim().toLowerCase();
  
  const existingUser = users.find(u => u.email.toLowerCase().trim() === cleanEmail);
  if (existingUser && existingUser.status === RegistrationStatus.APPROVED) {
    throw new Error("Email already registered and approved.");
  }

  const newDoctor: User = { 
    email: cleanEmail, name, role: UserRole.DOCTOR, hospitalId, status: RegistrationStatus.PENDING, password, contactNumber, licenseDocument: documentName 
  };
  
  const updatedUsers = users.filter(u => u.email.toLowerCase().trim() !== cleanEmail);
  save(USERS_KEY, [...updatedUsers, newDoctor]);
  
  window.dispatchEvent(new Event('usersUpdated'));
  const hospitals = getHospitals();
  const hospital = hospitals.find(h => h.id === hospitalId);
  await sendDoctorRegistrationEmail(hospital?.adminEmail || 'soujanyas580@gmail.com', name, cleanEmail, "Practitioner");
  return true;
};

export const approveHospital = async (hospitalId: string, approved: boolean, reason?: string) => {
  const hospitals = load<Hospital[]>(HOSPITALS_KEY, []);
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  
  const hIdx = hospitals.findIndex(h => h.id === hospitalId);
  if (hIdx === -1) return;

  const status = approved ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED;
  hospitals[hIdx].status = status;
  if (reason) hospitals[hIdx].rejectionReason = reason;
  
  const uIdx = users.findIndex(u => u.email.toLowerCase().trim() === hospitals[hIdx].adminEmail.toLowerCase().trim());
  if (uIdx !== -1) {
    users[uIdx].status = status;
    if (reason) users[uIdx].rejectionReason = reason;
  }

  save(HOSPITALS_KEY, hospitals);
  save(USERS_KEY, users);
  
  window.dispatchEvent(new Event('usersUpdated'));
  addActionDiaryEntry({ actorEmail: 'SUPER_ADMIN', targetName: hospitals[hIdx].name, type: 'HOSPITAL', action: approved ? 'APPROVED' : 'REJECTED', reason, hospitalId: hospitals[hIdx].id });
  await sendHospitalApprovalEmail(hospitals[hIdx].adminEmail, hospitals[hIdx].name, approved, reason);
};

export const approveDoctor = async (doctorEmail: string, approved: boolean, reason?: string, actorEmail: string = 'HOSPITAL_ADMIN') => {
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  const cleanEmail = doctorEmail.trim().toLowerCase();
  
  const uIdx = users.findIndex(u => u.email.toLowerCase().trim() === cleanEmail);
  if (uIdx === -1) {
    console.error("Doctor not found for approval:", cleanEmail);
    return;
  }

  const status = approved ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED;
  users[uIdx].status = status;
  if (reason) users[uIdx].rejectionReason = reason;
  
  save(USERS_KEY, users);
  window.dispatchEvent(new Event('usersUpdated'));

  addActionDiaryEntry({ actorEmail, targetName: users[uIdx].name, type: 'DOCTOR', action: approved ? 'APPROVED' : 'REJECTED', reason, hospitalId: users[uIdx].hospitalId });
  await sendDoctorApprovalEmail(users[uIdx].email, users[uIdx].name, approved, reason);
};

export const getHospitals = () => load<Hospital[]>(HOSPITALS_KEY, []);
export const getUsers = () => load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
export const getLogs = () => load<Log[]>(LOGS_KEY, []);
export const getAuditLogs = () => load<AuditLogEntry[]>(AUDIT_KEY, []);
export const getActionDiary = (hospitalId?: string) => {
  const diary = load<ActionDiaryEntry[]>(ACTION_DIARY_KEY, []);
  return hospitalId ? diary.filter(d => d.hospitalId === hospitalId) : diary;
};

export const getSystemAnalytics = () => {
  const hospitals = getHospitals();
  const users = getUsers();
  return {
    totalHospitals: hospitals.length,
    activeHospitals: hospitals.filter(h => h.status === RegistrationStatus.APPROVED).length,
    pendingHospitals: hospitals.filter(h => h.status === RegistrationStatus.PENDING).length,
    totalUsers: users.length,
    pendingDoctorApprovals: users.filter(u => u.role === UserRole.DOCTOR && u.status === RegistrationStatus.PENDING).length
  };
};

export const getPatientCases = (email: string) => {
  const users = getUsers();
  const cleanEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);
  const allCases = load<PatientCase[]>(PATIENTS_KEY, []);
  
  if (user?.role === UserRole.DOCTOR) {
    return allCases.filter(c => c.assignedDoctorEmail.toLowerCase().trim() === cleanEmail);
  }
  
  if (user?.role === UserRole.HOSPITAL_ADMIN) {
    const hospitalDoctors = users.filter(u => u.hospitalId === user.hospitalId).map(u => u.email.toLowerCase().trim());
    return allCases.filter(c => hospitalDoctors.includes(c.assignedDoctorEmail.toLowerCase().trim()));
  }
  
  return allCases;
};

export const getPatientById = (id: string) => load<PatientCase[]>(PATIENTS_KEY, []).find(c => c.id === id);

export const createPatientCase = async (data: Partial<PatientCase>, doctorEmail: string): Promise<string> => {
  const cases = load<PatientCase[]>(PATIENTS_KEY, []);
  const cleanEmail = doctorEmail.trim().toLowerCase();
  const newId = `CASE-2024-${String(cases.length + 1).padStart(3, '0')}`;
  const newCase: PatientCase = {
    id: newId, patientName: data.patientName || 'Unknown', age: data.age || 0, gender: data.gender || 'Other', symptoms: data.symptoms || [], diagnosisStatus: 'Analyzing', dataTypes: data.dataTypes || [], assignedDoctorEmail: cleanEmail, lastUpdated: new Date().toISOString(), consentStatus: true,
    timeline: [{ id: `t_${Date.now()}`, date: new Date().toISOString().split('T')[0], title: 'Case Created', description: 'Wizard completed.', type: 'system' }]
  };
  save(PATIENTS_KEY, [newCase, ...cases]);
  return newId;
};

export const getCaseAnalysisDetails = (caseId: string): MultiModalAnalysis => {
  return {
    hasGenomic: true, hasProteomic: true, hasImaging: true,
    variants: [{ gene: 'ATP7B', mutation: 'c.3207C>A', classification: 'Pathogenic', associatedPhenotype: 'Wilson Disease', orphanetLink: '', zygosity: 'Homozygous' }],
    clinicalBiomarkers: [{ name: 'Serum Ceruloplasmin', value: 8, unit: 'mg/dL', referenceRange: '20-35', status: 'Critical Low' }, { name: '24h Urine Copper', value: 120, unit: 'μg/24h', referenceRange: '<40', status: 'Critical High' }],
    proteomics: [{ protein: 'CP', foldChange: -2.5, pValue: 0.001, isSignificant: true }, { protein: 'ATP7B', foldChange: -4.1, pValue: 0.0001, isSignificant: true }], 
    predictions: [{ diseaseName: 'Wilson Disease', probability: 0.94, ordoId: 'ORPHA:905', confidenceInterval: [0.9, 0.98], description: 'Autosomal recessive disorder of copper metabolism.' }], 
    shapValues: [{ feature: 'ATP7B Variant', impact: 0.88, category: 'Genomic' }, { feature: 'Low Ceruloplasmin', impact: 0.75, category: 'Biomarker' }, { feature: 'High Urine Copper', impact: 0.65, category: 'Biomarker' }, { feature: 'Hepatic Signal', impact: 0.45, category: 'Imaging' }],
    knowledgeGraph: { nodes: [{ id: '1', label: 'Wilson Disease', type: 'Disease', x: 400, y: 150 }, { id: '2', label: 'ATP7B', type: 'Gene', x: 200, y: 100 }, { id: '3', label: 'Low Ceruloplasmin', type: 'Biomarker', x: 600, y: 100 }], links: [{ source: '2', target: '1' }, { source: '3', target: '1' }] },
    diseaseProfile: { name: 'Wilson Disease', pathway: ['Copper Homeostasis', 'Biliary Excretion'], treatment: ['Chelation (Penicillamine)', 'Zinc Acetate', 'Liver Transplant'], riskLevel: 'High', summary: 'Wilson disease is a rare genetic disorder caused by ATP7B deficiency.', explainability: 'The homozygous mutation in ATP7B gene (c.3207C>A) combined with low ceruloplasmin levels confirms copper accumulation.' },
    ehrSummary: "Patient exhibits tremors, jaundice, and Kayser-Fleischer rings."
  };
};

export const getFederatedData = () => ({ 
  nodes: [{ id: 'n1', hospitalName: 'Apollo Health Hub', status: 'Online', lastUpdate: '2 mins ago', contributionCount: 124, region: 'Asia-South' }, { id: 'n2', hospitalName: 'Mayo Clinic', status: 'Training', lastUpdate: 'Now', contributionCount: 450, region: 'US-East' }], 
  metrics: [{ round: 1, accuracy: 0.65, loss: 0.45, timestamp: '2024-01-01' }, { round: 5, accuracy: 0.78, loss: 0.32, timestamp: '2024-01-05' }, { round: 10, accuracy: 0.91, loss: 0.12, timestamp: '2024-01-10' }], 
  logs: [{ id: 'l1', nodeId: 'n1', hospitalName: 'Apollo Health Hub', action: 'Gradient Upload', size: '4.2MB', timestamp: new Date().toISOString() }] 
});
