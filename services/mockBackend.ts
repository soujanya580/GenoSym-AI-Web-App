
import { User, UserRole, RegistrationStatus, Hospital, Log, PatientCase, MultiModalAnalysis, Variant, AuditLogEntry, AuditAction } from '../types';
import { 
  sendHospitalRegistrationEmail, 
  sendHospitalApprovalEmail, 
  sendDoctorRegistrationEmail, 
  sendDoctorApprovalEmail
} from './emailService';

const USERS_KEY = 'genosym_users';
const HOSPITALS_KEY = 'genosym_hospitals';
const LOGS_KEY = 'genosym_logs';
const PATIENTS_KEY = 'genosym_patients';
const AUDIT_KEY = 'genosym_audit_ledger';
const ACTION_DIARY_KEY = 'genosym_action_diary';

// Pre-defined list of top Indian hospitals
const SEED_HOSPITALS: Hospital[] = [
  { id: 'h_1', name: 'AIIMS, New Delhi', address: 'Ansari Nagar, New Delhi', adminEmail: 'admin@aiims.edu', status: RegistrationStatus.APPROVED, registeredAt: new Date().toISOString() },
  { id: 'h_2', name: 'Apollo Hospitals, Chennai', address: 'Greams Road, Chennai', adminEmail: 'admin@apollo.com', status: RegistrationStatus.APPROVED, registeredAt: new Date().toISOString() },
  { id: 'h_3', name: 'Fortis Memorial Research Institute, Gurugram', address: 'Sector 44, Gurugram', adminEmail: 'admin@fortis.com', status: RegistrationStatus.APPROVED, registeredAt: new Date().toISOString() },
  { id: 'h_4', name: 'Medanta - The Medicity, Gurugram', address: 'CH Baktawar Singh Rd, Gurugram', adminEmail: 'admin@medanta.org', status: RegistrationStatus.APPROVED, registeredAt: new Date().toISOString() },
];

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

const addActionDiaryEntry = (entry: any) => {
  const diary = load<any[]>(ACTION_DIARY_KEY, []);
  const newEntry = { ...entry, id: `diary_${Date.now()}`, timestamp: new Date().toISOString() };
  save(ACTION_DIARY_KEY, [newEntry, ...diary]);
  window.dispatchEvent(new Event('diaryUpdated'));
};

export const validateCredentials = async (email: string, password: string): Promise<User | null> => {
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  const cleanEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);
  if (!user) return null;
  const isSuperAdmin = ['soujanyas580@gmail.com', 'sheethaln927@gmail.com'].includes(cleanEmail);
  if (isSuperAdmin || user.password === password) return user;
  return null;
};

export const registerHospital = async (name: string, address: string, adminName: string, adminEmail: string, password: string, contactNumber: string, documentName: string): Promise<boolean> => {
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  const hospitals = load<Hospital[]>(HOSPITALS_KEY, SEED_HOSPITALS);
  const cleanEmail = adminEmail.trim().toLowerCase();
  
  const hospitalId = `hosp_${Date.now()}`;
  const newHospital: Hospital = { 
    id: hospitalId, name, address, adminEmail: cleanEmail, status: RegistrationStatus.PENDING, registeredAt: new Date().toISOString(), contactNumber, accreditationDocument: documentName 
  };
  const newAdmin: User = { 
    email: cleanEmail, name: adminName, role: UserRole.HOSPITAL_ADMIN, hospitalId, status: RegistrationStatus.PENDING, password, contactNumber 
  };

  save(HOSPITALS_KEY, [...hospitals.filter(h => h.adminEmail.toLowerCase() !== cleanEmail), newHospital]);
  save(USERS_KEY, [...users.filter(u => u.email.toLowerCase() !== cleanEmail), newAdmin]);
  
  window.dispatchEvent(new Event('usersUpdated'));
  
  // REAL EMAIL TRIGGER FOR HOSPITAL REGISTRATION
  await sendHospitalRegistrationEmail(name, address, cleanEmail, adminName);
  
  return true;
};

export const registerDoctor = async (name: string, email: string, password: string, hospitalId: string, contactNumber: string, documentName: string): Promise<boolean> => {
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  const hospitals = load<Hospital[]>(HOSPITALS_KEY, SEED_HOSPITALS);
  const cleanEmail = email.trim().toLowerCase();
  
  const newDoctor: User = { 
    email: cleanEmail, name, role: UserRole.DOCTOR, hospitalId, status: RegistrationStatus.PENDING, password, contactNumber, licenseDocument: documentName 
  };
  
  save(USERS_KEY, [...users.filter(u => u.email.toLowerCase() !== cleanEmail), newDoctor]);
  window.dispatchEvent(new Event('usersUpdated'));

  // FETCH HOSPITAL INFO TO GET ADMIN EMAIL FOR CC
  const hospital = hospitals.find(h => h.id === hospitalId);
  const hospitalAdminEmail = hospital?.adminEmail || 'admin@genosym.com';
  
  // REAL EMAIL TRIGGER FOR DOCTOR REGISTRATION
  await sendDoctorRegistrationEmail(
    hospitalAdminEmail,
    name,
    cleanEmail,
    `Hospital: ${hospital?.name || 'New Institution'} (ID: ${hospitalId})`
  );

  return true;
};

export const approveDoctor = async (doctorEmail: string, approved: boolean, reason: string, actorEmail: string) => {
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  const cleanEmail = doctorEmail.trim().toLowerCase();
  const uIdx = users.findIndex(u => u.email.toLowerCase().trim() === cleanEmail);
  if (uIdx !== -1) {
    const status = approved ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED;
    users[uIdx].status = status;
    users[uIdx].rejectionReason = reason;
    save(USERS_KEY, users);
    addActionDiaryEntry({ actorEmail, targetName: users[uIdx].name, type: 'DOCTOR', action: approved ? 'APPROVED' : 'REJECTED', reason, hospitalId: users[uIdx].hospitalId });
    window.dispatchEvent(new Event('usersUpdated'));
    
    // REAL EMAIL TRIGGER FOR DOCTOR APPROVAL STATUS
    await sendDoctorApprovalEmail(users[uIdx].email, users[uIdx].name, approved, reason);
  }
};

export const approveHospital = async (hospitalId: string, approved: boolean, reason: string) => {
  const hospitals = load<Hospital[]>(HOSPITALS_KEY, SEED_HOSPITALS);
  const users = load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
  const hIdx = hospitals.findIndex(h => h.id === hospitalId);
  if (hIdx !== -1) {
    const status = approved ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED;
    hospitals[hIdx].status = status;
    hospitals[hIdx].rejectionReason = reason;
    save(HOSPITALS_KEY, hospitals);
    const adminEmail = hospitals[hIdx].adminEmail.toLowerCase().trim();
    const uIdx = users.findIndex(u => u.email.toLowerCase().trim() === adminEmail);
    if (uIdx !== -1) {
      users[uIdx].status = status;
      users[uIdx].rejectionReason = reason;
      save(USERS_KEY, users);
    }
    addActionDiaryEntry({ actorEmail: 'system@genosym.com', targetName: hospitals[hIdx].name, type: 'HOSPITAL', action: approved ? 'APPROVED' : 'REJECTED', reason, hospitalId: hospitalId });
    window.dispatchEvent(new Event('usersUpdated'));
    
    // REAL EMAIL TRIGGER FOR HOSPITAL APPROVAL STATUS
    await sendHospitalApprovalEmail(hospitals[hIdx].adminEmail, hospitals[hIdx].name, approved, reason);
  }
};

export const getHospitals = () => load<Hospital[]>(HOSPITALS_KEY, SEED_HOSPITALS);
export const getUsers = () => load<User[]>(USERS_KEY, SEED_SUPER_ADMINS);
export const getLogs = () => load<Log[]>(LOGS_KEY, []);
export const getActionDiary = (hospitalId?: string) => {
  const diary = load<any[]>(ACTION_DIARY_KEY, []);
  return hospitalId ? diary.filter(d => d.hospitalId === hospitalId) : diary;
};

export const getSystemAnalytics = () => {
  const hospitals = getHospitals();
  const users = getUsers();
  return {
    totalHospitals: hospitals.length,
    pendingHospitals: hospitals.filter(h => h.status === RegistrationStatus.PENDING).length,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === RegistrationStatus.APPROVED).length
  };
};

export const getAuditLogs = () => load<AuditLogEntry[]>(AUDIT_KEY, []);

export const getPatientCases = (email: string) => {
  const users = getUsers();
  const cleanEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);
  const allCases = load<PatientCase[]>(PATIENTS_KEY, []);
  if (user?.role === UserRole.DOCTOR) return allCases.filter(c => c.assignedDoctorEmail.toLowerCase().trim() === cleanEmail);
  if (user?.role === UserRole.HOSPITAL_ADMIN) {
    const hospitalDocs = users.filter(u => u.hospitalId === user.hospitalId).map(u => u.email.toLowerCase().trim());
    return allCases.filter(c => hospitalDocs.includes(c.assignedDoctorEmail.toLowerCase().trim()));
  }
  return allCases;
};

export const getPatientById = (id: string) => load<PatientCase[]>(PATIENTS_KEY, []).find(p => p.id === id);

export const createPatientCase = async (caseData: Partial<PatientCase>, doctorEmail: string): Promise<string> => {
  const patients = load<PatientCase[]>(PATIENTS_KEY, []);
  const id = `CASE-${Date.now()}`;
  const newCase: PatientCase = {
    id,
    patientName: caseData.patientName || 'Unknown',
    age: caseData.age || 0,
    gender: caseData.gender || 'Other',
    symptoms: caseData.symptoms || [],
    diagnosisStatus: 'Analyzing',
    dataTypes: caseData.dataTypes || [],
    assignedDoctorEmail: doctorEmail.toLowerCase().trim(),
    lastUpdated: new Date().toISOString(),
    consentStatus: true,
    timeline: [{ id: '1', date: new Date().toLocaleDateString(), title: 'Case Created', description: 'Record initialized.', type: 'system' }]
  } as PatientCase;
  save(PATIENTS_KEY, [newCase, ...patients]);
  return id;
};

export const getCaseAnalysisDetails = (caseId: string): MultiModalAnalysis => {
  // Use caseId to seed variation in mock data
  const seed = caseId.length % 3;
  
  const profiles = [
    {
      diseaseName: 'Wilson Disease',
      variants: [{ gene: 'ATP7B', mutation: 'c.3207C>A', classification: 'Pathogenic', associatedPhenotype: 'Wilson Disease', orphanetLink: '', zygosity: 'Homozygous' }],
      biomarkers: [
        { name: 'S-Ceruloplasmin', value: 8, unit: 'mg/dL', referenceRange: '20-35', status: 'Critical Low' },
        { name: 'U-Copper (24h)', value: 120, unit: 'μg/24h', referenceRange: '<40', status: 'Critical High' },
      ],
      imagingType: 'LIVER_SCAN',
      summary: 'Autosomal recessive disorder of copper metabolism.',
      treatment: ['D-Penicillamine', 'Zinc Acetate', 'Low-Copper Diet']
    },
    {
      diseaseName: 'Cystic Fibrosis',
      variants: [{ gene: 'CFTR', mutation: 'p.Phe508del', classification: 'Pathogenic', associatedPhenotype: 'Cystic Fibrosis', orphanetLink: '', zygosity: 'Heterozygous' }],
      biomarkers: [
        { name: 'Sweat Chloride', value: 95, unit: 'mmol/L', referenceRange: '<40', status: 'Critical High' },
        { name: 'IRT Level', value: 85, unit: 'ng/mL', referenceRange: '20-50', status: 'High' },
      ],
      imagingType: 'CHEST_XRAY',
      summary: 'Genetic disorder affecting the lungs and digestive system.',
      treatment: ['CFTR Modulators', 'Airway Clearance', 'Pancreatic Enzymes']
    },
    {
      diseaseName: 'Huntington Disease',
      variants: [{ gene: 'HTT', mutation: 'CAG Expansion', classification: 'Pathogenic', associatedPhenotype: 'Huntington', orphanetLink: '', zygosity: 'Heterozygous' }],
      biomarkers: [
        { name: 'NfL Level', value: 45, unit: 'pg/mL', referenceRange: '5-15', status: 'Critical High' },
        { name: 'Glutamate', value: 12, unit: 'μmol/g', referenceRange: '8-10', status: 'High' },
      ],
      imagingType: 'BRAIN_MRI',
      summary: 'Neurodegenerative disorder characterized by chorea and cognitive decline.',
      treatment: ['Tetrabenazine', 'Antipsychotics', 'Physical Therapy']
    }
  ];

  const p = profiles[seed];

  return {
    hasGenomic: true, hasProteomic: true, hasImaging: true,
    variants: p.variants as any,
    clinicalBiomarkers: p.biomarkers as any,
    proteomics: [{ protein: 'APO-E', foldChange: -2.1, pValue: 0.002, isSignificant: true }, { protein: 'ALB', foldChange: -1.5, pValue: 0.04, isSignificant: true }], 
    predictions: [{ diseaseName: p.diseaseName, probability: 0.92 + (Math.random() * 0.05), ordoId: 'ORPHA:123', description: p.summary }], 
    shapValues: [
      { feature: 'Genomic Variant', impact: 0.95, category: 'Genomic' }, 
      { feature: 'Biomarker Level', impact: 0.88, category: 'Biomarker' }, 
      { feature: 'Imaging Finding', impact: 0.62, category: 'Imaging' },
      { feature: 'EHR History', impact: 0.45, category: 'EHR' }
    ],
    diseaseProfile: { 
      name: p.diseaseName, 
      pathway: ['Metabolic Control', 'Cellular Transport'], 
      treatment: p.treatment, 
      riskLevel: 'High', 
      summary: p.summary, 
      explainability: `Deep learning analysis identifies the ${p.variants[0].gene} mutation as the primary driver.` 
    },
    ehrSummary: "Patient exhibits progressive clinical manifestations consistent with the genetic profile."
  };
};

export const getFederatedData = () => ({ 
  nodes: [{ id: 'n1', hospitalName: 'Apollo Global', status: 'Online', lastUpdate: '2 mins ago', contributionCount: 124, region: 'Asia-South' }, { id: 'n2', hospitalName: 'Mayo Clinic', status: 'Training', lastUpdate: 'Now', contributionCount: 450, region: 'US-East' }], 
  metrics: [{ round: 1, accuracy: 0.65, loss: 0.45, timestamp: '2024-01-01' }, { round: 10, accuracy: 0.91, loss: 0.12, timestamp: '2024-01-10' }], 
  logs: [{ id: 'l1', nodeId: 'n1', hospitalName: 'Apollo Global', action: 'Gradient Upload', size: '4.2MB', timestamp: new Date().toISOString() }] 
});
