import React, { useEffect, useState } from 'react';
import { Log } from '../types';
import { getLogs } from '../services/mockBackend';
import { Mail, Bell, Info, X } from 'lucide-react';

const Notifications: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<Log[]>([]);

  const fetchLogs = () => {
    setLogs(getLogs());
  };

  useEffect(() => {
    fetchLogs();
    window.addEventListener('logUpdated', fetchLogs);
    return () => window.removeEventListener('logUpdated', fetchLogs);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 transform transition-transform duration-300 ease-in-out">
      <div className="p-4 bg-primary-700 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          <h2 className="font-semibold">System Notifications & Emails</h2>
        </div>
        <button onClick={onClose} className="hover:bg-primary-600 p-1 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll bg-gray-50">
        {logs.length === 0 && (
          <p className="text-gray-500 text-center mt-10">No notifications yet.</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className={`p-3 rounded-lg shadow-sm border ${log.type === 'EMAIL' ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start gap-2 mb-1">
              {log.type === 'EMAIL' ? <Mail className="w-4 h-4 text-blue-500 mt-1" /> : <Info className="w-4 h-4 text-gray-500 mt-1" />}
              <div>
                <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                <p className="text-sm font-medium text-gray-800">{log.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;