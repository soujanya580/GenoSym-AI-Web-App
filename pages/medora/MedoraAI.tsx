
import React, { useState, useRef, useEffect } from 'react';
import { chatWithMedora, synthesizeSpeech, playAudioBuffer, decode, decodeAudioData, encode } from '../../services/geminiService';
import { getPatientCases, getCaseAnalysisDetails } from '../../services/mockBackend';
import { PatientCase, GroundingSource } from '../../types';
import { useAuth } from '../../App';
import { Brain, Volume2, Send, User, Activity, Sparkles, GraduationCap, Microscope, Dna, Mic, MicOff, ExternalLink, Globe, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

const MedoraAI = () => {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string, sources?: GroundingSource[]}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoVoice, setAutoVoice] = useState(true);
  const [patients, setPatients] = useState<PatientCase[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [complexity, setComplexity] = useState<'simple' | 'medical'>('medical');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Live Voice State
  const [isLive, setIsLive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);

  useEffect(() => {
    if (user) setPatients(getPatientCases(user.email));
    return () => {
      if (liveSessionRef.current) liveSessionRef.current.close();
    };
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading, liveTranscription]);

  const speak = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    const buffer = await synthesizeSpeech(text.replace(/[*#_\[\]]/g, ''));
    if (buffer) {
      playAudioBuffer(buffer);
      setTimeout(() => setIsSpeaking(false), buffer.duration * 1000);
    } else setIsSpeaking(false);
  };

  const handleSend = async (override?: string) => {
    const text = override || input;
    if (!text.trim() || loading) return;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    const context = selectedId ? JSON.stringify(getCaseAnalysisDetails(selectedId)) : undefined;
    const response = await chatWithMedora(chatHistory, text, complexity, context);
    setChatHistory(prev => [...prev, { role: 'model', text: response.text, sources: response.sources }]);
    setLoading(false);
    
    // Automatic Voice Feedback
    if (autoVoice && response.text) {
      speak(response.text);
    }
  };

  const startLiveSession = async () => {
    if (isLive) {
      setIsLive(false);
      if (liveSessionRef.current) liveSessionRef.current.close();
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
              setLiveTranscription(prev => prev + msg.serverContent!.outputTranscription!.text);
            }
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTime);
              nextStartTime += buffer.duration;
              sources.add(source);
            }
            if (msg.serverContent?.interrupted) {
              sources.forEach(s => s.stop());
              sources.clear();
              nextStartTime = 0;
            }
            if (msg.serverContent?.turnComplete) {
              setLiveTranscription('');
            }
          },
          onclose: () => setIsLive(false),
          onerror: () => setIsLive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `You are Medora AI in Voice Mode. Be concise, empathetic, and professional. 
          Context: ${selectedId ? `Discussing patient ${selectedId}` : 'General medical inquiry'}.`
        }
      });

      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Live Audio Error:", err);
      alert("Microphone access is required for Voice Mode.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)] animate-fade-in font-sans relative">
      <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto custom-scroll pr-2">
        <div className="bg-gradient-to-br from-indigo-950 to-purple-950 p-8 rounded-[2.5rem] text-white shadow-xl">
           <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><Sparkles className="w-8 h-8 text-purple-300" /></div>
              <div><h2 className="text-xl font-black tracking-tight">Medora AI</h2><p className="text-[10px] font-black uppercase text-purple-300 tracking-widest">Diagnostic Assistant</p></div>
           </div>
           <p className="text-sm font-medium text-purple-100 opacity-80 leading-relaxed">Cross-referencing ORDO & Real-time Medical Research.</p>
           
           <button 
             onClick={startLiveSession}
             className={`mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${isLive ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary-600 hover:bg-primary-500'}`}
           >
             {isLive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
             {isLive ? 'End Voice Consultation' : 'Live Voice Mode'}
           </button>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-4 h-4" /> Patient Context</h3>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-primary-500">
             <option value="">General Knowledge</option>
             {patients.map(p => <option key={p.id} value={p.id}>{p.patientName} ({p.id})</option>)}
          </select>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Volume2 className="w-4 h-4" /> Voice Settings</h3>
           <button 
              onClick={() => setAutoVoice(!autoVoice)}
              className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${autoVoice ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
           >
              <div className="flex items-center gap-2">
                {autoVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="text-[10px] font-black uppercase tracking-widest">Auto-Response</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${autoVoice ? 'bg-primary-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${autoVoice ? 'left-4' : 'left-1'}`} />
              </div>
           </button>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Explanation Density</h3>
           <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button onClick={() => setComplexity('simple')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition ${complexity === 'simple' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-400'}`}>Simple</button>
              <button onClick={() => setComplexity('medical')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition ${complexity === 'medical' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-400'}`}>Medical</button>
           </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-white rounded-[3rem] border border-slate-200 flex flex-col shadow-sm overflow-hidden">
        <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
           <div className="flex items-center gap-4"><Brain className="w-6 h-6 text-primary-600" /><h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Consultation Log</h3></div>
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span> {isLive ? 'Live Audio' : 'Secure Text'}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-white custom-scroll">
          {chatHistory.length === 0 && !isLive && (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
              <Globe className="w-20 h-20 text-slate-200 mb-6" />
              <p className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Waiting for input</p>
              <p className="text-sm font-bold uppercase tracking-widest">System ready for medical query</p>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] p-6 rounded-[2rem] shadow-sm text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-slate-50 text-slate-800 border rounded-bl-none'}`}>
                 <ReactMarkdown>{msg.text}</ReactMarkdown>
                 
                 {msg.sources && msg.sources.length > 0 && (
                   <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ExternalLink className="w-3 h-3" /> External Sources</p>
                     <div className="flex flex-wrap gap-2">
                       {msg.sources.map((s, idx) => (
                         <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-primary-600 hover:bg-primary-50 transition flex items-center gap-1">
                           {s.title} <ExternalLink className="w-2 h-2" />
                         </a>
                       ))}
                     </div>
                   </div>
                 )}

                 {msg.role === 'model' && (
                   <button onClick={() => speak(msg.text)} className="mt-4 p-2 bg-white rounded-xl text-slate-400 hover:text-primary-600 transition shadow-sm"><Volume2 className="w-4 h-4" /></button>
                 )}
               </div>
            </div>
          ))}
          {isLive && liveTranscription && (
            <div className="flex justify-end">
              <div className="max-w-[85%] p-6 bg-primary-100 text-primary-900 rounded-[2rem] rounded-br-none border border-primary-200 shadow-sm animate-pulse">
                <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-50">Capturing Audio...</p>
                <p className="text-sm font-medium italic">"{liveTranscription}"</p>
              </div>
            </div>
          )}
          {loading && <div className="flex justify-start"><div className="p-6 bg-slate-50 rounded-3xl animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">Medora Inference (Grounding Active)...</div></div>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-8 bg-slate-50 border-t">
           <div className="flex gap-4">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask Medora about rare disease phenotypes..." className="flex-1 p-5 bg-white border border-slate-200 rounded-3xl outline-none font-black text-slate-900 shadow-sm focus:ring-4 transition-all" />
              <button onClick={() => handleSend()} disabled={!input.trim() || loading} className="p-5 bg-primary-600 text-white rounded-3xl shadow-xl hover:bg-primary-700 transition disabled:opacity-50"><Send className="w-6 h-6" /></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MedoraAI;
