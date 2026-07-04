import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, HeartPulse, Landmark, UserCircle2, ArrowRight, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';

const DOMAINS = [
  { id: 'business', label: 'Business Strategy', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'healthcare', label: 'Healthcare & Pharma', icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'policy', label: 'Public Policy', icon: Landmark, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'personal', label: 'Personal Planning', icon: UserCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

export function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('business');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/decision/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          domain: DOMAINS.find((d) => d.id === domain)?.label || 'General',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      navigate(`/debate/${data.sessionId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl mb-6">
          <BrainCircuit className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-4">
          Convene the AI Council
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
          Submit complex decisions to a council of specialized AI agents. They will debate, verify evidence, challenge assumptions, and produce a unified executive recommendation.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Select Decision Domain
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DOMAINS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDomain(d.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    domain === d.id
                      ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg mb-2 ${d.bg}`}>
                    <d.icon className={`w-5 h-5 ${d.color}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 text-center">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="query" className="block text-sm font-medium text-slate-700 mb-2">
              What decision do you need to make?
            </label>
            <textarea
              id="query"
              rows={4}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Should we acquire our main competitor for $50M in cash, given the current antitrust regulatory climate?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-shadow resize-none text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Initializing Council...' : 'Convene Council'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
