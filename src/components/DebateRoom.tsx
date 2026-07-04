import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Users, Activity, Loader2, ArrowRight, CheckCircle2, XCircle, 
  Target, Download, ShieldAlert, Cpu, Briefcase, BarChart3, 
  BookOpen, Building2, Terminal, AlertTriangle, ShieldCheck, Database, Search
} from 'lucide-react';
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");
import { jsPDF } from 'jspdf';

interface DebateRoomProps {
  sessionId: string;
}

export function DebateRoom({ sessionId }: DebateRoomProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [status, setStatus] = useState<'connecting' | 'running' | 'completed' | 'error'>('connecting');
  const chatRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'debate' | 'report'>('debate');

  useEffect(() => {
    const eventSource = new EventSource(`/api/decision/${sessionId}/stream`);
    
    eventSource.onopen = () => setStatus('running');
    
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setEvents(prev => {
        if (!prev.find(p => p.id === data.id)) {
          return [...prev, data];
        }
        return prev;
      });
      if (data.type === 'stream_end') { eventSource.close(); return; }
      if (data.type === 'report_generated') {
        setStatus('completed');
        setActiveTab('report');
      }
    };
    
    eventSource.onerror = () => {
      setStatus((prev) => prev === 'completed' ? 'completed' : 'error');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [sessionId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [events]);

  const latestConfidences = events.filter(e => e.type === 'consensus_update').pop()?.agentConfidences;
  const latestVotes = events.filter(e => e.type === 'vote_update').pop()?.votes;
  const reportEvent = events.find(e => e.type === 'report_generated');
  const report = reportEvent?.report;
  
  // Collect all verified evidence pieces
  const allEvidence = events.filter(e => e.type === 'agent_msg' && e.evidence).flatMap(e => e.evidence);

  const handleDownload = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(report.replace(/#/g, ''), 180);
    doc.text(splitText, 15, 15);
    doc.save('Executive_Decision_Report.pdf');
  };

  const getAgentIcon = (agentName: string) => {
    if (agentName.includes('Research')) return <Search className="w-4 h-4" />;
    if (agentName.includes('Domain')) return <Briefcase className="w-4 h-4" />;
    if (agentName.includes('Finance')) return <BarChart3 className="w-4 h-4" />;
    if (agentName.includes('Risk')) return <ShieldAlert className="w-4 h-4" />;
    if (agentName.includes('Red Team')) return <Target className="w-4 h-4" />;
    if (agentName.includes('Verifier')) return <Database className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] p-6 text-slate-100 gap-6">
      
      {/* Top Header / Council Status */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30">
            <Building2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">DecisionSphere Command Center</h2>
            <p className="text-sm text-indigo-300 font-mono mt-0.5">SESSION ID: {sessionId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">System Status:</span>
            {status === 'running' && (
              <span className="flex items-center gap-2 text-emerald-400 text-sm font-mono bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-900">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                COUNCIL DELIBERATING
              </span>
            )}
            {status === 'completed' && (
              <span className="flex items-center gap-2 text-indigo-400 text-sm font-mono bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-900">
                <CheckCircle2 className="w-3 h-3" /> CONSENSUS REACHED
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-2 text-red-400 text-sm font-mono bg-red-950/50 px-3 py-1 rounded-full border border-red-900">
                <AlertTriangle className="w-3 h-3" /> CRITICAL ERROR
              </span>
            )}
          </div>
          
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
            <button 
              onClick={() => setActiveTab('debate')}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", activeTab === 'debate' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200')}
            >
              Live Feed
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              disabled={!reportEvent}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", activeTab === 'report' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed')}
            >
              Executive Report
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Timeline & MCP Logs */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-6 overflow-hidden">
          <div className="glass-card flex-1 p-5 flex flex-col min-h-0">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4 uppercase tracking-wider text-xs">
              <Activity className="w-4 h-4 text-emerald-400" />
              Execution Timeline
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative">
              <div className="timeline-line"></div>
              {events.filter(e => e.type === 'timeline').map((ev, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  key={ev.id} 
                  className="flex items-start gap-4 relative"
                >
                  <div className="timeline-dot mt-1.5 z-10 bg-emerald-500"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{ev.timelineEvent}</p>
                    <p className="text-[10px] font-mono text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="glass-card h-64 p-5 flex flex-col font-mono text-xs">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-3 uppercase tracking-wider text-xs font-sans">
              <Terminal className="w-4 h-4 text-indigo-400" />
              MCP Execution Logs
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              {events.filter(e => e.type === 'mcp_action' || e.type === 'security_check').map((ev) => (
                <div key={ev.id} className="border-b border-slate-800/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    {ev.type === 'security_check' ? (
                      <span className="text-emerald-400 bg-emerald-950/50 px-1 rounded">SEC_PASS</span>
                    ) : (
                      <span className="text-indigo-400 bg-indigo-950/50 px-1 rounded">{ev.mcpDetails.tool}</span>
                    )}
                  </div>
                  {ev.type === 'security_check' ? (
                    <div className="text-emerald-300">
                      {'>'} Prompt Injection: PASS<br/>
                      {'>'} Malicious URLs: PASS<br/>
                      {'>'} Source Trust: PASS
                    </div>
                  ) : (
                    <div className="text-slate-300">
                      {'>'} {ev.mcpDetails.action}: {ev.mcpDetails.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Chat Feed / Report */}
        <div className="glass-panel rounded-xl lg:col-span-6 flex flex-col overflow-hidden relative">
          {activeTab === 'debate' ? (
            <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <AnimatePresence initial={false}>
                {events.filter(e => e.type === 'agent_msg' || e.type === 'system').map((ev) => {
                  if (ev.type === 'system') {
                    return (
                      <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center my-6">
                        <span className="bg-indigo-900/40 border border-indigo-700/50 text-indigo-200 text-xs font-medium px-4 py-1.5 rounded-full backdrop-blur-sm">
                          {ev.message}
                        </span>
                      </motion.div>
                    );
                  }

                  const isRedTeam = ev.agent === 'Red Team Agent';
                  const isConsensus = ev.agent === 'Consensus Agent';

                  return (
                    <motion.div 
                      key={ev.id} 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col gap-2 p-5 rounded-xl border backdrop-blur-md shadow-lg",
                        isRedTeam ? "bg-rose-950/20 border-rose-900/50 ml-8" :
                        isConsensus ? "bg-indigo-950/30 border-indigo-800/50" : 
                        "bg-slate-900/60 border-slate-700/50 mr-8"
                      )}
                    >
                      <div className="flex items-center gap-3 border-b border-slate-700/50 pb-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isRedTeam ? "bg-rose-900/50 text-rose-300" :
                          isConsensus ? "bg-indigo-900/50 text-indigo-300" :
                          "bg-slate-800 text-slate-300"
                        )}>
                          {getAgentIcon(ev.agent || '')}
                        </div>
                        <div>
                          <h4 className={cn("font-bold text-sm", isRedTeam ? "text-rose-200" : isConsensus ? "text-indigo-200" : "text-slate-200")}>{ev.agent}</h4>
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">{ev.role}</span>
                        </div>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none markdown-body mt-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{ev.message || ''}</ReactMarkdown>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {status === 'running' && (
                <div className="flex items-center gap-3 text-indigo-400 text-sm py-4 justify-center bg-slate-900/40 rounded-xl border border-slate-800/50">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="animate-pulse">Awaiting independent agent analysis...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-950/80">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                  Executive Decision Report
                </h2>
                <button onClick={handleDownload} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-900/20">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
              <div className="prose prose-invert prose-sm sm:prose-base max-w-none markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report || ''}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Dashboard (Voting, Confidence, Evidence) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-6 overflow-hidden">
          
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4 uppercase tracking-wider text-xs">
              <Activity className="w-4 h-4 text-indigo-400" />
              Consensus Confidence
            </h3>
            {latestConfidences ? (
              <div className="space-y-4">
                {Object.entries(latestConfidences).map(([agent, conf]) => (
                  <div key={agent}>
                    <div className="flex justify-between text-xs mb-1.5 font-mono">
                      <span className={cn(agent === 'Consensus Agent' ? 'text-indigo-400 font-bold' : 'text-slate-400')}>{agent}</span>
                      <span className={cn(agent === 'Consensus Agent' ? 'text-indigo-400 font-bold' : 'text-slate-200')}>{conf}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-1000", 
                          agent === 'Consensus Agent' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 
                          conf >= 80 ? 'bg-emerald-500' : 
                          conf >= 60 ? 'bg-amber-500' : 'bg-rose-500')}
                        style={{ width: `${conf}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 font-mono">Aggregating logic models...</div>
            )}
          </div>

          <div className="glass-card p-5 flex-1 flex flex-col min-h-0">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4 uppercase tracking-wider text-xs">
              <Target className="w-4 h-4 text-rose-400" />
              Final Voting Record
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {latestVotes ? (
                latestVotes.map((vote, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/80 border border-slate-700/50 rounded-lg backdrop-blur-sm hover:border-slate-600 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-200">{vote.agent}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1",
                        vote.decision === 'APPROVE' ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900" :
                        vote.decision === 'REJECT' ? "bg-rose-950/50 text-rose-400 border border-rose-900" : 
                        "bg-amber-950/50 text-amber-400 border border-amber-900"
                      )}>
                        {vote.decision === 'APPROVE' && <CheckCircle2 className="w-3 h-3" />}
                        {vote.decision === 'REJECT' && <XCircle className="w-3 h-3" />}
                        {vote.decision}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed italic border-l-2 border-slate-700 pl-2">
                      "{vote.reason}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 font-mono">Awaiting final statements...</div>
              )}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 0.8); }
      `}</style>
    </div>
  );
}
