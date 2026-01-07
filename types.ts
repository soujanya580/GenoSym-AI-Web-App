
/**
 * Defines the various types of medical data analysis supported by the platform.
 */
export type AnalysisType = 'Genomic' | 'Proteomic' | 'Imaging' | 'EHR' | 'SHAP' | 'Federated';

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
  hospitalId?: string; 
  status: RegistrationStatus;
  password?: string; 
  contactNumber?: string;
  licenseDocument?: string;
  rejectionReason?: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  adminEmail: string;
  status: RegistrationStatus;
  registeredAt: string;
  contactNumber?: string;
  accreditationDocument?: string;
  rejectionReason?: string;
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
}

export interface Variant {
  gene: string;
  mutation: string;
  classification: 'Pathogenic' | 'Likely Pathogenic' | 'VUS';
  associatedPhenotype: string;
  orphanetLink: string;
  zygosity: 'Heterozygous' | 'Homozygous';
}

export interface ClinicalBiomarker {
  name: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'Normal' | 'High' | 'Low' | 'Critical High' | 'Critical Low';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface MultiModalAnalysis {
  hasGenomic: boolean;
  hasProteomic: boolean;
  hasImaging: boolean;
  variants: Variant[];
  clinicalBiomarkers: ClinicalBiomarker[];
  proteomics: { protein: string; foldChange: number; pValue: number; isSignificant: boolean }[];
  predictions: { diseaseName: string; probability: number; ordoId: string; description: string }[];
  shapValues: { feature: string; impact: number; category: string }[];
  diseaseProfile: { name: string; pathway: string[]; treatment: string[]; riskLevel: string; summary: string; explainability: string };
  ehrSummary: string;
}

export interface Log {
  id: string;
  message: string;
  type: 'INFO' | 'EMAIL' | 'ALERT';
  timestamp: string;
}

export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  VIEW_PATIENT = 'VIEW_PATIENT',
  APPROVE_USER = 'APPROVE_USER',
  DENY_USER = 'DENY_USER',
  APPROVE_HOSPITAL = 'APPROVE_HOSPITAL'
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  userRole: UserRole | 'UNKNOWN';
  action: AuditAction;
  status: 'SUCCESS' | 'FAILURE' | 'SUSPICIOUS';
  details: string;
  ipAddress: string;
}

export interface FederatedNode {
  id: string;
  hospitalName: string;
  status: 'Online' | 'Training' | 'Syncing' | 'Offline';
  lastUpdate: string;
  contributionCount: number;
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
  size: string;
  timestamp: string;
}
