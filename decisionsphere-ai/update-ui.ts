import fs from 'fs';

const updatedUI = `import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DebateEvent, Evidence, AgentVote } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ServerCog, ShieldAlert, Target, Search, Download, 
  ArrowLeft, CheckCircle2, CircleDashed, Loader2, FileText,
  Activity, Fingerprint, Database, GitBranch, History, Sliders, 
  Globe, Shield, ShieldCheck, XCircle, AlertTriangle, Check, Folders,
  Info, ShieldQuestion, HelpCircle, AlertOctagon, Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const AGENT_CONFIG: Record<string, { icon: any, color: string, bg: string }> = {
  'System': { icon: ServerCog, color: 'text-slate-500', bg: 'bg-slate-100' },
  'Orchestrator': { icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  'Consensus Agent': { icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  'Domain Expert': { icon: Target, color: 'text-blue-600', bg: 'bg-blue-100' },
  'Evidence Verifier': { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  'Legal & Compliance Agent': { icon: Scale, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  'Fact Checker': { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  'Risk Agent': { icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-100' },
  'Risk Analyst': { icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-100' },
  'Red Team Agent': { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100' },
  'Research Agent': { icon: Search, color: 'text-purple-600', bg: 'bg-purple-100' },
  'Finance Agent': { icon: Activity, color: 'text-amber-600', bg: 'bg-amber-100' },
};

export function DebateRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [events, setEvents] = useState<DebateEvent[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [status, setStatus] = useState<'connecting' | 'running' | 'completed' | 'error'>('connecting');
  const [mode, setMode] = useState<'debate' | 'report'>('debate');
  
  const [scenario, setScenario] = useState({ budget: 50, riskTolerance: 50 });
  const [isUpdatingScenario, setIsUpdatingScenario] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    const evtSource = new EventSource(\`/api/decision/\${sessionId}/stream\`);
    
    evtSource.onmessage = (e) => {
      setStatus('running');
      const data: DebateEvent = JSON.parse(e.data);
      
      if (data.type === 'report_generated') {
        setReport(data.report || null);
        setConfidence(data.confidence || null);
        setStatus('completed');
        setTimeout(() => setMode('report'), 2000);
      } else {
        setEvents(prev => {
          if (prev.some(ev => ev.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    };

    evtSource.addEventListener('end', () => {
      setStatus('completed');
      evtSource.close();
    });

    evtSource.onerror = () => {
      setStatus('error');
      evtSource.close();
    };

    return () => evtSource.close();
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current && mode === 'debate') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, mode]);

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`Executive_Report_\${sessionId?.slice(0, 8)}.md\`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyScenario = async () => {
    setIsUpdatingScenario(true);
    try {
      await fetch(\`/api/decision/\${sessionId}/scenario\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: { 'Budget (%)': scenario.budget, 'Risk Tolerance (%)': scenario.riskTolerance } })
      });
    } finally {
      setTimeout(() => setIsUpdatingScenario(false), 2000);
    }
  };

  const handleScenarioChange = (key: string, value: number) => {
    setScenario(prev => ({ ...prev, [key]: value }));
  };

  const latestSecurity = events.filter(e => e.type === 'security_check').pop()?.securityDetails;
  const latestConfidences = events.filter(e => e.type === 'consensus_update').pop()?.agentConfidences;
  const latestVotes = events.filter(e => e.type === 'vote_update').pop()?.votes;
  const allEvidence = events.flatMap(e => e.evidence || []);
  const mcpActions = events.filter(e => e.type === 'mcp_action');
  const timelineEvents = events.filter(e => e.type === 'timeline');
  const chatEvents = events.filter(e => ['system', 'agent_msg'].includes(e.type));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          New Council
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium">
          {status === 'running' && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
          {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {status === 'error' && <CircleDashed className="w-4 h-4 text-red-500" />}
          <span className="capitalize text-slate-700">{status}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 pb-6">
        
        {/* LEFT COLUMN - Context & Security */}
        <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-emerald-500" />
              Security Agent
            </h3>
            {latestSecurity ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Prompt Injection</span>
                  {latestSecurity.checks.promptInjection ? <Check className="w-4 h-4 text-emerald-500"/> : <XCircle className="w-4 h-4 text-red-500"/>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Malicious URLs</span>
                  {latestSecurity.checks.maliciousUrls ? <Check className="w-4 h-4 text-emerald-500"/> : <XCircle className="w-4 h-4 text-red-500"/>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Source Trust</span>
                  {latestSecurity.checks.sourceTrust ? <Check className="w-4 h-4 text-emerald-500"/> : <XCircle className="w-4 h-4 text-red-500"/>}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Overall Status</span>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold uppercase tracking-wider">{latestSecurity.status}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Running checks...</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-indigo-500" />
              Decision Timeline
            </h3>
            <div className="space-y-4">
              {timelineEvents.length === 0 && <p className="text-sm text-slate-400">Waiting for events...</p>}
              {timelineEvents.map((ev, i) => (
                <div key={ev.id} className="flex gap-3 relative">
                  {i !== timelineEvents.length - 1 && <div className="absolute left-2.5 top-6 bottom-[-16px] w-0.5 bg-slate-100"></div>}
                  <div className="w-5 h-5 rounded-full bg-indigo-50 border-2 border-indigo-200 flex-shrink-0 mt-0.5 z-10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{ev.timelineEvent}</p>
                    <p className="text-xs text-slate-400">{new Date(ev.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-blue-500" />
              MCP Actions
            </h3>
            <div className="space-y-3">
              {mcpActions.length === 0 && <p className="text-sm text-slate-400">No actions yet.</p>}
              {mcpActions.map(ev => (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={ev.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                  <div className="flex items-center gap-2 font-medium text-slate-700 mb-1">
                    {ev.mcpDetails?.tool === 'Browser' && <Globe className="w-4 h-4 text-blue-500" />}
                    {ev.mcpDetails?.tool === 'GitHub' && <GitBranch className="w-4 h-4 text-purple-500" />}
                    {ev.mcpDetails?.tool === 'Filesystem' && <Folders className="w-4 h-4 text-amber-500" />}
                    {ev.mcpDetails?.tool}
                  </div>
                  <p className="text-slate-600 text-xs">{ev.mcpDetails?.action}: {ev.mcpDetails?.result}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN - Debate & Scenarios */}
        <div className="lg:col-span-6 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button 
              onClick={() => setMode('debate')}
              className={cn("flex-1 py-3 px-4 text-sm font-medium text-center transition-colors border-b-2", mode === 'debate' ? "border-indigo-600 text-indigo-700 bg-indigo-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50")}
            >
              Live Dashboard
            </button>
            <button 
              onClick={() => setMode('report')}
              disabled={!report}
              className={cn("flex-1 py-3 px-4 text-sm font-medium text-center transition-colors border-b-2 disabled:opacity-50 disabled:cursor-not-allowed", mode === 'report' ? "border-indigo-600 text-indigo-700 bg-indigo-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50")}
            >
              Executive Report
            </button>
          </div>

          {mode === 'debate' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Scenario Simulator
                  </h4>
                  <button 
                    onClick={handleApplyScenario}
                    disabled={isUpdatingScenario || status === 'connecting'}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isUpdatingScenario ? 'Simulating...' : 'Apply Scenario'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Budget Constraint</span>
                      <span className="font-medium">{scenario.budget}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={scenario.budget} onChange={(e) => handleScenarioChange('budget', parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Risk Tolerance</span>
                      <span className="font-medium">{scenario.riskTolerance}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={scenario.riskTolerance} onChange={(e) => handleScenarioChange('riskTolerance', parseInt(e.target.value))} className="w-full" />
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                <AnimatePresence initial={false}>
                  {chatEvents.map((ev) => {
                    const isSystem = ev.type === 'system';
                    const agentName = isSystem ? 'System' : (ev.agent || 'Agent');
                    const config = AGENT_CONFIG[agentName] || AGENT_CONFIG['System'];
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-4", isSystem && "opacity-75")}
                      >
                        <div className="flex-shrink-0">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bg)}>
                            <Icon className={cn("w-5 h-5", config.color)} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">{agentName}</span>
                            {ev.role && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {ev.role}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <div className={cn(
                            "text-sm leading-relaxed",
                            isSystem ? "text-slate-500 italic" : "text-slate-700 bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100"
                          )}>
                            {ev.message}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {status === 'running' && (
                  <div className="flex items-center gap-3 text-slate-400 text-sm py-4 px-14 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Agents are deliberating...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Executive Decision Report</h2>
                <button onClick={handleDownload} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="prose prose-slate prose-sm sm:prose-base max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report || ''}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Evidence & Consensus */}
        <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-rose-500" />
              Consensus Confidence
            </h3>
            {latestConfidences ? (
              <div className="space-y-4">
                {Object.entries(latestConfidences).map(([agent, conf]) => (
                  <div key={agent}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className={cn("font-medium", agent === 'Consensus Agent' ? 'text-indigo-700' : 'text-slate-600')}>{agent}</span>
                      <span className={cn("font-bold", agent === 'Consensus Agent' ? 'text-indigo-700' : 'text-slate-900')}>{conf}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-1000", 
                          agent === 'Consensus Agent' ? 'bg-indigo-600' : 
                          conf >= 80 ? 'bg-emerald-500' : 
                          conf >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                        style={{ width: \`\${conf}%\` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Waiting for consensus...</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-indigo-500" />
              Agent Voting
            </h3>
            {latestVotes ? (
              <div className="space-y-3">
                {latestVotes.map((vote, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800">{vote.agent}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                        vote.decision === 'APPROVE' ? "bg-emerald-100 text-emerald-700" :
                        vote.decision === 'REJECT' ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-700"
                      )}>
                        {vote.decision}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-snug">{vote.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Voting pending...</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-emerald-500" />
              Verified Evidence
            </h3>
            <div className="space-y-4">
              {allEvidence.length === 0 && <div className="text-sm text-slate-400">No evidence gathered yet.</div>}
              {allEvidence.map((ev, i) => (
                <div key={i} className="p-4 border border-slate-200 bg-white rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                     <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                        ev.verificationStatus === 'Verified' ? "bg-emerald-100 text-emerald-700" :
                        ev.verificationStatus === 'Rejected' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {ev.verificationStatus || 'Unverified'}
                      </span>
                      {ev.timestamp && <span className="text-[10px] text-slate-400">{new Date(ev.timestamp).toLocaleTimeString()}</span>}
                  </div>
                  
                  <p className="text-sm font-medium text-slate-800 mb-3 leading-snug">"{ev.claim}"</p>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-500 block mb-1">Source</span>
                      <span className="font-semibold text-slate-700 truncate block">{ev.source}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-500 block mb-1">Confidence</span>
                      <span className="font-semibold text-indigo-600 block">{ev.confidence}%</span>
                    </div>
                  </div>

                  {(ev.unknowns?.length > 0 || ev.missingInformation?.length > 0) && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                      {ev.missingInformation && ev.missingInformation.length > 0 && (
                        <div className="text-xs">
                          <span className="text-amber-600 font-semibold flex items-center gap-1 mb-1">
                            <ShieldQuestion className="w-3 h-3" /> Missing Info
                          </span>
                          <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                            {ev.missingInformation.map((info, idx) => <li key={idx}>{info}</li>)}
                          </ul>
                        </div>
                      )}
                      {ev.unknowns && ev.unknowns.length > 0 && (
                        <div className="text-xs">
                          <span className="text-slate-600 font-semibold flex items-center gap-1 mb-1">
                            <HelpCircle className="w-3 h-3" /> Unknowns
                          </span>
                          <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                            {ev.unknowns.map((u, idx) => <li key={idx}>{u}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      
      <style>{\`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      \`}</style>
    </div>
  );
}
`;

fs.writeFileSync('src/components/DebateRoom.tsx', updatedUI);
