
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import { createPatientCase } from '../../services/mockBackend';
import { PatientCase } from '../../types';
import { 
  Upload, FileText, Dna, Image as ImageIcon, TestTube, 
  CheckCircle, AlertCircle, Play, Cpu, Database, ChevronRight, Check
} from 'lucide-react';

type Step = 'INFO' | 'UPLOAD' | 'PIPELINE';

const NewCaseWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // --- State ---
  const [step, setStep] = useState<Step>('INFO');
  
  // Form Data
  const [basicInfo, setBasicInfo] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'Male',
    bloodType: 'Unknown'
  });
  const [symptoms, setSymptoms] = useState('');
  
  // Files
  const [files, setFiles] = useState<{
    genomic: File | null;
    imaging: File | null;
    ehr: File | null;
    biomarker: File | null;
  }>({ genomic: null, imaging: null, ehr: null, biomarker: null });

  // Pipeline State
  const [pipelineStatus, setPipelineStatus] = useState([
    { id: 1, name: 'VCF Integrity Check (QC)', status: 'waiting' }, // waiting, running, done
    { id: 2, name: 'DICOM -> Thumbnail Conversion', status: 'waiting' },
    { id: 3, name: 'BioBERT Tokenization (Clinical Notes)', status: 'waiting' },
    { id: 4, name: 'Biomarker Normalization (Z-Score)', status: 'waiting' },
    { id: 5, name: 'Genosym-AI Inference Trigger', status: 'waiting' },
  ]);
  const [caseId, setCaseId] = useState<string | null>(null);

  // --- Handlers ---
  
  const handleFileChange = (type: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const runPipeline = async () => {
    setStep('PIPELINE');
    
    // Create Case in Backend
    const dataTypes: any[] = [];
    if (files.genomic) dataTypes.push('Genomic');
    if (files.imaging) dataTypes.push('Imaging');
    if (files.ehr) dataTypes.push('EHR');
    if (files.biomarker) dataTypes.push('Biomarker');

    const newCaseData: Partial<PatientCase> = {
      patientName: `${basicInfo.firstName} ${basicInfo.lastName}`,
      age: new Date().getFullYear() - new Date(basicInfo.dob).getFullYear(),
      gender: basicInfo.gender as any,
      bloodType: basicInfo.bloodType,
      symptoms: symptoms.split(',').map(s => s.trim()),
      dataTypes: dataTypes
    };

    const id = await createPatientCase(newCaseData, user?.email || '');
    setCaseId(id);

    // Simulate Pipeline Steps
    for (let i = 0; i < pipelineStatus.length; i++) {
      // Set current running
      setPipelineStatus(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
      
      await new Promise(r => setTimeout(r, 1200)); // Simulate work

      // Set current done
      setPipelineStatus(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'done' } : s));
    }

    // Redirect after small delay
    setTimeout(() => {
      navigate('/doctor/analysis', { state: { caseId: id } });
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto font-sans animate-fade-in pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">New Case Upload Wizard</h1>
        <p className="text-slate-500 mt-2">Ingest multi-modal patient data for Genosym-AI processing.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center mb-8">
        <div className={`flex items-center gap-2 ${step === 'INFO' ? 'text-primary-600 font-bold' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'INFO' ? 'border-primary-600 bg-primary-50' : step === 'UPLOAD' || step === 'PIPELINE' ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-300'}`}>
            {step === 'UPLOAD' || step === 'PIPELINE' ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span>Patient Demographics</span>
        </div>
        <div className="w-12 h-px bg-slate-300 mx-4"></div>
        <div className={`flex items-center gap-2 ${step === 'UPLOAD' ? 'text-primary-600 font-bold' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'UPLOAD' ? 'border-primary-600 bg-primary-50' : step === 'PIPELINE' ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-300'}`}>
             {step === 'PIPELINE' ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <span>Data Ingestion</span>
        </div>
        <div className="w-12 h-px bg-slate-300 mx-4"></div>
        <div className={`flex items-center gap-2 ${step === 'PIPELINE' ? 'text-primary-600 font-bold' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'PIPELINE' ? 'border-primary-600 bg-primary-50' : 'border-slate-300'}`}>3</div>
          <span>AI Pipeline & QC</span>
        </div>
      </div>

      {/* Step 1: Demographics */}
      {step === 'INFO' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Basic Patient Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input 
                value={basicInfo.firstName} 
                onChange={e => setBasicInfo({...basicInfo, firstName: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input 
                value={basicInfo.lastName} 
                onChange={e => setBasicInfo({...basicInfo, lastName: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <input 
                type="date"
                value={basicInfo.dob} 
                onChange={e => setBasicInfo({...basicInfo, dob: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                 <select 
                   value={basicInfo.gender} 
                   onChange={e => setBasicInfo({...basicInfo, gender: e.target.value})}
                   className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-700"
                 >
                   <option>Male</option>
                   <option>Female</option>
                   <option>Other</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Blood Type</label>
                 <select 
                   value={basicInfo.bloodType} 
                   onChange={e => setBasicInfo({...basicInfo, bloodType: e.target.value})}
                   className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-700"
                 >
                   <option>Unknown</option>
                   <option>A+</option>
                   <option>A-</option>
                   <option>B+</option>
                   <option>B-</option>
                   <option>O+</option>
                   <option>O-</option>
                   <option>AB+</option>
                   <option>AB-</option>
                 </select>
               </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Presenting Symptoms (Comma Separated)</label>
              <input 
                value={symptoms} 
                onChange={e => setSymptoms(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                placeholder="e.g. Ataxia, Muscle Weakness, Tremors"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button 
              onClick={() => setStep('UPLOAD')} 
              disabled={!basicInfo.firstName || !basicInfo.lastName || !basicInfo.dob}
              className="px-6 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              Next: Upload Data <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Uploads */}
      {step === 'UPLOAD' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Uploaded files are automatically encrypted before storage. Supported formats: VCF (Genomic), DCM (Imaging), PDF/TXT (EHR), CSV (Biomarker).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Genomic */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-primary-400 transition group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                  <Dna className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">Genomic Data (VCF)</h3>
              </div>
              <div className="relative border-2 border-dashed border-slate-200 rounded-lg h-32 flex flex-col items-center justify-center bg-slate-50 hover:bg-white transition">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange('genomic')} />
                {files.genomic ? (
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">{files.genomic.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Drop VCF file or click</p>
                  </>
                )}
              </div>
            </div>

            {/* Imaging */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-400 transition group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">Imaging (DICOM)</h3>
              </div>
              <div className="relative border-2 border-dashed border-slate-200 rounded-lg h-32 flex flex-col items-center justify-center bg-slate-50 hover:bg-white transition">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange('imaging')} />
                {files.imaging ? (
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">{files.imaging.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Drop DICOM series</p>
                  </>
                )}
              </div>
            </div>

            {/* EHR */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-amber-400 transition group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">EHR / Clinical Notes</h3>
              </div>
              <div className="relative border-2 border-dashed border-slate-200 rounded-lg h-32 flex flex-col items-center justify-center bg-slate-50 hover:bg-white transition">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange('ehr')} />
                {files.ehr ? (
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">{files.ehr.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Upload PDF or TXT</p>
                  </>
                )}
              </div>
            </div>

            {/* Biomarker */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-purple-400 transition group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                  <TestTube className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">Biomarkers / Proteomic</h3>
              </div>
              <div className="relative border-2 border-dashed border-slate-200 rounded-lg h-32 flex flex-col items-center justify-center bg-slate-50 hover:bg-white transition">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange('biomarker')} />
                {files.biomarker ? (
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">{files.biomarker.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Upload CSV</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
             <button 
              onClick={() => setStep('INFO')} 
              className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
            >
              Back
            </button>
            <button 
              onClick={runPipeline}
              disabled={!Object.values(files).some(f => f !== null)}
              className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-600/20 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> Run AI Pipeline
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pipeline */}
      {step === 'PIPELINE' && (
        <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-2xl border border-slate-700">
           <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
             <h2 className="text-xl font-mono font-bold flex items-center gap-3">
               <Cpu className="w-6 h-6 text-green-400" /> 
               Genosym Inference Engine
             </h2>
             <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
               <Database className="w-4 h-4" />
               <span>Session: {caseId || 'INIT...'}</span>
             </div>
           </div>

           <div className="space-y-6">
             {pipelineStatus.map((p) => (
               <div key={p.id} className="flex items-center gap-4">
                 <div className="w-6 flex justify-center">
                   {p.status === 'waiting' && <div className="w-2 h-2 bg-slate-600 rounded-full" />}
                   {p.status === 'running' && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                   {p.status === 'done' && <CheckCircle className="w-5 h-5 text-green-400" />}
                 </div>
                 <div className={`flex-1 font-mono ${p.status === 'waiting' ? 'text-slate-500' : p.status === 'running' ? 'text-blue-300' : 'text-green-300'}`}>
                   {p.name}
                   {p.status === 'running' && <span className="animate-pulse">...</span>}
                 </div>
                 <div className="text-xs font-mono text-slate-500">
                   {p.status === 'done' ? 'COMPLETED' : p.status === 'running' ? 'PROCESSING' : 'QUEUED'}
                 </div>
               </div>
             ))}
           </div>

           {pipelineStatus.every(p => p.status === 'done') && (
             <div className="mt-8 pt-6 border-t border-slate-700 text-center animate-fade-in">
               <p className="text-green-400 font-mono mb-2">All systems go. Redirecting to analysis workspace...</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default NewCaseWizard;
