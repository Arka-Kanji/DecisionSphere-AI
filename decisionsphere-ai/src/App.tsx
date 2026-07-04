import React, { useState } from 'react';
import { DebateRoom } from './components/DebateRoom';
import { Target, Search, ChevronRight, Activity, Shield, Users, Network } from 'lucide-react';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('Business Strategy');
  const [isStarting, setIsStarting] = useState(false);

  const startDebate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setIsStarting(true);
    try {
      const res = await fetch('/api/decision/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domain })
      });
      const data = await res.json();
      setSessionId(data.sessionId);
    } catch (err) {
      console.error(err);
      setIsStarting(false);
    }
  };

  if (sessionId) {
    return <DebateRoom sessionId={sessionId} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[20%] right-[20%] w-[30rem] h-[30rem] bg-emerald-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="glass-panel max-w-3xl w-full p-10 rounded-2xl relative z-10">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-900/30 rounded-2xl mb-5 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Network className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-3">DecisionSphere AI</h1>
          <p className="text-slate-400 text-lg font-light tracking-wide max-w-xl mx-auto">
            A Multi-Agent AI Executive Council for High-Stakes Decision Making.
          </p>
        </div>

        <form onSubmit={startDebate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Strategic Query</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Target className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                placeholder="e.g., Should we acquire our primary competitor?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Business Domain</label>
            <div className="relative">
              <select
                className="w-full pl-4 pr-10 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                <option value="Business Strategy">Business Strategy</option>
                <option value="Mergers & Acquisitions">Mergers & Acquisitions</option>
                <option value="Technology & Infrastructure">Technology & Infrastructure</option>
                <option value="Product Launch">Product Launch</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isStarting || !query}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] border border-indigo-400/20"
          >
            {isStarting ? (
              <>
                <Activity className="w-5 h-5 animate-spin" />
                Initializing Executive Council...
              </>
            ) : (
              <>
                Convene Council <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-800 flex justify-center gap-8">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Users className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider">Multi-Agent Debate</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Shield className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider">Red Team Validation</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Activity className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider">Real-time Analytics</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
