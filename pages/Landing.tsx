
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Activity, Shield, Share2, Brain, ArrowRight, Microscope, Building2, LayoutDashboard, Dna, Lock, Sparkles, MessageSquare, X, Volume2, Send } from 'lucide-react';
import { chatWithMedora, synthesizeSpeech, playAudioBuffer } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Medora Bot State
  const [showBot, setShowBot] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Hello! I'm Medora AI. I can explain how Genosym uses Federated Learning and Multi-modal AI to diagnose rare diseases. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleRegisterHospital = () => {
    navigate('/register', { state: { mode: 'HOSPITAL' } });
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Use the special landing page context
    const response = await chatWithMedora(chatHistory, userMsg, 'simple', 'LANDING_PAGE_CONTEXT');
    
    setChatHistory(prev => [...prev, { role: 'model', text: response || "I'm having trouble connecting." }]);
    setLoading(false);
  };

  const handleSpeak = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    const cleanText = text.replace(/[*#_\[\]]/g, '');
    const buffer = await synthesizeSpeech(cleanText);
    if (buffer) {
      playAudioBuffer(buffer);
      // Rough estimate for duration to reset state
      setTimeout(() => setIsSpeaking(false), buffer.duration * 1000);
    } else {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, showBot]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Dna className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">Genosym AI</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                 <span className="text-sm font-medium text-slate-600 hidden sm:block">Welcome, {user.name}</span>
                 <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition shadow-sm flex items-center gap-2">
                   <LayoutDashboard className="w-4 h-4" /> Enter Platform
                 </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Super Admin Access - Added to Nav */}
                <button 
                  onClick={() => navigate('/login', { state: { isSuperAdmin: true } })}
                  className="text-sm font-medium text-slate-500 hover:text-red-600 transition px-2 py-2 flex items-center gap-1.5 mr-2"
                  title="Super Admin Access"
                >
                  <Lock className="w-3 h-3" /> Super Admin
                </button>
                
                <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

                <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-600 hover:text-primary-600 transition px-3 py-2">
                  Doctor Login
                </button>
                <button onClick={handleRegisterHospital} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition shadow-sm">
                  Register Hospital
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-slate-900 pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Background Accents */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500 rounded-full blur-3xl"></div>
             <div className="absolute top-1/2 -left-24 w-72 h-72 bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-primary-200 text-sm font-medium mb-8 backdrop-blur-sm">
            <Microscope className="w-4 h-4" />
            <span>Clinical-Grade Diagnostic Platform</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Revolutionizing <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-blue-300">
              Rare Disease Diagnosis
            </span>
          </h1>
          
          <h2 className="text-xl md:text-2xl text-slate-300 font-light mb-6">
            Advanced Medical Intelligence Powered by Federated AI
          </h2>

          <p className="max-w-3xl mx-auto text-lg text-slate-400 mb-10 leading-relaxed">
            A secure, multi-modal platform integrating genomic sequencing, proteomic profiles, and clinical imaging to accelerate rare disease identification while preserving patient privacy.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            {user ? (
              <button onClick={() => navigate('/dashboard')} className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-primary-900/40 text-lg">
                Enter Platform <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button onClick={handleRegisterHospital} className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-primary-900/40 text-lg">
                  Register Institution
                </button>
                
                {/* Medora AI Trigger */}
                <button 
                  onClick={() => setShowBot(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 text-lg border border-purple-400/30"
                >
                  <Sparkles className="w-5 h-5" /> Talk to Medora AI
                </button>

                <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-bold transition flex items-center justify-center gap-2 text-lg">
                  Doctor Login
                </button>
              </>
            )}
          </div>

          {/* Disclaimer / Footer Stats */}
          <div className="mt-12 text-slate-500 text-sm">
            <p>Secure Access • HIPAA Compliant • ISO 27001 Certified</p>
          </div>
        </div>
      </div>

      {/* Key Features Showcase (Stats Bar) */}
      <div className="relative -mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 p-8">
            <div className="text-center border-r border-slate-100 last:border-0">
                <div className="text-3xl font-bold text-slate-900 mb-1">1,000+</div>
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Rare Diseases Indexed</div>
            </div>
            <div className="text-center border-r border-slate-100 last:border-0">
                <div className="text-3xl font-bold text-slate-900 mb-1">Multi-Modal</div>
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Data Integration</div>
            </div>
            <div className="text-center border-r border-slate-100 last:border-0">
                <div className="text-3xl font-bold text-slate-900 mb-1">SHAP</div>
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Explainable AI</div>
            </div>
            <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 mb-1">HIPAA</div>
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Compliant Workflow</div>
            </div>
        </div>
      </div>

      {/* Detailed Feature Grid */}
      <div className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Leading Hospitals Choose Genosym</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Our platform bridges the gap between complex biological data and actionable clinical insights.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Intelligent Diagnostics</h3>
              <p className="text-slate-600">
                Advanced algorithms analyze symptom clusters against global rare disease registries to suggest high-probability diagnoses.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Federated Security</h3>
              <p className="text-slate-600">
                Train models collaboratively across institutions without patient data ever leaving your secure local environment.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-6">
                <Share2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Collaborative Research</h3>
              <p className="text-slate-600">
                Connect with specialists worldwide to validate findings and contribute to the global understanding of rare pathologies.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold">G</div>
              <span className="text-xl font-bold text-slate-900">Genosym AI</span>
           </div>
           <p className="text-slate-500 text-sm">© 2024 Genosym AI. Secure Medical Infrastructure.</p>
           <div className="flex gap-6 text-sm font-medium text-slate-600">
             <button className="hover:text-primary-600">Privacy Policy</button>
             <button className="hover:text-primary-600">Terms of Service</button>
             <button className="hover:text-primary-600">Support</button>
           </div>
        </div>
      </div>

      {/* Medora AI Landing Modal */}
      {showBot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[600px] flex flex-col overflow-hidden animate-scale-up border border-slate-200">
            
            {/* Bot Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-bold">Medora AI</h3>
                  <p className="text-xs text-purple-200">Platform Guide</p>
                </div>
              </div>
              <button onClick={() => setShowBot(false)} className="hover:bg-white/10 p-1 rounded transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                    {msg.role === 'model' && (
                      <button 
                        onClick={() => handleSpeak(msg.text)}
                        disabled={isSpeaking}
                        className="mt-2 text-slate-400 hover:text-purple-600 transition disabled:opacity-50"
                        title="Listen to response"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex gap-2">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about features, security, or technology..."
                  className="flex-1 p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-900"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition shadow-md"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
