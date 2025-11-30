
import React, { useState, useRef, useEffect } from 'react';
import { chatWithMedora, synthesizeSpeech, playAudioBuffer } from '../../services/geminiService';
import { getPatientCases, getCaseAnalysisDetails } from '../../services/mockBackend';
import { PatientCase } from '../../types';
import { useAuth } from '../../App';
import { 
  Brain, Mic, Volume2, Send, User, FileText, Dna, Activity, 
  BookOpen, GraduationCap, Stethoscope, Sparkles, Microscope,
  Image as ImageIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  { label: 'Rare Disease Definitions', icon: <BookOpen className="w-4 h-4" />, prompt: 'Define the selected disease using ORDO ontology terms.' },
  { label: 'Genetic Mutation Meaning', icon: <Dna className="w-4 h-4" />, prompt: 'Explain the clinical significance of the genomic variants found in this patient.' },
  { label: 'Biomarker Interpretation', icon: <Activity className="w-4 h-4" />, prompt: 'Interpret the abnormal biomarkers in this case and their link to the diagnosis.' },
  { label: 'EHR Symptom Relevance', icon: <FileText className="w-4 h-4" />, prompt: 'How do the patient\'s EHR symptoms map to the phenotypic features of the predicted disease?' },
  { label: 'Imaging Findings', icon: <ImageIcon className="w-4 h-4" />, prompt: 'Explain the potential radiological findings associated with this condition.' }
];

const MedoraAI = () => {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Context State
  const [patients, setPatients] = useState<PatientCase[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [complexity, setComplexity] = useState<'simple' | 'medical'>('medical');

  useEffect(() => {
    if (user) {
      setPatients(getPatientCases(user.email));
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const getPatientContextString = (patientId: string): string => {
    if (!patientId) return '';
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return '';
    
    // Simulate fetching deep data
    const details = getCaseAnalysisDetails(patientId);
    
    return JSON.stringify({
      summary: patient,
      variants: details.variants,
      topPrediction: details.predictions[0],
      biomarkers: details.proteomics.filter(p => p.isSignificant).slice(0, 5)
    });
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);

    const context = selectedPatientId ? getPatientContextString(selectedPatientId) : undefined;
    
    const response = await chatWithMedora(chatHistory, textToSend, complexity, context);
    
    setChatHistory(prev => [...prev, { role: 'model', text: response || "I couldn't process that." }]);
    setLoading(false);
  };

  const handleTTS = async (text: string) => {
    if (playingAudio) return;
    setPlayingAudio(true);
    // Strip markdown for cleaner speech (basic regex)
    const cleanText = text.replace(/[*#_\[\]]/g, ''); 
    const buffer = await synthesizeSpeech(cleanText);
    if (buffer) {
      playAudioBuffer(buffer);
      setTimeout(() => setPlayingAudio(false), buffer.duration * 1000);
    } else {
      setPlayingAudio(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
      
      {/* Left Sidebar: Controls & Context */}
      <div className="lg:col-span-1 flex flex-col gap-6 h-full overflow-y-auto">
        {/* Medora Brand Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Medora AI</h2>
              <p className="text-xs text-purple-200">ORDO-Enhanced Assistant</p>
            </div>
          </div>
          <p className="text-purple-100 text-sm opacity-90 leading-relaxed">
            I analyze rare diseases using the Orphanet ontology. Select a patient to begin specific inquiry.
          </p>
        </div>

        {/* Patient Context Selector */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" /> Active Patient Context
          </h3>
          <select 
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value);
              setChatHistory([]); // Clear chat on context switch
            }}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
          >
            <option value="">-- General Inquiry (No Patient) --</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.patientName} ({p.id})</option>
            ))}
          </select>
          {selectedPatientId && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
              <strong>Context Loaded:</strong>
              <br />
              Genomic variants, biomarkers, and EHR symptoms for this patient are now active in Medora's memory.
            </div>
          )}
        </div>

        {/* Education Mode Toggle */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-slate-400" /> Education Mode
          </h3>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setComplexity('simple')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition ${complexity === 'simple' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Simple
            </button>
            <button 
              onClick={() => setComplexity('medical')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition ${complexity === 'medical' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Medical
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 italic">
            {complexity === 'simple' ? "Explains concepts in layman's terms suitable for patients." : "Uses clinical terminology and citations for professionals."}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Analysis Tools</h3>
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              onClick={() => handleSend(action.prompt)}
              disabled={loading}
              className="w-full text-left p-3 bg-white border border-slate-200 rounded-xl hover:border-primary-400 hover:shadow-sm transition flex items-center gap-3 group disabled:opacity-60"
            >
              <div className="p-2 bg-slate-50 rounded-lg text-slate-500 group-hover:text-primary-600 group-hover:bg-primary-50 transition">
                {action.icon}
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-primary-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-600" />
            <h3 className="font-bold text-slate-800">Interactive Consultation</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${selectedPatientId ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {selectedPatientId ? 'Patient Context Active' : 'General Knowledge Base'}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
              <Microscope className="w-16 h-16 mb-4 text-slate-200" />
              <p className="text-lg font-medium">Ready to analyze.</p>
              <p className="text-sm">Select a patient or ask a question to begin.</p>
            </div>
          )}
          
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed 
                ${msg.role === 'user' 
                  ? 'bg-primary-600 text-white rounded-br-none' 
                  : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                <ReactMarkdown 
                  components={{
                    // Styling for markdown elements
                    strong: ({node, ...props}) => <span className="font-bold text-purple-700 dark:text-purple-300" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                    a: ({node, ...props}) => <a className="text-blue-500 underline hover:text-blue-700" {...props} />
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
                
                {msg.role === 'model' && (
                  <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-200/50">
                    <button 
                      onClick={() => handleTTS(msg.text)} 
                      disabled={playingAudio}
                      className="text-slate-400 hover:text-primary-600 disabled:opacity-50 transition"
                      title="Read Aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-slate-400 ml-auto">
                      Generated by Medora AI (Gemini)
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200"></div>
                </div>
                <span className="text-xs text-slate-500 font-medium">Medora is thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex gap-3">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={selectedPatientId ? "Ask about this patient's mutations or symptoms..." : "Ask general medical questions..."}
              className="flex-1 p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition text-slate-900"
              disabled={loading}
            />
            <button 
              onClick={() => handleSend()}
              disabled={loading || !input.trim()} 
              className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 shadow-md transition active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            AI-generated content for clinical support. Always verify with standard medical protocols.
          </p>
        </div>
      </div>

    </div>
  );
};

export default MedoraAI;
