
import React, { useState, useRef, useEffect } from 'react';
import { chatWithMedora, synthesizeSpeech, playAudioBuffer } from '../../services/geminiService';
import { getPatientCases, getCaseAnalysisDetails } from '../../services/mockBackend';
import { PatientCase } from '../../types';
import { useAuth } from '../../App';
import { Brain, Volume2, Send, User, Activity, Sparkles, GraduationCap, Microscope, Dna } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const MedoraAI = () => {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [patients, setPatients] = useState<PatientCase[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [complexity, setComplexity] = useState<'simple' | 'medical'>('medical');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) setPatients(getPatientCases(user.email));
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSend = async (override?: string) => {
    const text = override || input;
    if (!text.trim() || loading) return;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    const context = selectedId ? JSON.stringify(getCaseAnalysisDetails(selectedId)) : undefined;
    const response = await chatWithMedora(chatHistory, text, complexity, context);
    setChatHistory(prev => [...prev, { role: 'model', text: response || "Consultation error." }]);
    setLoading(false);
  };

  const speak = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    const buffer = await synthesizeSpeech(text.replace(/[*#_\[\]]/g, ''));
    if (buffer) {
      playAudioBuffer(buffer);
      setTimeout(() => setIsSpeaking(false), buffer.duration * 1000);
    } else setIsSpeaking(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)] animate-fade-in font-sans">
      <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto custom-scroll pr-2">
        <div className="bg-gradient-to-br from-indigo-950 to-purple-950 p-8 rounded-[2.5rem] text-white shadow-xl">
           <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><Sparkles className="w-8 h-8 text-purple-300" /></div>
              <div><h2 className="text-xl font-black tracking-tight">Medora AI</h2><p className="text-[10px] font-black uppercase text-purple-300 tracking-widest">Diagnostic Assistant</p></div>
           </div>
           <p className="text-sm font-medium text-purple-100 opacity-80 leading-relaxed">I am trained on the Orphanet ontology to assist in identifying rare pathologies.</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-4 h-4" /> Patient Context</h3>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-primary-500">
             <option value="">General Knowledge</option>
             {patients.map(p => <option key={p.id} value={p.id}>{p.patientName} ({p.id})</option>)}
          </select>
          {selectedId && <div className="p-4 bg-blue-50 text-blue-800 rounded-2xl text-[10px] font-black uppercase leading-tight tracking-tighter">Case Metadata Loaded.</div>}
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Explanation Density</h3>
           <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button onClick={() => setComplexity('simple')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition ${complexity === 'simple' ? 'bg-white text-primary-700 shadow-sm scale-105' : 'text-slate-400'}`}>Simple</button>
              <button onClick={() => setComplexity('medical')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition ${complexity === 'medical' ? 'bg-white text-purple-700 shadow-sm scale-105' : 'text-slate-400'}`}>Medical</button>
           </div>
        </div>

        <div className="space-y-3">
          {[
            { label: 'HGVS Mutation Impact', prompt: 'Explain the impact of HGVS variants for the selected patient.', icon: <Dna className="w-4 h-4" /> },
            { label: 'Phenotype Mapping', prompt: 'Map current symptoms to ORDO phenotypic features.', icon: <Activity className="w-4 h-4" /> },
            { label: 'Recommended Pathways', prompt: 'What diagnostic pathways are recommended based on this multi-modal profile?', icon: <Microscope className="w-4 h-4" /> }
          ].map(tool => (
            <button key={tool.label} onClick={() => handleSend(tool.prompt)} className="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] hover:border-primary-400 transition flex items-center gap-4 group">
               <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-primary-600 transition">{tool.icon}</div>
               <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3 bg-white rounded-[3rem] border border-slate-200 flex flex-col shadow-sm overflow-hidden">
        <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
           <div className="flex items-center gap-4"><Brain className="w-6 h-6 text-primary-600" /><h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Interactive Consultation</h3></div>
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span className={`w-2 h-2 rounded-full ${selectedId ? 'bg-emerald-500' : 'bg-amber-500'}`}></span> {selectedId ? 'Patient Locked' : 'General Mode'}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-white custom-scroll">
          {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
              <Brain className="w-20 h-20 text-slate-200 mb-6" />
              <p className="text-2xl font-black text-slate-900 tracking-tighter">Medora Waiting</p>
              <p className="text-sm font-bold uppercase tracking-widest">Select patient context to begin</p>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] p-6 rounded-[2rem] shadow-sm text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-slate-50 text-slate-800 border rounded-bl-none'}`}>
                 <ReactMarkdown>{msg.text}</ReactMarkdown>
                 {msg.role === 'model' && (
                   <button onClick={() => speak(msg.text)} className="mt-4 p-2 bg-white rounded-xl text-slate-400 hover:text-primary-600 transition shadow-sm"><Volume2 className="w-4 h-4" /></button>
                 )}
               </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="p-6 bg-slate-50 rounded-3xl animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">Medora Inference...</div></div>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-8 bg-slate-50 border-t">
           <div className="flex gap-4">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask Medora diagnostic questions..." className="flex-1 p-5 bg-white border border-slate-200 rounded-3xl outline-none font-black text-slate-900 shadow-sm focus:ring-4 transition-all" />
              <button onClick={() => handleSend()} disabled={!input.trim() || loading} className="p-5 bg-primary-600 text-white rounded-3xl shadow-xl hover:bg-primary-700 transition active:scale-95 disabled:opacity-50"><Send className="w-6 h-6" /></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MedoraAI;
