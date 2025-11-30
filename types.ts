
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  DOCTOR = 'DOCTOR'
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  email: string;
  name: string;
  role: UserRole;
  hospitalId?: string; // For Hospital Admins and Doctors
  status: RegistrationStatus;
  password?: string; // Mock only
  contactNumber?: string;
  licenseDocument?: string; // Mock file name/url
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  adminEmail: string;
  status: RegistrationStatus;
  registeredAt: string;
  contactNumber?: string;
  accreditationDocument?: string; // Mock file name/url
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'medical' | 'system' | 'upload';
}

export interface PatientCase {
  id: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodType?: string;
  symptoms: string[];
  diagnosisStatus: 'Undiagnosed' | 'Diagnosed' | 'Analyzing';
  dataTypes: ('Genomic' | 'Proteomic' | 'EHR' | 'Imaging' | 'Neurology' | 'Biomarker')[];
  assignedDoctorEmail: string;
  lastUpdated: string;
  consentStatus: boolean;
  timeline: TimelineEvent[];
  demographics?: { 
    dob: string;
    contact?: string;
  }
}

export enum AnalysisType {
  GENOMIC = 'Genomic',
  PROTEOMIC = 'Proteomic',
  BIOMARKER = 'Biomarker',
  NEUROLOGY = 'Neurology',
  EHR = 'EHR',
  IMAGING = 'Imaging',
  SHAP = 'SHAP Analysis',
  FEDERATED = 'Federated Learning'
}

export interface Log {
  id: string;
  message: string;
  type: 'INFO' | 'EMAIL' | 'ALERT';
  timestamp: string;
}

// --- Audit & Compliance Types ---

export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  VIEW_PATIENT = 'VIEW_PATIENT',
  EXPORT_DATA = 'EXPORT_DATA',
  CREATE_CASE = 'CREATE_CASE',
  APPROVE_USER = 'APPROVE_USER',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS'
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  userRole: UserRole | 'UNKNOWN';
  action: AuditAction;
  resourceId?: string; // Patient ID or Hospital ID
  caseId?: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILURE' | 'SUSPICIOUS';
  details: string;
}

// --- Advanced Analysis Types ---

export interface Variant {
  gene: string;
  mutation: string;
  classification: 'Pathogenic' | 'Likely Pathogenic' | 'VUS';
  associatedPhenotype: string;
  orphanetLink: string;
  zygosity: 'Heterozygous' | 'Homozygous';
  caddScore?: number;
}

export interface ClinicalBiomarker {
  name: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'Normal' | 'High' | 'Low' | 'Critical High' | 'Critical Low';
  description?: string;
}

export interface ProteomicData {
  protein: string;
  foldChange: number;
  pValue: number;
  isSignificant: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'Gene' | 'Biomarker' | 'Symptom' | 'Imaging' | 'Disease';
  x: number;
  y: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface PredictionResult {
  diseaseName: string;
  probability: number;
  ordoId: string;
  confidenceInterval: [number, number];
  description: string;
}

export interface DiseaseProfile {
  name: string;
  pathway: string[];
  treatment: string[];
  riskLevel: 'High' | 'Moderate' | 'Low';
}

export interface MultiModalAnalysis {
  hasGenomic: boolean;
  hasProteomic: boolean;
  hasImaging: boolean;
  variants: Variant[];
  clinicalBiomarkers: ClinicalBiomarker[]; // For specific charts (Bar/Gauge)
  proteomics: ProteomicData[]; // For volcano plots
  predictions: PredictionResult[];
  shapValues: { feature: string; impact: number; category: string }[];
  knowledgeGraph: { nodes: GraphNode[]; links: GraphLink[] };
  diseaseProfile: DiseaseProfile;
  ehrSummary: string;
}

// --- Federated Learning Types ---

export interface FederatedNode {
  id: string;
  hospitalName: string;
  status: 'Online' | 'Training' | 'Syncing' | 'Offline';
  lastUpdate: string;
  contributionCount: number; // Number of parameter updates contributed
  region: string;
}

export interface ModelMetric {
  round: number;
  accuracy: number;
  loss: number;
  timestamp: string;
}

export interface FederatedLog {
  id: string;
  nodeId: string;
  hospitalName: string;
  action: 'Gradient Upload' | 'Model Download' | 'Aggregation' | 'Validation';
  size: string; // e.g. "2.4 MB" (Weights only)
  timestamp: string;
}
