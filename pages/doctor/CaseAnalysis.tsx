
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPatientCases, getCaseAnalysisDetails } from '../../services/mockBackend';
import { PatientCase, AnalysisType, MultiModalAnalysis } from '../../types';
import { useAuth } from '../../App';
import { chatWithMedora } from '../../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ScatterChart, Scatter, ZAxis, ReferenceLine, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Dna, Activity, Brain, FileText, Image as ImageIcon, Share2, Sparkles, 
  TestTube, Microscope, Download, MessageSquare, X, CheckCircle, Info, AlertTriangle
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
  
  // Medora Chat State
  const [medoraOpen, setMedoraOpen] = useState(false);
  const [medoraHistory, setMedoraHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [medoraInput, setMedoraInput] = useState('');
  const [medoraLoading, setMedoraLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const loadedCases = getPatientCases(user.email);
      const state = location.state as { caseId?: string };
      if (state?.caseId) {
        const preSelected = loadedCases.find(c => c.id === state.caseId);
        if (preSelected) {
          setSelectedCase(preSelected);
          // Load Dynamic Analysis Data based on Patient ID
          const details = getCaseAnalysisDetails(preSelected.id);
          setAnalysisData(details);
          
          // Initial Medora Context
          const initialContext = `Patient: ${preSelected.patientName}. 
          Predicted Condition: ${details.predictions[0].diseaseName}. 
          Risk Level: ${details.diseaseProfile.riskLevel}.
          Biomarkers: ${details.clinicalBiomarkers.map(b => b.name + ': ' + b.status).join(', ')}.
          SHAP Features: ${details.shapValues.map(s => s.feature).join(', ')}.`;
          
          setMedoraHistory([{ role: 'user', text: initialContext }, { role: 'model', text: `I have analyzed the multi-modal data for ${preSelected.patientName}. The evidence strongly suggests **${details.predictions[0].diseaseName}**. I can help interpret the genomic variants, biomarker deviations, or SHAP explanations.`}]);
        }
      }
    }
  }, [user, location.state]);

  const handleExportReport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        ignoreElements: (element) => element.classList.contains('no-print')
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Genosym_Report_${selectedCase?.id}.pdf`);
    } catch (error) {
      alert("Failed to generate PDF report.");
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
    const response = await chatWithMedora(medoraHistory, msg);
    setMedoraHistory(prev => [...prev, { role: 'model', text: response }]);
    setMedoraLoading(false);
  };

  if (!selectedCase || !analysisData) {
    return <div className="p-12 text-center text-gray-500">Loading case analysis...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden bg-gray-50 font-sans">
      {/* Main Dashboard Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
        
        <div ref={reportRef} className="space-y-6">
          {/* Patient Summary Header */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{selectedCase.patientName}</h1>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full uppercase tracking-wider">
                  {analysisData.diseaseProfile.name || 'Analyzing'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">ID: {selectedCase.id} | {selectedCase.age}y | {selectedCase.gender} | Status: {selectedCase.diagnosisStatus}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {selectedCase.symptoms.map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{s}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 no-print">
              <div className="flex gap-3">
                <button onClick={() => setMedoraOpen(!medoraOpen)} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium shadow-lg hover:bg-purple-700 flex items-center gap-2 transition">
                  <Sparkles className="w-4 h-4" /> Medora AI
                </button>
                <button onClick={handleExportReport} disabled={isExporting} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 transition disabled:opacity-50">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
              <p className="text-xs text-red-500 font-bold mt-2">Risk Level: {analysisData.diseaseProfile.riskLevel}</p>
            </div>
          </div>

          {/* Grid Layout - Dynamic based on Data */}
          <div className="grid grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: Clinical Data */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              
              {/* Genomic Panel (Conditional) */}
              {analysisData.hasGenomic ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Dna className="w-5 h-5 text-blue-500" /> Genomic Variants
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">VCF Processed</span>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                          <th className="px-4 py-2">Gene</th>
                          <th className="px-4 py-2">Mutation</th>
                          <th className="px-4 py-2">Zygosity</th>
                          <th className="px-4 py-2">Phenotype (ORDO)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analysisData.variants.map((v, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-blue-600 font-bold">{v.gene}</td>
                            <td className="px-4 py-3">{v.mutation}</td>
                            <td className="px-4 py-3 text-slate-500">{v.zygosity}</td>
                            <td className="px-4 py-3 text-slate-700 font-medium">{v.associatedPhenotype}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 border-dashed text-center text-slate-400">
                  <Dna className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No Genomic Data Uploaded</p>
                </div>
              )}

              {/* Proteomic / Biomarker Panel (Dynamic Chart) */}
              {analysisData.hasProteomic ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <TestTube className="w-5 h-5 text-purple-500" /> Biomarker Analysis
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* If specific clinical biomarkers exist (Wilson/Fabry etc), show Bar Chart comparing to Reference */}
                    {analysisData.clinicalBiomarkers.length > 0 ? (
                      <div className="space-y-4">
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={analysisData.clinicalBiomarkers} 
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                              <Tooltip 
                                content={({ payload, label }) => {
                                  if (payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-white p-2 border border-slate-200 shadow-lg rounded text-xs">
                                        <p className="font-bold">{label}</p>
                                        <p>Value: {data.value} {data.unit}</p>
                                        <p>Ref: {data.referenceRange}</p>
                                        <p className={`font-bold ${data.status.includes('Critical') ? 'text-red-600' : 'text-amber-600'}`}>{data.status}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                {analysisData.clinicalBiomarkers.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.status.includes('Critical') ? '#ef4444' : entry.status === 'Normal' ? '#10b981' : '#f59e0b'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                          {analysisData.clinicalBiomarkers.map((b, i) => (
                            <div key={i} className="bg-slate-50 p-3 rounded border border-slate-100">
                              <p className="text-xs text-slate-500">{b.name}</p>
                              <p className="font-bold text-slate-800 text-lg">{b.value} <span className="text-xs font-normal text-slate-400">{b.unit}</span></p>
                              <p className={`text-xs font-bold ${b.status.includes('Critical') ? 'text-red-500' : 'text-amber-500'}`}>{b.status}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Fallback for General Proteomics: Volcano Plot */
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="foldChange" name="Log2 Fold Change" />
                            <YAxis type="number" dataKey="pValue" name="-Log10 P-value" reversed />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <ReferenceLine y={0.05} stroke="red" strokeDasharray="3 3" label="P=0.05" />
                            <Scatter name="Proteins" data={analysisData.proteomics} fill="#8884d8">
                              {analysisData.proteomics.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.isSignificant ? '#ef4444' : '#cbd5e1'} />
                              ))}
                            </Scatter>
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 border-dashed text-center text-slate-400">
                  <TestTube className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No Biomarker/Proteomic Data</p>
                </div>
              )}

              {/* EHR NLP Panel */}
              {analysisData.ehrSummary && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-800 font-bold">
                    <FileText className="w-5 h-5 text-amber-500" /> EHR Extraction (BioBERT)
                  </div>
                  <div className="p-4 text-sm text-slate-700 leading-relaxed font-mono bg-amber-50/30">
                    {analysisData.ehrSummary}
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: AI & Insights */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              
              {/* Disease Prediction */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-800 font-bold">
                  <Brain className="w-5 h-5 text-emerald-500" /> AI Diagnosis Prediction
                </div>
                <div className="p-5">
                  {analysisData.predictions.map((pred, idx) => (
                    <div key={idx} className="mb-6 last:mb-0">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{pred.diseaseName}</h3>
                          <p className="text-xs text-slate-500 font-mono">{pred.ordoId}</p>
                        </div>
                        <span className="text-2xl font-bold text-emerald-600">{(pred.probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                        <div 
                          className={`h-3 rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-slate-400'}`} 
                          style={{ width: `${pred.probability * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
                        {pred.description}
                      </p>
                    </div>
                  ))}
                  
                  {/* Pathway & Treatment - Disease Specific */}
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Affected Pathways</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysisData.diseaseProfile.pathway.map(p => (
                          <span key={p} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Treatment Options</h4>
                      <ul className="text-xs text-slate-600 list-disc pl-3 space-y-1">
                        {analysisData.diseaseProfile.treatment.map(t => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Knowledge Graph */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-800 font-bold">
                  <Share2 className="w-5 h-5 text-indigo-500" /> Disease Knowledge Graph
                </div>
                <div className="p-4 h-64 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                  <svg width="100%" height="100%" viewBox="0 0 800 300" className="w-full h-full">
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="22" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                      </marker>
                    </defs>
                    {/* Links */}
                    {analysisData.knowledgeGraph.links.map((link, i) => {
                      const source = analysisData.knowledgeGraph.nodes.find(n => n.id === link.source);
                      const target = analysisData.knowledgeGraph.nodes.find(n => n.id === link.target);
                      if (!source || !target) return null;
                      return <line key={i} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arrowhead)" />;
                    })}
                    {/* Nodes */}
                    {analysisData.knowledgeGraph.nodes.map((node, i) => (
                      <g key={i} className="cursor-pointer hover:opacity-80 transition">
                        <circle 
                          cx={node.x} 
                          cy={node.y} 
                          r={node.type === 'Disease' ? 20 : 14} 
                          fill={
                            node.type === 'Gene' ? '#3b82f6' : 
                            node.type === 'Biomarker' ? '#a855f7' :
                            node.type === 'Disease' ? '#ef4444' : '#10b981'
                          } 
                          className="shadow-sm"
                        />
                        <text x={node.x} y={node.y + (node.type === 'Disease' ? 35 : 28)} textAnchor="middle" className="text-[10px] font-bold fill-slate-700">
                          {node.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* SHAP Explainability */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-800 font-bold">
                  <Microscope className="w-5 h-5 text-orange-500" /> SHAP Feature Importance
                </div>
                <div className="p-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={analysisData.shapValues} margin={{ left: 40, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="feature" type="category" width={110} tick={{fontSize: 10, fontWeight: 'bold', fill: '#475569'}} />
                      <Tooltip cursor={{fill: '#f1f5f9'}} />
                      <Bar dataKey="impact" fill="#f97316" radius={[0, 4, 4, 0]} barSize={18}>
                        {analysisData.shapValues.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.category === 'Genomic' ? '#3b82f6' : entry.category === 'Biomarker' ? '#a855f7' : '#f97316'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div>Genomic</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500 rounded-full"></div>Biomarker</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500 rounded-full"></div>Clinical</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Medora Side Panel */}
      <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 border-l border-slate-200 flex flex-col z-50 ${medoraOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm">Medora-AI</h3>
              <p className="text-[10px] text-purple-200">Disease-Specific Explainer</p>
            </div>
          </div>
          <button onClick={() => setMedoraOpen(false)} className="hover:bg-white/20 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scroll">
          {medoraHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-3 rounded-xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
          {medoraLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-3 rounded-xl rounded-bl-none text-slate-500 text-xs flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2">
            <input 
              value={medoraInput}
              onChange={(e) => setMedoraInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMedoraSend()}
              placeholder={`Ask about ${analysisData.diseaseProfile.name}...`}
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50 text-slate-900"
            />
            <button onClick={handleMedoraSend} disabled={!medoraInput.trim()} className="p-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseAnalysis;
