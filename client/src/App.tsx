import { useState } from 'react';
import ChatWidget from './components/chat/ChatWidget.tsx';
import Dashboard from './components/dashboard/Dashboard.tsx';

function App() {
  const [viewMode, setViewMode] = useState<'customer' | 'executive'>('customer');

  if (viewMode === 'executive') {
    return (
      <div className="relative">
        <Dashboard />
        {/* Floating View Switcher */}
        <button
          onClick={() => setViewMode('customer')}
          className="fixed top-3 right-4 z-50 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all"
        >
          👤 Switch to Customer View
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative p-6">
      {/* Floating View Switcher */}
      <button
        onClick={() => setViewMode('executive')}
        className="fixed top-6 right-6 z-50 bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all"
      >
        💼 Open Executive Dashboard
      </button>

      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-slate-100 text-center">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
          🤖
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">ASEP Client Ready</h1>
        <p className="text-slate-500 mb-6">
          The AI Sales Executive Platform frontend is successfully initialized and ready.
        </p>
        <div className="flex flex-col gap-2 text-sm text-slate-400">
          <p>• Framework: React + Vite + TypeScript</p>
          <p>• Styles: Tailwind CSS</p>
          <p>• Sockets: Real-Time Syncing active</p>
          <p>• RAG Integration: Qdrant ready</p>
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}

export default App;
