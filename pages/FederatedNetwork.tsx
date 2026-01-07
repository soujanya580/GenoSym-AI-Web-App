
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Network, Shield, Server, Globe, Activity, 
  Database, Lock, UploadCloud, DownloadCloud, CheckCircle,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { getFederatedData } from '../services/mockBackend';
import { FederatedNode, ModelMetric, FederatedLog } from '../types';

const FederatedNetwork = () => {
  const [nodes, setNodes] = useState<FederatedNode[]>([]);
  const [metrics, setMetrics] = useState<ModelMetric[]>([]);
  const [logs, setLogs] = useState<FederatedLog[]>([]);
  const [globalRound, setGlobalRound] = useState(0);

  useEffect(() => {
    const data = getFederatedData();
    // Added type assertions to fix Union Type incompatibility with mock data
    setNodes(data.nodes as FederatedNode[]);
    setMetrics(data.metrics);
    setLogs(data.logs as FederatedLog[]);
    setGlobalRound(data.metrics.length);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header & Compliance Banner */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
            <Globe className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Global Federated Network</h1>
            <p className="text-slate-500">Real-time status of privacy-preserving collaborative training.</p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-4">
          <Shield className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-emerald-800 font-bold text-sm uppercase tracking-wide mb-1">
              GDPR & HIPAA Compliance Active
            </h3>
            <p className="text-sm text-emerald-700 leading-relaxed">
              This network operates on a <strong>Zero-Data-Sharing</strong> architecture. Only encrypted model gradients (weights) are transmitted. 
              Patient data (Genomic, EHR, Imaging) remains strictly within local hospital firewalls.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 font-medium mb-1">Active Nodes</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-slate-900">{nodes.filter(n => n.status !== 'Offline').length}</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">/ {nodes.length} Total</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 font-medium mb-1">Global Training Round</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-slate-900">#{globalRound}</h3>
            <Activity className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 font-medium mb-1">Global Model Accuracy</p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-slate-900">
              {(metrics[metrics.length - 1]?.accuracy * 100 || 0).toFixed(1)}%
            </h3>
            <span className="text-xs text-green-600 font-bold flex items-center">
              <UploadCloud className="w-3 h-3 mr-1" /> +1.2%
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 font-medium mb-1">Data Privacy</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-slate-900">Encrypted</h3>
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 mt-1">Homomorphic Encryption</p>
        </div>
      </div>

      {/* Main Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Node Status Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Server className="w-5 h-5 text-slate-500" /> Hospital Nodes
            </h3>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Training</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Syncing</span>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nodes.map((node) => (
              <div key={node.id} className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-md transition relative group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      node.status === 'Online' ? 'bg-green-500' :
                      node.status === 'Training' ? 'bg-blue-500 animate-pulse' :
                      node.status === 'Syncing' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                    }`}></div>
                    <h4 className="font-bold text-slate-700 text-sm">{node.hospitalName}</h4>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 px-1.5 rounded text-slate-500">{node.region}</span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Status</span>
                    <span className="font-medium text-slate-700">{node.status}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Last Sync</span>
                    <span className="font-mono text-slate-600">{node.lastUpdate}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Updates Contributed</span>
                    <span className="font-mono text-indigo-600 font-bold">{node.contributionCount}</span>
                  </div>
                </div>

                {/* Simulated Traffic Animation */}
                {node.status === 'Training' || node.status === 'Syncing' ? (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 rounded-b-lg overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-progress-indeterminate"></div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Performance Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-500" /> Model Performance
            </h3>
          </div>
          <div className="p-4 flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="round" tick={{fontSize: 10}} />
                <YAxis domain={[0, 1]} tick={{fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#10b981" fillOpacity={1} fill="url(#colorAcc)" strokeWidth={2} name="Accuracy" />
                <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={2} dot={false} name="Loss" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Real-time Logs Console */}
      <div className="bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-slate-700">
        <div className="px-6 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 font-mono flex items-center gap-2">
            <Database className="w-4 h-4" /> Network Traffic Log
          </h3>
          <div className="flex gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          </div>
        </div>
        <div className="p-4 font-mono text-xs h-64 overflow-y-auto custom-scroll space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 text-slate-300 hover:bg-white/5 p-1 rounded">
              <span className="text-slate-500 min-w-[140px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className="text-blue-400 min-w-[180px]">{log.hospitalName}</span>
              <span className={`font-bold min-w-[120px] ${
                log.action === 'Gradient Upload' ? 'text-green-400' :
                log.action === 'Model Download' ? 'text-purple-400' : 'text-white'
              }`}>
                {log.action === 'Gradient Upload' ? <span className="flex items-center gap-1"><UploadCloud className="w-3 h-3" /> Upload</span> : 
                 log.action === 'Model Download' ? <span className="flex items-center gap-1"><DownloadCloud className="w-3 h-3" /> Download</span> : log.action}
              </span>
              <span className="text-slate-400">Payload: {log.size}</span>
            </div>
          ))}
          <div className="animate-pulse text-green-500 mt-2">_ Listening for updates...</div>
        </div>
      </div>
    </div>
  );
};

export default FederatedNetwork;
