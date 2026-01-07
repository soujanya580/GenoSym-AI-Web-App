
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPatientCases, getCaseAnalysisDetails } from '../../services/mockBackend';
import { PatientCase, MultiModalAnalysis } from '../../types';
import { useAuth } from '../../App';
import { chatWithMedora } from '../../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { 
  Dna, Activity, Brain, FileText, Image as ImageIcon, Sparkles, 
  Microscope, X, Send, File, ShieldCheck, Info
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
        
        setMedoraHistory([
          { role: 'model', text: `Diagnostic workspace initialized for **${patient?.patientName}**. Multi-modal fusion suggests a high-probability match for **${details.predictions[0].diseaseName}**. I have analyzed the ATP7B pathway and correlated it with the low ceruloplasmin findings. How can I assist in your clinical review?` }
        ]);
      }
    }
  }, [user, location.state]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`GenoSym_Diagnostic_Report_${selectedCase?.id}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMedoraSend = async () => {
    if (!medoraInput.trim()) return;
    const msg = medoraInput;
    setMedoraInput('');
    setMedoraHistory(prev => [...prev, { role: 'user', text: msg }]);
    setMedoraLoading(true);
    
    // Contextualizing Medora with the actual diagnostic data
    const context = `Patient: ${selectedCase?.patientName}, Diagnosis: ${analysisData?.predictions[0].diseaseName}, Explainability: ${analysisData?.diseaseProfile.explainability}`;
    const res = await chatWithMedora(medoraHistory, msg, 'medical', context);
    
    setMedoraHistory(prev => [...prev, { role: 'model', text: res || 'Consultation error encountered.' }]);
    setMedoraLoading(false);
  };

  if (!selectedCase || !analysisData) return (
    <div className="flex items-center justify-center h-full p-20">
      <div className="text-center animate-pulse">
        <Microscope className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Diagnostic Workspace...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#FDFDFF] font-sans">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 flex flex-col gap-8 no-print shadow-xl z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary-600 rounded-lg shadow-lg shadow-primary-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Medora Core</h2>
        </div>

        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Fusion Toggles</h2>
          <div className="space-y-3">
            {[
              { id: 'genomic', label: 'Genomic VCF', icon: <Dna className="w-4 h-4" /> },
              { id: 'ehr', label: 'Clinical NLP', icon: <FileText className="w-4 h-4" /> },
              { id: 'imaging', label: 'Radiology Mask', icon: <ImageIcon className="w-4 h-4" /> },
              { id: 'proteomic', label: 'Proteomic CSV', icon: <Activity className="w-4 h-4" /> }
            ].map(mode => (
              <button 
                key={mode.id}
                onClick={() => setActiveModes(prev => ({ ...prev, [mode.id]: !prev[mode.id as keyof typeof activeModes] }))}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${activeModes[mode.id as keyof typeof activeModes] ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-md translate-x-1' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}
              >
                <div className="flex items-center gap-3">
                  {mode.icon}
                  <span className="text-xs font-black uppercase tracking-tight">{mode.label}</span>
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${activeModes[mode.id as keyof typeof activeModes] ? 'bg-primary-600' : 'bg-slate-200'}`}>
                   <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${activeModes[mode.id as keyof typeof activeModes] ? 'left-4' : 'left-1'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t">
          <button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="w-full p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition shadow-xl active:scale-95 disabled:opacity-50"
          >
             {isExporting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <File className="w-4 h-4 text-primary-400" />}
             <span className="text-xs font-black uppercase tracking-widest">Generate Report</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scroll p-10 space-y-10" ref={reportRef}>
        {/* Header Summary */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-10 items-center">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-50 to-indigo-50 border border-primary-100 rounded-[2rem] flex items-center justify-center text-primary-700 font-black text-4xl shadow-inner">
              {selectedCase.patientName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedCase.patientName}</h1>
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Patient ID: {selectedCase.id} • {selectedCase.age}y • {selectedCase.gender}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedCase.symptoms.map(s => <span key={s} className="px-4 py-1.5 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-500 border border-slate-100">{s}</span>)}
              </div>
            </div>
          </div>
          <div className="text-center md:text-right border-l-4 border-primary-600 pl-8 h-full flex flex-col justify-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Primary AI Inference</p>
             <p className="text-3xl font-black text-primary-950 tracking-tighter mb-1">{analysisData.predictions[0].diseaseName}</p>
             <p className="text-5xl font-black text-emerald-600 tracking-tighter tabular-nums">
               {(analysisData.predictions[0].probability * 100).toFixed(0)}% 
               <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-2">Confidence</span>
             </p>
          </div>
        </div>

        {/* Explainability Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
           {/* SHAP Visualization */}
           <div className={`bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm transition-all duration-500 ${activeModes.genomic ? 'opacity-100 scale-100' : 'opacity-20 grayscale scale-95 pointer-events-none'}`}>
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Dna className="w-6 h-6" /></div>
                  Explainable AI (SHAP)
                </h3>
                <div className="px-4 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-full tracking-widest">Genomic Impact</div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart layout="vertical" data={analysisData.shapValues.sort((a,b) => b.impact - a.impact)} margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 1]} hide />
                      <YAxis dataKey="feature" type="category" fontSize={11} fontWeight="black" width={100} stroke="#475569" />
                      <Tooltip cursor={{fill: '#f8fafc'}} />
                      <Bar dataKey="impact" radius={[0, 10, 10, 0]} barSize={24}>
                         {analysisData.shapValues.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.impact > 0.7 ? '#2563eb' : entry.impact > 0.5 ? '#60a5fa' : '#94a3b8'} />
                         ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-10 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-600"></div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Info className="w-3 h-3" /> Clinical Reasoning Summary
                </h4>
                <p className="text-sm text-slate-700 font-bold leading-relaxed italic">
                  "{analysisData.diseaseProfile.explainability}"
                </p>
              </div>
           </div>

           {/* Radar / Proteomic Visualization */}
           <div className={`bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm transition-all duration-500 ${activeModes.proteomic ? 'opacity-100 scale-100' : 'opacity-20 grayscale scale-95 pointer-events-none'}`}>
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                  <div className="p-3 bg-teal-50 rounded-2xl text-teal-600"><Activity className="w-6 h-6" /></div>
                  Proteomic Synthesis
                </h3>
                <div className="px-4 py-1.5 bg-teal-50 text-teal-700 text-[10px] font-black uppercase rounded-full tracking-widest">Serum Profile</div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysisData.clinicalBiomarkers}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="name" fontSize={10} fontWeight="black" stroke="#64748b" />
                      <Radar name="Level" dataKey="value" stroke="#0d9488" fill="#0d9488" fillOpacity={0.4} strokeWidth={4} />
                      <Tooltip />
                   </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-10 space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Microscope className="w-3 h-3" /> Pathological Context</h4>
                 <div className="bg-teal-50/50 p-8 rounded-[2rem] border border-teal-100 font-bold text-slate-800 text-sm leading-relaxed">
                   {analysisData.diseaseProfile.summary}
                 </div>
              </div>
           </div>
        </div>

        {/* Actionable Protocol */}
        <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
           <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
             <h3 className="font-black text-slate-900 uppercase text-xs tracking-[0.2em]">Validated Diagnostic Protocol</h3>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
               <ShieldCheck className="w-4 h-4 text-emerald-500" /> Orphanet ORDO: {analysisData.predictions[0].ordoId}
             </div>
           </div>
           <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatment Domain</th>
                  <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Proposed Intervention</th>
                  <th className="px-12 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysisData.diseaseProfile.treatment.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-12 py-8 text-xs font-black text-slate-400 uppercase tracking-tighter">
                      {idx === 0 ? 'Primary Therapy' : idx === 1 ? 'Secondary Support' : 'Tertiary Path'}
                    </td>
                    <td className="px-12 py-8 text-base font-black text-slate-900">{t}</td>
                    <td className="px-12 py-8 text-right">
                      <span className={`px-5 py-2 text-[10px] font-black rounded-2xl uppercase tracking-tighter shadow-sm border ${idx === 0 ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                        {idx === 0 ? 'GOLD_STANDARD' : 'SUPPORTIVE_CARE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      </div>

      {/* Floating Medora AI Trigger */}
      <button 
        onClick={() => setMedoraOpen(!medoraOpen)} 
        className="fixed bottom-10 right-10 w-20 h-20 bg-gradient-to-br from-primary-600 to-indigo-800 rounded-[2rem] shadow-2xl flex items-center justify-center text-white hover:scale-110 hover:rotate-3 transition-all active:scale-95 no-print z-[100] group"
      >
        <Sparkles className="w-10 h-10 group-hover:animate-pulse" />
      </button>

      {/* Medora Console Overlay */}
      {medoraOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[32rem] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[110] border-l border-slate-200 flex flex-col animate-slide-in no-print">
           <div className="p-10 bg-slate-950 text-white flex justify-between items-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-10">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-500 rounded-full blur-3xl"></div>
             </div>
             <div className="flex items-center gap-5 relative z-10">
                <div className="p-3 bg-primary-600 rounded-[1.2rem] shadow-lg shadow-primary-500/30"><Sparkles className="w-7 h-7 text-white" /></div>
                <div>
                  <h3 className="font-black tracking-tight text-2xl uppercase italic">Medora.AI</h3>
                  <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em]">Synaptic Consulting</p>
                </div>
             </div>
             <button onClick={() => setMedoraOpen(false)} className="hover:bg-white/10 p-3 rounded-2xl transition-colors relative z-10"><X className="w-8 h-8" /></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scroll bg-[#F8FAFC]">
             {medoraHistory.map((h, i) => (
               <div key={i} className={`flex ${h.role === 'model' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[90%] p-6 rounded-[2rem] text-[15px] font-medium leading-relaxed shadow-sm border ${h.role === 'model' ? 'bg-white text-slate-800 border-slate-200 rounded-bl-none' : 'bg-primary-600 text-white border-primary-700 rounded-br-none'}`}>
                    <ReactMarkdown>{h.text}</ReactMarkdown>
                  </div>
               </div>
             ))}
             {medoraLoading && (
                <div className="flex justify-start">
                  <div className="p-6 bg-white border border-slate-200 rounded-[2rem] rounded-bl-none flex gap-2">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
             )}
           </div>

           <div className="p-8 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
             <div className="flex gap-4">
                <input 
                  value={medoraInput} 
                  onChange={e => setMedoraInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleMedoraSend()}
                  placeholder="Explain the ATP7B variant significance..." 
                  className="flex-1 p-5 bg-slate-50 border border-slate-200 rounded-3xl text-base outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white transition-all font-bold text-slate-900"
                />
                <button 
                  onClick={handleMedoraSend} 
                  disabled={!medoraInput.trim() || medoraLoading}
                  className="p-5 bg-primary-600 text-white rounded-3xl hover:bg-primary-700 transition shadow-xl shadow-primary-600/20 disabled:opacity-50 active:scale-95"
                >
                  <Send className="w-7 h-7" />
                </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CaseAnalysis;
