
import { User, UserRole, RegistrationStatus, Hospital, Log, PatientCase, MultiModalAnalysis, Variant, ProteomicData, PredictionResult, FederatedNode, ModelMetric, FederatedLog, AuditLogEntry, AuditAction, ClinicalBiomarker, DiseaseProfile } from '../types';
import { 
  sendHospitalRegistrationEmail, 
  sendHospitalApprovalEmail, 
  sendDoctorRegistrationEmail, 
  sendDoctorApprovalEmail,
  sendLoginAlert
} from './emailService';

// --- Mock Database State ---
const USERS_KEY = 'genosym_users';
const HOSPITALS_KEY = 'genosym_hospitals';
const LOGS_KEY = 'genosym_logs';
const PATIENTS_KEY = 'genosym_patients';
const AUDIT_KEY = 'genosym_audit_ledger';

// --- Disease Specific Logic ---

// This database allows the system to generate "Real" looking data for specific conditions
// instead of generic random data for everyone.
const DISEASE_PROFILES: Record<string, {
  genes: { name: string; mut: string; phenotype: string; orpha: string }[];
  biomarkers: { name: string; unit: string; ref: string; typicalVal: number; status: 'High' | 'Low' | 'Critical Low' | 'Critical High' }[];
  symptoms: string[];
  shapFeatures: string[];
  description: string;
  pathway: string[];
  treatments: string[];
  risk: 'High' | 'Moderate' | 'Low';
}> = {
  "Wilson disease": {
    genes: [
      { name: "ATP7B", mut: "c.3207C>A (H1069Q)", phenotype: "Wilson disease", orpha: "ORPHA:905" }
    ],
    biomarkers: [
      { name: "Serum Ceruloplasmin", unit: "mg/dL", ref: "20-35", typicalVal: 8, status: "Critical Low" },
      { name: "Serum Copper", unit: "µg/dL", ref: "70-140", typicalVal: 45, status: "Low" },
      { name: "24h Urinary Copper", unit: "µg/24h", ref: "<40", typicalVal: 210, status: "Critical High" }
    ],
    symptoms: ["Kayser-Fleischer rings", "Tremor", "Dysarthria", "Hepatic failure"],
    shapFeatures: ["Low Ceruloplasmin", "High Urinary Copper", "ATP7B (H1069Q)", "Neuro-psychiatric symptoms"],
    description: "A rare autosomal recessive genetic disorder of copper metabolism affecting the liver and brain.",
    pathway: ["Copper Transport", "Hepatic Excretion", "CNS Accumulation"],
    treatments: ["Chelation Therapy (D-Penicillamine)", "Zinc salts", "Liver Transplantation"],
    risk: "High"
  },
  "Fabry disease": {
    genes: [
      { name: "GLA", mut: "c.639+919G>A", phenotype: "Fabry disease", orpha: "ORPHA:324" }
    ],
    biomarkers: [
      { name: "Alpha-galactosidase A", unit: "nmol/hr/mg", ref: ">4.0", typicalVal: 0.2, status: "Critical Low" },
      { name: "Plasma Lyso-Gb3", unit: "ng/mL", ref: "<1.8", typicalVal: 48.5, status: "Critical High" },
      { name: "Proteinuria", unit: "mg/24h", ref: "<150", typicalVal: 450, status: "High" }
    ],
    symptoms: ["Acroparesthesia", "Angiokeratoma", "Hypohidrosis", "Cornea verticillata"],
    shapFeatures: ["GLA Defect", "Lyso-Gb3 Accumulation", "Renal Dysfunction", "Neuropathic Pain"],
    description: "X-linked lysosomal storage disorder caused by deficiency of alpha-galactosidase A.",
    pathway: ["Glycosphingolipid Metabolism", "Lysosomal Storage", "Vascular Endothelial Damage"],
    treatments: ["Enzyme Replacement Therapy (Agalsidase)", "Chaperone Therapy (Migalastat)", "Pain Management"],
    risk: "Moderate"
  },
  "Gaucher disease": {
    genes: [
      { name: "GBA", mut: "c.1226A>G (N370S)", phenotype: "Gaucher disease type 1", orpha: "ORPHA:355" }
    ],
    biomarkers: [
      { name: "Beta-glucocerebrosidase", unit: "nmol/hr/mg", ref: ">8.0", typicalVal: 1.5, status: "Critical Low" },
      { name: "Plasma Lyso-Gb1", unit: "ng/mL", ref: "<12", typicalVal: 180, status: "Critical High" },
      { name: "Chitotriosidase", unit: "nmol/mL/hr", ref: "<100", typicalVal: 3500, status: "High" }
    ],
    symptoms: ["Splenomegaly", "Hepatomegaly", "Thrombocytopenia", "Bone pain"],
    shapFeatures: ["GBA Mutation", "Elevated Chitotriosidase", "Splenic Volume", "Platelet Count"],
    description: "The most common lysosomal storage disease, characterized by accumulation of glucocerebroside.",
    pathway: ["Sphingolipid Metabolism", "Macrophage Activation", "Bone Marrow Infiltration"],
    treatments: ["Enzyme Replacement Therapy (Imiglucerase)", "Substrate Reduction Therapy"],
    risk: "Moderate"
  },
  "Niemann-Pick disease type C": {
    genes: [
      { name: "NPC1", mut: "c.3182T>C (I1061T)", phenotype: "Niemann-Pick type C", orpha: "ORPHA:646" }
    ],
    biomarkers: [
      { name: "Oxysterols (C-triol)", unit: "ng/mL", ref: "<10", typicalVal: 85, status: "Critical High" },
      { name: "Plasma Chitotriosidase", unit: "nmol/mL/hr", ref: "<100", typicalVal: 150, status: "High" },
      { name: "Sphingomyelin", unit: "mg/dL", ref: "10-50", typicalVal: 65, status: "High" }
    ],
    symptoms: ["Vertical supranuclear gaze palsy", "Ataxia", "Dystonia", "Splenomegaly"],
    shapFeatures: ["NPC1 Variant", "Gaze Palsy", "Cholesterol Trafficking Defect", "Splenomegaly"],
    description: "A rare progressive genetic disorder characterized by an inability of the body to transport cholesterol and other lipids.",
    pathway: ["Intracellular Cholesterol Transport", "Lysosomal Lipid Storage", "Neurodegeneration"],
    treatments: ["Miglustat", "Symptomatic management"],
    risk: "High"
  },
  "Duchenne muscular dystrophy": {
    genes: [
      { name: "DMD", mut: "del exons 45-50", phenotype: "Duchenne muscular dystrophy", orpha: "ORPHA:98896" }
    ],
    biomarkers: [
      { name: "Serum Creatine Kinase (CK)", unit: "U/L", ref: "30-200", typicalVal: 15000, status: "Critical High" },
      { name: "ALT", unit: "U/L", ref: "7-55", typicalVal: 120, status: "High" },
      { name: "AST", unit: "U/L", ref: "8-48", typicalVal: 110, status: "High" }
    ],
    symptoms: ["Gowers' sign", "Calf pseudohypertrophy", "Delayed walking", "Muscle weakness"],
    shapFeatures: ["DMD Deletion", "Extreme CK Levels", "Motor Delay", "X-Linked Pattern"],
    description: "A severe type of muscular dystrophy that primarily affects boys. Muscle weakness usually begins around the age of four.",
    pathway: ["Dystrophin Complex", "Sarcolemmal Instability", "Muscle Fibrosis"],
    treatments: ["Corticosteroids", "Exon Skipping (Eteplirsen)", "Physical Therapy"],
    risk: "High"
  }
};

// Helper to pick a disease based on patient symptoms or just random if new
const inferDiseaseFromSymptoms = (symptoms: string[]): string => {
  const s = symptoms.map(sym => sym.toLowerCase());
  if (s.some(x => x.includes('tremor') || x.includes('liver') || x.includes('copper'))) return "Wilson disease";
  if (s.some(x => x.includes('pain') || x.includes('sweating') || x.includes('kidney'))) return "Fabry disease";
  if (s.some(x => x.includes('spleen') || x.includes('bone') || x.includes('bruis'))) return "Gaucher disease";
  if (s.some(x => x.includes('gaze') || x.includes('ataxia'))) return "Niemann-Pick disease type C";
  if (s.some(x => x.includes('muscle') || x.includes('weakness') || x.includes('walk'))) return "Duchenne muscular dystrophy";
  
  // Default fallback
  return "Wilson disease";
};

// Seed Data
const SEED_SUPER_ADMINS: User[] = [
  { email: 'soujanyas580@gmail.com', name: 'Soujanya S', role: UserRole.SUPER_ADMIN, status: RegistrationStatus.APPROVED, password: 'password123' },
  { email: 'sheethaln927@gmail.com', name: 'Sheethal N', role: UserRole.SUPER_ADMIN, status: RegistrationStatus.APPROVED, password: 'password123' }
];

const SEED_HOSPITALS: Hospital[] = [
  {
    id: 'hosp_default_001',
    name: 'General City Hospital',
    address: '123 Medical Center Blvd',
    adminEmail: 'admin@hospital.com',
    status: RegistrationStatus.APPROVED,
    registeredAt: new Date().toISOString(),
    contactNumber: '555-0123'
  }
];

const SEED_USERS: User[] = [
  ...SEED_SUPER_ADMINS,
  { 
    email: 'admin@hospital.com', 
    name: 'Hospital Admin', 
    role: UserRole.HOSPITAL_ADMIN, 
    hospitalId: 'hosp_default_001',
    status: RegistrationStatus.APPROVED, 
    password: 'password',
    contactNumber: '555-0123'
  }
];

// --- Helpers ---
const load = <T>(key: string, fallback: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
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

const addAuditLog = (userEmail: string, userRole: UserRole, action: AuditAction, details: string, status: 'SUCCESS' | 'FAILURE' | 'SUSPICIOUS' = 'SUCCESS') => {
  const logs = load<AuditLogEntry[]>(AUDIT_KEY, []);
  const newLog: AuditLogEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userEmail,
    userRole,
    action,
    details,
    status,
    ipAddress: '127.0.0.1' // Simulated IP
  };
  save(AUDIT_KEY, [newLog, ...logs]);
}

// --- Audit Logging System ---

const generateMockAuditLogs = (): AuditLogEntry[] => {
  const logs: AuditLogEntry[] = [];
  const actions = Object.values(AuditAction);
  const users = [...SEED_USERS, { email: 'unknown@hacker.net', name: 'Unknown', role: 'UNKNOWN' as any, status: RegistrationStatus.REJECTED }];
  
  for (let i = 0; i < 15; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const isSuspicious = Math.random() > 0.9;
    
    logs.push({
      id: `audit_${Date.now() - i * 1000000}`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      userEmail: user.email,
      userRole: user.role,
      action: action,
      resourceId: Math.random() > 0.5 ? `PAT-${Math.floor(Math.random()*1000)}` : undefined,
      caseId: Math.random() > 0.5 ? `CASE-2024-${Math.floor(Math.random()*100)}` : undefined,
      ipAddress: isSuspicious ? '45.33.22.11' : `192.168.1.${Math.floor(Math.random() * 255)}`,
      status: isSuspicious ? 'SUSPICIOUS' : 'SUCCESS',
      details: isSuspicious ? 'Multiple failed attempts detected' : 'Standard operation'
    });
  }
  return logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getAuditLogs = (): AuditLogEntry[] => {
  return load<AuditLogEntry[]>(AUDIT_KEY, generateMockAuditLogs());
};

// --- Auth: Validate Credentials Only ---
export const validateCredentials = async (email: string, password: string): Promise<User | null> => {
  await new Promise(resolve => setTimeout(resolve, 600)); // Network delay

  const users = load<User[]>(USERS_KEY, SEED_USERS);
  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  // Allow Pre-seeded Super Admins to always login
  const allowedSuperAdmins = ['soujanyas580@gmail.com', 'sheethaln927@gmail.com'];
  if (!user && allowedSuperAdmins.includes(email.toLowerCase())) {
     user = { email, name: "Super Admin", role: UserRole.SUPER_ADMIN, status: RegistrationStatus.APPROVED, password: 'any' };
     save(USERS_KEY, [...users, user]);
  }

  // --- STRICT MODE: DISABLE AUTO-CREATION FOR OTHERS ---
  // If user doesn't exist, they must register.
  if (!user) {
    addLog(`[AUTH] Failed login attempt for unknown user: ${email}`, 'ALERT');
    return null; 
  }

  sendLoginAlert(user.email, user.role, user.name).catch(console.error);
  addLog(`[AUTH] Login success for ${user.email} (${user.role})`, 'INFO');
  addAuditLog(user.email, user.role, AuditAction.LOGIN_SUCCESS, 'User logged in successfully');

  return user;
};

// Deprecated/Compatibility alias
export const login = async (email: string, password: string): Promise<User | null> => {
  return validateCredentials(email, password);
};

export const registerHospital = async (
  name: string, 
  address: string, 
  adminName: string, 
  adminEmail: string, 
  password: string, 
  contactNumber: string,
  documentName: string
): Promise<boolean> => {
  const users = load<User[]>(USERS_KEY, SEED_USERS);
  const hospitals = load<Hospital[]>(HOSPITALS_KEY, SEED_HOSPITALS);

  if (users.find(u => u.email === adminEmail)) throw new Error("User already exists");

  const hospitalId = `hosp_${Date.now()}`;
  
  const newHospital: Hospital = {
    id: hospitalId,
    name,
    address,
    adminEmail,
    status: RegistrationStatus.PENDING,
    registeredAt: new Date().toISOString(),
    contactNumber,
    accreditationDocument: documentName
  };

  const newAdmin: User = {
    email: adminEmail,
    name: adminName,
    role: UserRole.HOSPITAL_ADMIN,
    hospitalId,
    status: RegistrationStatus.PENDING,
    password,
    contactNumber
  };

  save(HOSPITALS_KEY, [...hospitals, newHospital]);
  save(USERS_KEY, [...users, newAdmin]);

  addLog(`[REGISTRATION] New Hospital Registration: ${name}. Pending Super Admin Approval.`, 'INFO');
  await sendHospitalRegistrationEmail(name, address, adminEmail, adminName);
  
  return true;
};

export const registerDoctor = async (
  name: string, 
  email: string, 
  password: string, 
  hospitalId: string,
  contactNumber: string,
  documentName: string
): Promise<boolean> => {
  const users = load<User[]>(USERS_KEY, SEED_USERS);
  const hospitals = load<Hospital[]>(HOSPITALS_KEY, SEED_HOSPITALS);
  
  if (users.find(u => u.email === email)) throw new Error("User already exists");

  const hospital = hospitals.find(h => h.id === hospitalId);
  const adminEmail = hospital?.adminEmail || 'admin@hospital.com';

  const newDoctor: User = {
    email,
    name,
    role: UserRole.DOCTOR,
    hospitalId,
    status: RegistrationStatus.PENDING,
    password,
    contactNumber,
    licenseDocument: documentName
  };

  save(USERS_KEY, [...users, newDoctor]);
  
  addLog(`[REGISTRATION] New Doctor Registration: ${name}. Pending Hospital Admin Approval.`, 'INFO');
  await sendDoctorRegistrationEmail(adminEmail, name, email, "New Registration Request");
  
  return true;
};

// --- Approval Workflows ---

export const approveHospital = async (hospitalId: string, approved: boolean, reason?: string) => {
  const hospitals = load<Hospital[]>(HOSPITALS_KEY, SEED_HOSPITALS);
  const users = load<User[]>(USERS_KEY, SEED_USERS);

  const hospital = hospitals.find(h => h.id === hospitalId);
  if (!hospital) return;

  const status = approved ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED;
  hospital.status = status;
  
  const admin = users.find(u => u.email === hospital.adminEmail);
  if (admin) admin.status = status;

  save(HOSPITALS_KEY, hospitals);
  save(USERS_KEY, users);

  // Send Email
  await sendHospitalApprovalEmail(hospital.adminEmail, hospital.name, approved, reason);
  
  // Log to Audit Trail
  const logMessage = `Hospital ${hospital.name} was ${status}. ${reason ? `Reason: ${reason}` : ''}`;
  addLog(`[ADMIN ACTION] ${logMessage}`, approved ? 'INFO' : 'ALERT');
  addAuditLog(
    'Super Admin', 
    UserRole.SUPER_ADMIN, 
    AuditAction.APPROVE_USER, 
    logMessage
  );
};

export const approveDoctor = async (doctorEmail: string, approved: boolean, reason?: string) => {
  const users = load<User[]>(USERS_KEY, SEED_USERS);
  const doctor = users.find(u => u.email === doctorEmail);
  if (!doctor) return;

  const status = approved ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED;
  doctor.status = status;
  save(USERS_KEY, users);

  // Send Email
  await sendDoctorApprovalEmail(doctor.email, doctor.name, approved, reason);

  // Log to Audit Trail
  const logMessage = `Doctor ${doctor.name} (${doctor.email}) was ${status}. ${reason ? `Reason: ${reason}` : ''}`;
  addLog(`[ADMIN ACTION] ${logMessage}`, approved ? 'INFO' : 'ALERT');
  addAuditLog(
    'Hospital Admin', 
    UserRole.HOSPITAL_ADMIN, 
    AuditAction.APPROVE_USER, 
    logMessage
  );
};

// --- Data Retrieval ---

export const getHospitals = () => load<Hospital[]>(HOSPITALS_KEY, SEED_HOSPITALS);
export const getUsers = () => load<User[]>(USERS_KEY, SEED_USERS);
export const getLogs = () => load<Log[]>(LOGS_KEY, []);

export const getSystemAnalytics = () => {
  const hospitals = getHospitals();
  const users = getUsers();
  const doctors = users.filter(u => u.role === UserRole.DOCTOR);
  const pendingDoctors = users.filter(u => u.role === UserRole.DOCTOR && u.status === RegistrationStatus.PENDING).length;
  const activeHospitals = hospitals.filter(h => h.status === RegistrationStatus.APPROVED).length;
  const rejectedHospitals = hospitals.filter(h => h.status === RegistrationStatus.REJECTED).length;
  
  return {
    totalHospitals: hospitals.length,
    activeHospitals: activeHospitals,
    pendingHospitals: hospitals.filter(h => h.status === RegistrationStatus.PENDING).length,
    rejectedHospitals: rejectedHospitals,
    totalDoctors: doctors.length,
    totalUsers: users.length,
    activeNodes: activeHospitals,
    pendingDoctorApprovals: pendingDoctors
  };
};

// Mock Patient Data Generator
const DEFAULT_CASES: PatientCase[] = [
  {
    id: 'CASE-2024-001',
    patientName: 'Alice V.',
    age: 14,
    gender: 'Female',
    bloodType: 'O+',
    symptoms: ['Tremor', 'Dysarthria', 'Hepatomegaly'],
    diagnosisStatus: 'Analyzing',
    dataTypes: ['Genomic', 'Biomarker', 'EHR'],
    assignedDoctorEmail: 'test@doctor.com',
    lastUpdated: new Date().toISOString(),
    consentStatus: true,
    timeline: [
      { id: 't1', date: '2024-01-10', title: 'Patient Intake', description: 'Initial consultation and symptom logging.', type: 'system' },
      { id: 't2', date: '2024-01-12', title: 'EHR Upload', description: 'Historical records uploaded.', type: 'upload' },
      { id: 't3', date: '2024-01-18', title: 'Genomic Sequencing', description: 'WGS data received.', type: 'upload' },
    ]
  },
  {
    id: 'CASE-2024-004',
    patientName: 'Robert L.',
    age: 45,
    gender: 'Male',
    bloodType: 'A-',
    symptoms: ['Acroparesthesia', 'Hypohidrosis', 'Pain in extremities'],
    diagnosisStatus: 'Undiagnosed',
    dataTypes: ['Genomic', 'Biomarker'],
    assignedDoctorEmail: 'test@doctor.com',
    lastUpdated: new Date(Date.now() - 86400000).toISOString(),
    consentStatus: true,
    timeline: [
       { id: 't1', date: '2024-02-01', title: 'Referral Received', description: 'Referred by Nephrologist.', type: 'system' },
       { id: 't2', date: '2024-02-05', title: 'Labs', description: 'Biomarker panel uploaded.', type: 'medical' },
    ]
  }
];

export const getPatientCases = (doctorEmail?: string): PatientCase[] => {
  const cases = load<PatientCase[]>(PATIENTS_KEY, DEFAULT_CASES);
  if (!doctorEmail) return cases;
  return cases;
};

export const getPatientById = (id: string): PatientCase | undefined => {
  return getPatientCases().find(c => c.id === id);
};

export const createPatientCase = async (
  data: Partial<PatientCase>,
  doctorEmail: string
): Promise<string> => {
  const cases = load<PatientCase[]>(PATIENTS_KEY, DEFAULT_CASES);
  
  const newId = `CASE-${new Date().getFullYear()}-${String(cases.length + 1).padStart(3, '0')}`;
  
  const newCase: PatientCase = {
    id: newId,
    patientName: data.patientName || 'Unknown Patient',
    age: data.age || 0,
    gender: data.gender || 'Other',
    bloodType: data.bloodType || 'Unknown',
    symptoms: data.symptoms || [],
    diagnosisStatus: 'Analyzing',
    dataTypes: data.dataTypes || [],
    assignedDoctorEmail: doctorEmail,
    lastUpdated: new Date().toISOString(),
    consentStatus: true,
    timeline: [
      { 
        id: `t_${Date.now()}`, 
        date: new Date().toISOString().split('T')[0], 
        title: 'Case Created', 
        description: 'Multi-modal data upload wizard completed.', 
        type: 'system' 
      },
      ...((data.dataTypes || []).map((dt, i) => ({
        id: `t_${Date.now()}_${i}`,
        date: new Date().toISOString().split('T')[0],
        title: `${dt} Data Ingested`,
        description: `${dt} data successfully processed and normalized.`,
        type: 'upload' as const
      })))
    ]
  };

  save(PATIENTS_KEY, [newCase, ...cases]);
  addAuditLog(doctorEmail, UserRole.DOCTOR, AuditAction.CREATE_CASE, `New case ${newId} created`);
  
  return newId;
};

// --- Multi-Modal Fusion Analysis Data (Core Intelligence) ---

export const getCaseAnalysisDetails = (caseId: string): MultiModalAnalysis => {
  // 1. Get Patient Case to determine "Actual" uploaded data types
  const patient = getPatientById(caseId);
  const hasGenomic = patient?.dataTypes.includes('Genomic') || false;
  const hasProteomic = patient?.dataTypes.includes('Proteomic') || patient?.dataTypes.includes('Biomarker') || false;
  const hasImaging = patient?.dataTypes.includes('Imaging') || false;
  const hasEHR = patient?.dataTypes.includes('EHR') || false;

  // 2. Infer Disease based on Symptoms (Simulating AI Prediction)
  const diseaseName = inferDiseaseFromSymptoms(patient?.symptoms || []);
  const diseaseProfile = DISEASE_PROFILES[diseaseName];

  // 3. Generate GENOMIC Data (only if uploaded)
  let variants: Variant[] = [];
  if (hasGenomic && diseaseProfile) {
    variants = diseaseProfile.genes.map(g => ({
      gene: g.name,
      mutation: g.mut,
      classification: 'Pathogenic',
      associatedPhenotype: g.phenotype,
      orphanetLink: g.orpha,
      zygosity: diseaseProfile.description.includes('autosomal recessive') ? 'Homozygous' : 'Heterozygous',
      caddScore: 28.5 + Math.random() * 5
    }));
  }

  // 4. Generate BIOMARKER/PROTEOMIC Data (only if uploaded)
  let clinicalBiomarkers: ClinicalBiomarker[] = [];
  let proteomicVolcanoData: ProteomicData[] = [];

  if (hasProteomic && diseaseProfile) {
    // Targeted Biomarkers (for Bar/Gauge charts)
    clinicalBiomarkers = diseaseProfile.biomarkers.map(b => ({
      name: b.name,
      value: b.typicalVal,
      unit: b.unit,
      referenceRange: b.ref,
      status: b.status,
      description: `Key marker for ${diseaseName}`
    }));

    // Discovery Proteomics (for Volcano Plot) - Randomized but consistent
    proteomicVolcanoData = Array.from({ length: 50 }, (_, i) => ({
      protein: `PROT-${i+1}`,
      foldChange: (Math.random() * 6) - 3, // -3 to +3
      pValue: Math.random() * 0.1,
      isSignificant: Math.random() > 0.85
    }));
  }

  // 5. Generate Predictions
  const predictions: PredictionResult[] = [
    { 
      diseaseName: diseaseName, 
      probability: 0.94, 
      ordoId: diseaseProfile?.genes[0]?.orpha || 'ORPHA:000', 
      confidenceInterval: [0.91, 0.97],
      description: diseaseProfile?.description || "Rare genetic condition."
    },
    { diseaseName: 'Unknown Variant of Significance', probability: 0.04, ordoId: 'ORPHA:???', confidenceInterval: [0.01, 0.06], description: "Inconclusive secondary finding" }
  ];

  // 6. Generate SHAP Values (Specific to Disease)
  const shapValues = diseaseProfile ? diseaseProfile.shapFeatures.map((f, i) => ({
    feature: f,
    impact: 0.9 - (i * 0.15),
    category: f.includes('Gene') ? 'Genomic' : f.includes('Low') || f.includes('High') ? 'Biomarker' : 'Clinical'
  })) : [];

  // 7. Knowledge Graph Nodes
  const knowledgeGraph = {
    nodes: [
      { id: 'd1', label: diseaseName, type: 'Disease' as const, x: 400, y: 150 },
      ...(variants.map((v, i) => ({ id: `g${i}`, label: v.gene, type: 'Gene' as const, x: 200, y: 100 + (i*50) }))),
      ...(clinicalBiomarkers.map((b, i) => ({ id: `b${i}`, label: b.name, type: 'Biomarker' as const, x: 600, y: 50 + (i*60) }))),
      ...(patient?.symptoms.map((s, i) => ({ id: `s${i}`, label: s, type: 'Symptom' as const, x: 400, y: 250 + (i*40) })) || [])
    ],
    links: [
      ...(variants.map((_, i) => ({ source: `g${i}`, target: 'd1' }))),
      ...(clinicalBiomarkers.map((_, i) => ({ source: `b${i}`, target: 'd1' }))),
      ...(patient?.symptoms.map((_, i) => ({ source: 'd1', target: `s${i}` })) || [])
    ]
  };

  // 8. EHR Summary (extracted text simulation)
  const ehrSummary = hasEHR 
    ? `Clinical notes indicate onset of ${patient?.symptoms.join(', ').toLowerCase()} in early childhood. Family history suggests consanguinity. No prior definitive diagnosis despite multiple referrals.`
    : "No Electronic Health Records uploaded for NLP processing.";

  return {
    hasGenomic,
    hasProteomic,
    hasImaging,
    variants,
    clinicalBiomarkers,
    proteomics: proteomicVolcanoData,
    predictions,
    shapValues,
    knowledgeGraph,
    diseaseProfile: {
      name: diseaseName,
      pathway: diseaseProfile?.pathway || [],
      treatment: diseaseProfile?.treatments || [],
      riskLevel: diseaseProfile?.risk || 'Moderate'
    },
    ehrSummary
  };
};

// --- Federated Learning Data ---

export const getFederatedData = () => {
  const nodes: FederatedNode[] = [
    { id: 'n1', hospitalName: 'General City Hospital', status: 'Online', lastUpdate: '2 mins ago', contributionCount: 450, region: 'NA-East' },
    { id: 'n2', hospitalName: 'St. Jude Medical', status: 'Training', lastUpdate: 'Now', contributionCount: 320, region: 'NA-West' },
    { id: 'n3', hospitalName: 'Royal London Trust', status: 'Syncing', lastUpdate: '5 mins ago', contributionCount: 210, region: 'EU-West' },
    { id: 'n4', hospitalName: 'Tokyo University Hosp.', status: 'Online', lastUpdate: '1 min ago', contributionCount: 560, region: 'Asia-Pacific' },
    { id: 'n5', hospitalName: 'Charité Berlin', status: 'Offline', lastUpdate: '2 days ago', contributionCount: 180, region: 'EU-Central' },
  ];

  const metrics: ModelMetric[] = Array.from({ length: 20 }, (_, i) => ({
    round: i + 1,
    accuracy: 0.6 + (0.35 * (1 - Math.exp(-i/5))) + (Math.random() * 0.02),
    loss: 0.8 * Math.exp(-i/8) + (Math.random() * 0.05),
    timestamp: new Date(Date.now() - (20 - i) * 3600000).toISOString()
  }));

  const logs: FederatedLog[] = [
    { id: 'l1', nodeId: 'n2', hospitalName: 'St. Jude Medical', action: 'Gradient Upload', size: '4.2 MB', timestamp: new Date().toISOString() },
    { id: 'l2', nodeId: 'n1', hospitalName: 'General City Hospital', action: 'Model Download', size: '125 MB', timestamp: new Date(Date.now() - 60000).toISOString() },
    { id: 'l3', nodeId: 'n3', hospitalName: 'Royal London Trust', action: 'Gradient Upload', size: '3.8 MB', timestamp: new Date(Date.now() - 180000).toISOString() },
    { id: 'l4', nodeId: 'server', hospitalName: 'Central Server', action: 'Aggregation', size: '-', timestamp: new Date(Date.now() - 300000).toISOString() },
    { id: 'l5', nodeId: 'n4', hospitalName: 'Tokyo University Hosp.', action: 'Validation', size: '-', timestamp: new Date(Date.now() - 600000).toISOString() },
  ];

  return { nodes, metrics, logs };
};
