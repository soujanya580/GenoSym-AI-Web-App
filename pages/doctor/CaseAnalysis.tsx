
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPatientCases, getCaseAnalysisDetails } from '../../services/mockBackend';
import { PatientCase, MultiModalAnalysis, GroundingSource } from '../../types';
import { useAuth } from '../../App';
import { chatWithMedora, generateCaseAnalysis } from '../../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area
} from 'recharts';
import { 
  Dna, Activity, Brain, FileText, Image as ImageIcon, Sparkles, 
  Microscope, X, Send, File, ShieldCheck, Info, Download, ChevronLeft, Globe, Shield, Database, TrendingUp, FileOutput, Map, Clock, Zap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const CaseAnalysis = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [selectedCase, setSelectedCase] = useState<PatientCase | null>(null);
  const [analysisData, setAnalysisData] = useState<MultiModalAnalysis | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [geminiInsights, setGeminiInsights] = useState<{ text: string; sources: GroundingSource[] } | null>(null);
  
  const [activeModes, setActiveModes] = useState({
    genomic: true,
    ehr: true,
    imaging: true,
    proteomic: true
  });

  const [medoraOpen, setMedoraOpen] = useState(false);
  const [medoraHistory, setMedoraHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [medoraInput, setMedoraInput] = useState('');
  const [medoraLoading, setMedoraLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const state = location.state as { caseId?: string };
      if (state?.caseId) {
        const details = getCaseAnalysisDetails(state.caseId);
        const patients = getPatientCases(user.email);
        const patient = patients.find(p => p.id === state.caseId);
        
        setSelectedCase(patient || null);
        setAnalysisData(details);

        generateCaseAnalysis('Genomic', { patient, details }).then(setGeminiInsights);
        
        setMedoraHistory([
          { role: 'model', text: `Diagnostic workspace initialized for **${patient?.patientName}**. Multi-modal fusion suggests a high-probability match for **${details.predictions[0].diseaseName}**.` }
        ]);
      }
    }
  }, [user, location.state]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`Genosym_Report_${selectedCase?.id}.pdf`);
    } finally { setIsExporting(false); }
  };

  const handleExportWord = () => {
    if (!reportRef.current || !selectedCase || !analysisData) return;
    const html = `<html><body style="font-family: sans-serif;"><h1>Medical Diagnostic Report</h1><hr/><p><strong>Patient:</strong> ${selectedCase.patientName}</p><p><strong>Diagnosis:</strong> ${analysisData.predictions[0].diseaseName}</p><hr/><h2>Summary</h2><p>${analysisData.diseaseProfile.summary}</p></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Genosym_Report_${selectedCase.id}.doc`;
    link.click();
  };

  const handleMedoraSend = async () => {
    if (!medoraInput.trim()) return;
    const msg = medoraInput;
    setMedoraInput('');
    setMedoraHistory(prev => [...prev, { role: 'user', text: msg }]);
    setMedoraLoading(true);
    const context = `Patient: ${selectedCase?.patientName}, Diagnosis: ${analysisData?.predictions[0].diseaseName}`;
    const res = await chatWithMedora(medoraHistory, msg, 'medical', context);
    setMedoraHistory(prev => [...prev, { role: 'model', text: res.text }]);
    setMedoraLoading(false);
  };

  // Simulated Disease-Specific Data
  const getEHRHeatmap = () => {
    const disease = analysisData?.predictions[0].diseaseName;
    if (disease === 'Wilson Disease') return [{ time: 'Month 1', tremor: 2, jaundice: 1, fatigue: 4 }, { time: 'Month 3', tremor: 5, jaundice: 3, fatigue: 6 }, { time: 'Current', tremor: 8, jaundice: 7, fatigue: 9 }];
    if (disease === 'Cystic Fibrosis') return [{ time: 'Month 1', cough: 4, sputum: 3, dyspnea: 2 }, { time: 'Month 3', cough: 6, sputum: 5, dyspnea: 5 }, { time: 'Current', cough: 9, sputum: 8, dyspnea: 8 }];
    return [{ time: 'Month 1', symptom: 2 }, { time: 'Month 3', symptom: 5 }, { time: 'Current', symptom: 8 }];
  };

  if (!selectedCase || !analysisData) return <div className="p-20 text-center animate-pulse"><Microscope className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-black uppercase tracking-widest text-xs">Calibrating Diagnostic Fusion...</p></div>;

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#FDFDFF] font-sans">
      <div className="w-full lg:w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 flex flex-col gap-8 no-print shadow-xl z-10">
        <div className="flex items-center gap-3 mb-2">
           <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="p-2 bg-primary-600 rounded-lg shadow-lg"><Sparkles className="w-5 h-5 text-white" /></div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Fusion Controls</h2>
        </div>

        <div className="space-y-3">
          {[
            { id: 'genomic', label: 'Genomic VCF', icon: <Dna className="w-4 h-4" /> },
            { id: 'ehr', label: 'Clinical NLP', icon: <FileText className="w-4 h-4" /> },
            { id: 'imaging', label: 'Radiology Mask', icon: <ImageIcon className="w-4 h-4" /> },
            { id: 'proteomic', label: 'Proteomic CSV', icon: <Activity className="w-4 h-4" /> }
          ].map(mode => (
            <button key={mode.id} onClick={() => setActiveModes(prev => ({ ...prev, [mode.id]: !prev[mode.id as keyof typeof activeModes] }))} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${activeModes[mode.id as keyof typeof activeModes] ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-md' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}>
              <div className="flex items-center gap-3">{mode.icon}<span className="text-xs font-black uppercase tracking-tight">{mode.label}</span></div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${activeModes[mode.id as keyof typeof activeModes] ? 'bg-primary-600' : 'bg-slate-200'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${activeModes[mode.id as keyof typeof activeModes] ? 'left-4' : 'left-1'}`} /></div>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t space-y-3">
          <button onClick={handleExportPDF} disabled={isExporting} className="w-full p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition disabled:opacity-50"><Download className="w-4 h-4 text-emerald-400" /><span className="text-xs font-black uppercase tracking-widest">{isExporting ? 'Generating...' : 'Export PDF'}</span></button>
          <button onClick={handleExportWord} className="w-full p-4 bg-white border border-slate-200 text-slate-900 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition"><FileOutput className="w-4 h-4 text-primary-600" /><span className="text-xs font-black uppercase tracking-widest">Export Word</span></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-10 space-y-10 bg-white" ref={reportRef}>
        {/* Patient Hero */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-10 items-center">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center text-white font-black text-4xl shadow-xl">{selectedCase.patientName.charAt(0)}</div>
            <div>
              <div className="flex items-center gap-3 mb-1"><h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedCase.patientName}</h1><ShieldCheck className="w-6 h-6 text-emerald-500" /></div>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">ID: {selectedCase.id} • {analysisData.predictions[0].diseaseName}</p>
            </div>
          </div>
          <div className="text-right border-l-4 border-primary-600 pl-8"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Confidence Level</p><p className="text-5xl font-black text-emerald-600 tracking-tighter">{(analysisData.predictions[0].probability * 100).toFixed(0)}%</p></div>
        </div>

        {/* 1. Genomic Visualization (Variant Allele Frequency) */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 transition-all ${activeModes.genomic ? 'opacity-100' : 'opacity-20 grayscale'}`}>
           <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 text-primary-50 opacity-20 group-hover:scale-110 transition"><Dna className="w-32 h-32" /></div>
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-4 uppercase tracking-tighter"><div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-inner"><Database className="w-6 h-6" /></div> Genomic Variant Load</h3>
              <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { gene: analysisData.variants[0].gene, vaf: 0.98, type: 'Targeted' },
                      { gene: 'BRCA1', vaf: 0.02, type: 'Control' },
                      { gene: 'TP53', vaf: 0.05, type: 'Control' },
                      { gene: 'GAPDH', vaf: 0.12, type: 'Control' }
                    ]}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="gene" fontSize={10} fontWeight="black" stroke="#64748b" />
                       <YAxis hide />
                       <Tooltip cursor={{fill: '#f8fafc'}} />
                       <Bar dataKey="vaf" radius={[10, 10, 0, 0]} barSize={40}>
                          <Cell fill="#2563eb" />
                          <Cell fill="#e2e8f0" />
                          <Cell fill="#e2e8f0" />
                          <Cell fill="#e2e8f0" />
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
              <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Variant Allele Frequency (VAF) across Diagnostic Panel</p>
           </div>

           {/* 2. Proteomic Visualization (Pathway Dysregulation) */}
           <div className={`bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm relative transition-all ${activeModes.proteomic ? 'opacity-100' : 'opacity-20 grayscale'}`}>
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-4 uppercase tracking-tighter"><div className="p-3 bg-teal-50 rounded-2xl text-teal-600 shadow-inner"><Activity className="w-6 h-6" /></div> Proteomic Pathway Radar</h3>
              <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                      { subject: 'Metabolism', A: 120, full: 150 },
                      { subject: 'Signalling', A: 98, full: 150 },
                      { subject: 'Transport', A: 145, full: 150 },
                      { subject: 'Response', A: 85, full: 150 },
                      { subject: 'Regulation', A: 65, full: 150 }
                    ]}>
                       <PolarGrid stroke="#e2e8f0" />
                       <PolarAngleAxis dataKey="subject" fontSize={10} fontWeight="black" stroke="#64748b" />
                       <Radar name="Activity" dataKey="A" stroke="#0d9488" fill="#0d9488" fillOpacity={0.4} strokeWidth={4} />
                    </RadarChart>
                 </ResponsiveContainer>
              </div>
              <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Active Pathway Signal Intensity</p>
           </div>
        </div>

        {/* 3. EHR Visualization (Temporal Symptom Intensity Heatmap) */}
        <div className={`bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm transition-all ${activeModes.ehr ? 'opacity-100' : 'opacity-20 grayscale'}`}>
           <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-4 uppercase tracking-tighter"><div className="p-3 bg-amber-50 rounded-2xl text-amber-600 shadow-inner"><Clock className="w-6 h-6" /></div> Clinical Trajectory Heatmap</h3>
           <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={getEHRHeatmap()}>
                    <defs>
                      <linearGradient id="colorSymptom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" fontSize={10} fontWeight="black" stroke="#64748b" />
                    <YAxis domain={[0, 10]} hide />
                    <Tooltip />
                    {Object.keys(getEHRHeatmap()[0]).filter(k => k !== 'time').map((key, i) => (
                      <Area key={key} type="monotone" dataKey={key} stroke={i === 0 ? '#f59e0b' : i === 1 ? '#ef4444' : '#6366f1'} fillOpacity={1} fill="url(#colorSymptom)" strokeWidth={4} />
                    ))}
                 </AreaChart>
              </ResponsiveContainer>
           </div>
           <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Intensity Score of Clinical Markers over 6-Month Period</p>
        </div>

        {/* 4. Imaging Visualization (Simulated ROI Overlay) */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch transition-all ${activeModes.imaging ? 'opacity-100' : 'opacity-20 grayscale'}`}>
           <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[3.5rem] relative overflow-hidden flex items-center justify-center min-h-[400px]">
              <div className="absolute top-8 left-10 flex items-center gap-3"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" /><span className="text-[10px] font-black text-white uppercase tracking-widest">AI Segmentation Active</span></div>
              
              {/* Simulated Anatomical Model with Highlighted Regions */}
              <div className="relative w-64 h-64 border-4 border-white/10 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-3xl group">
                 <div className="w-48 h-48 border-2 border-white/20 rounded-full animate-[spin_10s_linear_infinite]" />
                 <div className="absolute w-12 h-12 bg-primary-500/40 blur-xl rounded-full animate-ping" />
                 
                 {/* ROI Pins */}
                 <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-primary-400 rounded-full shadow-[0_0_20px_#3b82f6] group-hover:scale-150 transition cursor-help">
                    <div className="absolute -top-10 -left-12 bg-white text-slate-900 px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition shadow-xl">PATHOLOGICAL VOXEL</div>
                 </div>
                 <div className="absolute bottom-1/3 left-1/4 w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_15px_#f59e0b] opacity-60" />
              </div>

              <div className="absolute bottom-8 right-10 text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inference Mode</p><p className="text-sm font-black text-white italic tracking-tight">Voxel-wise segmentation complete</p></div>
           </div>

           <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 flex flex-col justify-center">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Map className="w-4 h-4" /> Radiological Findings</h4>
              <div className="space-y-6">
                 <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observation</p><p className="text-xs font-bold text-slate-700 leading-relaxed">Hyperechoic density observed in targeted ROI consistent with lipid accumulation.</p></div>
                 <div className="p-5 bg-primary-50 border border-primary-100 rounded-2xl"><p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1">Fusion Inference</p><p className="text-xs font-bold text-primary-900 leading-relaxed">High correlation between imaging ROI and Genomic allele frequency (p &lt; 0.05).</p></div>
              </div>
           </div>
        </div>

        {/* Diagnostic Grounding */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px]" />
           <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
              <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center shrink-0 shadow-inner border border-white/20"><Brain className="w-10 h-10 text-primary-300" /></div>
              <div className="flex-1">
                 <h3 className="text-xl font-black tracking-tight uppercase italic flex items-center gap-3">Explainable AI Insight <Zap className="w-5 h-5 text-amber-400 fill-amber-400" /></h3>
                 <div className="prose prose-invert max-w-none text-slate-200 font-medium leading-relaxed mt-4">
                    {geminiInsights ? <ReactMarkdown>{geminiInsights.text}</ReactMarkdown> : <div className="flex items-center gap-3 animate-pulse"><div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" /><span className="text-[10px] font-black uppercase text-primary-400">Syncing multi-modal weights...</span></div>}
                 </div>
              </div>
           </div>
        </div>
      </div>

      <button onClick={() => setMedoraOpen(!medoraOpen)} className="fixed bottom-10 right-10 w-20 h-20 bg-gradient-to-br from-primary-600 to-indigo-800 rounded-[2.5rem] shadow-2xl flex items-center justify-center text-white hover:scale-110 hover:rotate-3 transition-all active:scale-95 no-print z-[100]"><Sparkles className="w-10 h-10" /></button>

      {medoraOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[32rem] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[110] border-l border-slate-200 flex flex-col animate-slide-in no-print">
           <div className="p-10 bg-slate-950 text-white flex justify-between items-center"><div className="flex items-center gap-5"><div className="p-3 bg-primary-600 rounded-[1.2rem] shadow-xl"><Sparkles className="w-7 h-7 text-white" /></div><div><h3 className="font-black tracking-tight text-2xl uppercase italic">Medora AI</h3><p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Grounding Console</p></div></div><button onClick={() => setMedoraOpen(false)}><X className="w-8 h-8" /></button></div>
           <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#F8FAFC]">
             {medoraHistory.map((h, i) => (
               <div key={i} className={`flex ${h.role === 'model' ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[90%] p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm border ${h.role === 'model' ? 'bg-white text-slate-800 border-slate-200' : 'bg-primary-600 text-white border-primary-700'}`}><ReactMarkdown>{h.text}</ReactMarkdown></div></div>
             ))}
             {medoraLoading && <div className="flex justify-start"><div className="p-6 bg-white border border-slate-200 rounded-[2rem] flex gap-2"><div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100" /><div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200" /></div></div>}
           </div>
           <div className="p-8 bg-white border-t border-slate-100"><div className="flex gap-4"><input value={medoraInput} onChange={e => setMedoraInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMedoraSend()} placeholder="Analyze diagnostic visualisations..." className="flex-1 p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-black text-slate-900 focus:bg-white transition" /><button onClick={handleMedoraSend} className="p-5 bg-primary-600 text-white rounded-3xl shadow-xl"><Send className="w-7 h-7" /></button></div></div>
        </div>
      )}
    </div>
  );
};

export default CaseAnalysis;
