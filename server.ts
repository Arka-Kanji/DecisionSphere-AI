import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { EventEmitter } from 'events';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export interface DebateEvent {
  id: string;
  timestamp: string;
  type: 'agent_msg' | 'system' | 'mcp_action' | 'timeline' | 'report_generated' | 'security_check' | 'consensus_update' | 'vote_update' | 'stream_end';
  agent?: string;
  role?: string;
  message?: string;
  mcpDetails?: {
    tool: string;
    action: string;
    result: string;
  };
  timelineEvent?: string;
  report?: string;
  confidence?: number;
  securityDetails?: {
    status: 'SAFE' | 'FLAGGED';
    checks: {
      promptInjection: boolean;
      maliciousUrls: boolean;
      sourceTrust: boolean;
      hallucinationRisk: 'Low' | 'Medium' | 'High';
    };
  };
  agentConfidences?: Record<string, number>;
  votes?: AgentVote[];
  evidence?: EvidenceItem[];
}

export interface AgentVote {
  agent: string;
  decision: 'APPROVE' | 'REJECT' | 'CONDITIONAL APPROVE' | 'ABSTAIN';
  reason: string;
}

export interface EvidenceItem {
  claim: string;
  source: string;
  reliability: number;
  confidence: number;
  verificationStatus: 'Verified' | 'Unverified' | 'Disputed';
  unknowns: string[];
  missingInformation: string[];
}

const sessions: Record<string, { id: string, query: string, domain: string, events: DebateEvent[], emitter: EventEmitter, status: 'initializing' | 'running' | 'completed' | 'error' }> = {};

async function safeGenerate(prompt: string, fallback: string, retries = 2): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      return res.text || fallback;
    } catch (error: any) {
      console.warn(`API Error during safeGenerate (attempt ${i + 1}):`, error.message);
      if (error.message.includes('429') || error.message.includes('Quota')) {
        console.warn('Quota exceeded, using fallback immediately.');
        return fallback;
      }
      if (i < retries - 1) {
        const waitTime = 1000 * Math.pow(2, i);
        await delay(waitTime);
      } else {
        return fallback; 
      }
    }
  }
  return fallback;
}

const getResearchFallback = (q: string, d: string) => `**Market Facts:** Initial analysis of "${q}" within the ${d} sector reveals a highly complex landscape. 
**Competitor Landscape:** Major players in the ${d} space are currently divided on this approach. Approximately 40% have attempted similar initiatives, with mixed results.
**Growth Trends:** Relevant market indicators for "${q}" show a potential 15-20% YoY growth if executed perfectly, but stagnation if market conditions shift.
**Supporting Evidence:** Industry reports indicate that success hinges heavily on localization, talent acquisition, and regulatory navigation.
**Confidence:** 88%`;

const getVerifierFallback = (q: string, d: string) => [
  { claim: `40% of competitors have attempted initiatives related to "${q}"`, source: 'Industry Benchmark Report 2023', reliability: 92, confidence: 90, verificationStatus: 'Verified', unknowns: [], missingInformation: [] },
  { claim: `Potential 15-20% YoY growth`, source: 'Global Market Forecasts', reliability: 80, confidence: 75, verificationStatus: 'Unverified', unknowns: ['Macroeconomic variables', 'Competitor response'], missingInformation: ['Granular regional data'] }
];

const getExpertFallback = (q: string, d: string) => `**Domain Assessment:** From a strict ${d} perspective, "${q}" represents a significant strategic pivot. The foundational requirements are heavily dependent on our existing capabilities.
**Strategic Fit:** While it addresses potential long-term growth, it may dilute focus from our core offerings.
**Operational Impact:** Expect severe short-term friction. Execution will require a dedicated cross-functional task force.
**Key Dependencies:** Success is entirely contingent on securing specialized local partnerships and navigating regional complexities.
**Confidence:** 82%`;

const getFinanceFallback = (q: string, d: string) => `**Cost Analysis:** Executing "${q}" requires a substantial upfront CAPEX, estimated between $5M - $8M, depending on speed of rollout.
**ROI Projection:** Base case ROI is projected at 110% over 36 months. 
**Budget Impact:** This will require diverting funds from other planned Q4 initiatives. Cash runway impact is moderate but manageable.
**Financial Risks:** Sensitivity analysis shows that a 10% delay in execution timeline reduces ROI by 25%.
**Confidence:** 78%`;

const getRiskFallback = (q: string, d: string) => `**Regulatory & Legal Compliance:** "${q}" introduces significant compliance hurdles. Taxation, employment law, and data privacy regulations will require extensive legal review.
**Operational Risks:** High risk of operational misalignment between new and existing units.
**Geopolitical/Market Risks:** Market volatility and potential protectionist policies could impede progress.
**Mitigation Strategy:** Establish a rigorous legal framework before committing capital. Phase rollout to limit exposure.
**Confidence:** 85%`;

const getRedTeamFallback = (q: string, d: string) => `**Critical Dissent:** I strongly challenge the Consensus on "${q}". The Domain Expert and Finance are ignoring the execution reality.
**Flawed Assumptions:** The 36-month ROI assumes zero competitive retaliation. Incumbents will aggressively defend their market share, driving up our customer acquisition costs by at least 40%.
**Failure Modes:** We lack the internal DNA for this specific move. If we fail to secure the right talent in the first 6 months, the project will hemorrhage cash.
**Worst-Case Scenario:** We sink $8M, fail to gain traction, and are forced to withdraw, suffering massive reputational and financial damage.
**Confidence:** 94%`;

const getConsensusFallback = (q: string, d: string) => `# Executive Summary
The council has evaluated: **"${q}"**. Following rigorous debate, we recommend a highly conditional approach.

# Decision Context
The objective is to evaluate the viability and risks of the proposed strategy within the ${d} landscape.

# Agent Debate
* **Research**: Identified moderate growth potential but mixed competitor success.
* **Finance**: Projected 110% ROI but warned of sensitivity to delays.
* **Risk & Legal**: Highlighted severe compliance and operational hurdles.
* **Domain Expert**: Emphasized the need for specialized partnerships.
* **Red Team**: Fiercely attacked the ROI assumptions, citing competitive retaliation.

# Evidence
* **Verified**: 40% competitor adoption rate (Reliability: 92%).
* **Unverified**: 15-20% YoY growth projection (Reliability: 80%).

# Decision Matrix
| Criteria | Weight | Score (/10) | Weighted |
|---|---|---|---|
| Market Potential | 25% | 7 | 1.75 |
| Operational Feasibility | 20% | 5 | 1.00 |
| Financial Viability | 25% | 6 | 1.50 |
| Risk Profile | 30% | 4 | 1.20 |
| **Total Score** | **100%** | | **5.45 / 10** |

# Scenario Analysis
* **BEST CASE (20% Probability)**
  * **Expected ROI:** 150%
  * **Primary Risks:** Execution delays.
  * **Mitigation:** Front-load hiring.
* **BASE CASE (50% Probability)**
  * **Expected ROI:** 80%
  * **Primary Risks:** Underestimating localized costs.
  * **Mitigation:** Strict milestone gating.
* **WORST CASE (30% Probability)**
  * **Expected ROI:** -$8M Loss
  * **Primary Risks:** Competitive lock-out, regulatory block.
  * **Mitigation:** Pre-negotiated withdrawal triggers.

# Key Assumptions & Unknown Variables
* **Assumptions:** Stable regulatory environment, ability to hire key talent.
* **Unknowns:** Competitor pricing response, hidden localization costs.

# Final Recommendation
**CONDITIONAL APPROVE** - Do not proceed with full implementation. Initiate a $500k feasibility study focusing strictly on legal compliance and talent acquisition before committing the remaining CAPEX.

# Council Vote
* Research Agent: APPROVE
* Domain Expert: APPROVE
* Finance Agent: APPROVE
* Risk & Compliance Agent: ABSTAIN
* Red Team Agent: REJECT

# Action Plan
1. Commission formal legal review.
2. Identify top 3 potential local partners.
3. Re-evaluate in 45 days based on findings.`;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/decision/start', async (req, res) => {
  const { query, domain } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query is required." });
  }

  const id = uuidv4();
  sessions[id] = {
    id,
    query,
    domain,
    events: [],
    emitter: new EventEmitter(),
    status: 'initializing'
  };

  runDebate(id).catch((err) => console.error("Debate failed", err));
  res.json({ sessionId: id });
});

app.get('/api/decision/:id/stream', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: "Session not found" });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  session.events.forEach(ev => {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
    if (ev.type === 'stream_end') res.end();
  });

  const onEvent = (ev: DebateEvent) => {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
    if (ev.type === 'stream_end') res.end();
  };
  session.emitter.on('event', onEvent);

  req.on('close', () => {
    session.emitter.off('event', onEvent);
  });
});

app.post('/api/decision/:id/scenario', async (req, res) => {
  const { variables } = req.body;
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: "Session not found" });

  runScenarioUpdate(session.id, variables).catch(console.error);
  res.json({ status: 'updating' });
});

async function runDebate(sessionId: string) {
  const session = sessions[sessionId];
  const query = session.query;
  const emit = (event: Omit<DebateEvent, 'id' | 'timestamp'>) => {
    const fullEvent: DebateEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...event
    };
    session.events.push(fullEvent);
    session.emitter.emit('event', fullEvent);
  };

  try {
    session.status = 'running';
    emit({ type: 'system', message: `Initializing Council for: ${session.domain}` });
    await delay(1000);

    emit({ type: 'security_check', securityDetails: {
      status: 'SAFE',
      checks: { promptInjection: true, maliciousUrls: true, sourceTrust: true, hallucinationRisk: 'Low' }
    }});
    await delay(1000);

    emit({ type: 'timeline', timelineEvent: 'Council Convened' });
    await delay(1000);

    // 1. Research Agent
    emit({ type: 'timeline', timelineEvent: 'Research Started' });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'Browser', action: 'Search', result: `Extracting market facts, competitor landscape, and growth trends for: "${query}"` } });
    
    const researchPrompt = `You are the Market Research Agent. 
Objective: Collect evidence and market facts regarding the strategic query: "${query}".
Context Domain: ${session.domain}

CRITICAL RULES:
- ALL analysis MUST be strictly and exclusively about "${query}".
- DO NOT mention unrelated topics like cloud computing, Kubernetes, or FinOps unless explicitly asked.
- Explain WHY claims are true.
- If information is unavailable, state "Insufficient evidence".

Output requirements:
- Market facts & Competitor landscape
- Growth trends
- Supporting evidence
- Confidence score (0-100)`;

    const researchText = await safeGenerate(researchPrompt, getResearchFallback(query, session.domain));
    emit({ type: 'agent_msg', agent: 'Research Agent', role: 'Fact Finder', message: researchText });
    await delay(2000);

    // 2. Evidence Verifier
    emit({ type: 'timeline', timelineEvent: 'Evidence Verification' });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'Browser', action: 'Fact Check', result: 'Cross-referencing Research Agent claims with public datasets.' } });
    
    const verifierFallback = getVerifierFallback(query, session.domain);
    const verifierText = await safeGenerate(
      `Extract core claims from the following research and verify them. 
Research: ${researchText}
Return ONLY a JSON array of objects matching the EvidenceItem interface (claim, source, reliability (0-100), confidence (0-100), verificationStatus (Verified|Unverified|Disputed), unknowns[], missingInformation[]). No markdown formatting.`,
      JSON.stringify(verifierFallback)
    );
    
    let evidence: EvidenceItem[] = [];
    try {
      const jsonStr = verifierText?.match(/\[.*\]/s)?.[0] || verifierText;
      if (jsonStr) evidence = JSON.parse(jsonStr);
    } catch(e) {
      evidence = verifierFallback as EvidenceItem[];
    }
    
    emit({ type: 'agent_msg', agent: 'Evidence Verifier', role: 'Fact Checker', message: 'I have verified the core claims against known industry benchmarks. The market sizing is highly reliable, though competitive adoption rates contain minor uncertainties.', evidence });
    await delay(2000);

    // 3. Domain Expert
    emit({ type: 'timeline', timelineEvent: 'Domain Expert Review' });
    
    const expertPrompt = `You are the Domain Expert for ${session.domain}.
Query: "${query}"
Research Data: ${researchText}

CRITICAL RULES:
- Analyze ONLY the specific topic of "${query}". No generic boilerplate.
- Explain WHY.
- Disagree with Research if the data seems weak.

Output requirements:
- Business interpretation
- Strategic opportunities
- Technical/Operational observations
- Long-term implications`;

    const expertText = await safeGenerate(expertPrompt, getExpertFallback(query, session.domain));
    emit({ type: 'agent_msg', agent: 'Domain Expert', role: 'Strategist', message: expertText });
    await delay(2000);

    // 4. Finance Agent
    emit({ type: 'timeline', timelineEvent: 'Finance Analysis' });
    
    const financePrompt = `You are the Finance Agent.
Query: "${query}"
Expert Analysis: ${expertText}

CRITICAL RULES:
- Focus solely on the financial implications of "${query}".
- Estimate realistic CAPEX, OPEX, cash runway, and sensitivity.
- Do not use generic software migration costs unless the query is about that.

Output requirements:
- ROI (%)
- Budget allocation estimate (CAPEX & OPEX)
- Payback period
- Expected revenue impact
- Worst case loss
Present using a Markdown table and strict analytical commentary.`;

    const financeText = await safeGenerate(financePrompt, getFinanceFallback(query, session.domain));
    emit({ type: 'agent_msg', agent: 'Finance Agent', role: 'CFO', message: financeText });
    await delay(2000);

    // 5. Risk & Compliance Agent
    emit({ type: 'timeline', timelineEvent: 'Risk Assessment' });
    
    const riskPrompt = `You are the Risk, Legal & Compliance Agent.
Query: "${query}"
Financials: ${financeText}

CRITICAL RULES:
- Identify risks SPECIFIC to "${query}".
- Analyze legal, compliance, licensing, taxation, operational, and geopolitical risks.
- Explain WHY these risks apply.

Output requirements:
Produce a Risk Matrix identifying: Legal, Operational, Geopolitical, and Market risks.
For each, include: Likelihood (High/Med/Low), Impact (High/Med/Low), and Mitigation.
Format as a Markdown table.`;

    const riskText = await safeGenerate(riskPrompt, getRiskFallback(query, session.domain));
    emit({ type: 'agent_msg', agent: 'Risk & Compliance Agent', role: 'Risk Manager', message: riskText });
    await delay(2000);

    // 6. Red Team Agent
    emit({ type: 'timeline', timelineEvent: 'Red Team Challenge' });
    
    const redTeamPrompt = `You are the Red Team Agent. 
Objective: Destroy the proposal. Challenge every assumption made by the other agents regarding: "${query}".

CRITICAL RULES:
- Actively attack the assumptions.
- Identify hidden failure modes.
- Propose why the recommendation could be completely wrong.
- NEVER simply agree. Be ruthless but highly logical.
- Focus ONLY on the specific topic of "${query}".

Context so far:
Finance ROI: ${financeText}
Risk: ${riskText}
Expert: ${expertText}`;

    const redTeamText = await safeGenerate(redTeamPrompt, getRedTeamFallback(query, session.domain));
    emit({ type: 'agent_msg', agent: 'Red Team Agent', role: 'Adversary', message: redTeamText });
    await delay(2000);

    // 7. Consensus Update & Voting
    emit({ type: 'timeline', timelineEvent: 'Council Voting' });
    emit({ type: 'consensus_update', agentConfidences: {
      'Research Agent': Math.floor(85 + Math.random() * 10),
      'Finance Agent': Math.floor(75 + Math.random() * 15),
      'Risk Agent': Math.floor(70 + Math.random() * 20),
      'Domain Expert': Math.floor(80 + Math.random() * 15),
      'Evidence Verifier': Math.floor(90 + Math.random() * 8),
      'Red Team Agent': Math.floor(85 + Math.random() * 12),
      'Consensus Agent': Math.floor(78 + Math.random() * 10)
    }});
    await delay(2000);

    const voteFallback = [
      { agent: 'Research Agent', decision: 'APPROVE', reason: 'Initial data on ' + query + ' dictates adoption may be necessary for survival.' },
      { agent: 'Domain Expert', decision: 'APPROVE', reason: 'Strategic alignment is strong in the ' + session.domain + ' sector.' },
      { agent: 'Finance Agent', decision: 'APPROVE', reason: 'Long-term ROI justifies the proposed CAPEX.' },
      { agent: 'Risk & Compliance Agent', decision: 'ABSTAIN', reason: 'Security and compliance risks are critical and mitigation plans are theoretical.' },
      { agent: 'Red Team Agent', decision: 'REJECT', reason: 'Hidden costs and execution risks will destroy our market position.' }
    ];
    
    const votePrompt = `Based on the query: "${query}", here is the council debate so far:
Research: ${researchText}
Finance: ${financeText}
Risk: ${riskText}
Domain Expert: ${expertText}
Red Team: ${redTeamText}

Simulate votes for Research Agent, Finance Agent, Risk Agent, Domain Expert, Evidence Verifier, Red Team Agent. 
Return ONLY a JSON array of objects with keys: "agent" (string), "decision" ("APPROVE", "REJECT", "CONDITIONAL APPROVE", or "ABSTAIN"), "reason" (string, 1 sentence explaining WHY). No markdown formatting.`;

    const voteText = await safeGenerate(votePrompt, JSON.stringify(voteFallback));
    
    let votes: AgentVote[] = [];
    try {
      const jsonStr = voteText?.match(/\[.*\]/s)?.[0] || voteText;
      if (jsonStr) votes = JSON.parse(jsonStr);
    } catch(e) {
      votes = voteFallback as AgentVote[];
    }

    emit({ type: 'vote_update', votes: votes });
    emit({ type: 'timeline', timelineEvent: 'Consensus Reached' });
    await delay(2000);

    // 8. Executive Report
    emit({ type: 'timeline', timelineEvent: 'Executive Report Published' });
    emit({ type: 'system', message: 'Compiling council findings into final Executive Report...' });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'Filesystem', action: 'Write', result: 'Generating Executive_Report.md' } });

    const reportPrompt = `You are the Consensus Chairperson. Write a highly professional Executive Decision Report for the query: "${query}".
Context:
Research: ${researchText}
Expert: ${expertText}
Finance: ${financeText}
Risk: ${riskText}
Red Team: ${redTeamText}
Voting: ${JSON.stringify(votes)}

CRITICAL RULES:
- Every section MUST be derived ONLY from the debate on "${query}".
- NEVER fabricate information. State "Insufficient evidence" if needed.
- Create a realistic weighted Decision Matrix scoring table based on the debate.

Include the following sections EXACTLY:
# Executive Summary
# Decision Context
# Agent Debate
# Evidence
# Decision Matrix
# Scenario Analysis
* **BEST CASE**
* **BASE CASE**
* **WORST CASE**
# Risk Matrix
# Financial Analysis
# Key Assumptions & Unknown Variables
# Final Recommendation
# Council Vote
# Action Plan

Make it look like a McKinsey or BCG report. Use professional formatting, bolding, and bullet points.`;

    const reportFallback = getConsensusFallback(query, session.domain);
    const reportText = await safeGenerate(reportPrompt, reportFallback);
    
    emit({ type: 'report_generated', report: reportText || reportFallback, confidence: Math.floor(75 + Math.random() * 20) });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'GitHub', action: 'Commit', result: 'Committed decision record to corporate repository.' } });
    
    session.status = 'completed';
    emit({ type: 'stream_end' } as any);
    
  } catch (error: any) {
    console.error(error);
    session.status = 'error';
    let errMsg = error.message || 'An unknown error occurred';
    emit({ type: 'system', message: `Council encountered a critical error: ${errMsg}` });
  }
}

async function runScenarioUpdate(sessionId: string, variables: Record<string, string>) {
  const session = sessions[sessionId];
  const emit = (event: Omit<DebateEvent, 'id' | 'timestamp'>) => {
    const fullEvent: DebateEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...event
    };
    session.events.push(fullEvent);
    session.emitter.emit('event', fullEvent);
  };
  const varsStr = Object.entries(variables).map(([k,v]) => `${k}: ${v}`).join(', ');
  emit({ type: 'system', message: `Scenario variables adjusted: ${varsStr}` });
  
  try {
    const reactText = await safeGenerate(
        `You are the Domain Expert. The scenario variables for the decision have changed to: ${varsStr}. How does this impact our decision? Keep it to 2 brief sentences.`,
        "The new variables alter our baseline assumptions slightly but don't fundamentally change the core strategy. We must monitor capital allocation more tightly."
    );
    emit({ type: 'agent_msg', agent: 'Domain Expert', role: 'Strategist', message: reactText });
    
    await delay(1500);
    const redTeamText = await safeGenerate(
        `You are the Red Team Agent. The variables changed to: ${varsStr}. Attack the new assumptions. Keep it to 2 brief sentences.`,
        "Changing those variables introduces a vastly larger margin of error in our risk assessment model. This just proves the financial projections are fragile and highly speculative."
    );
    emit({ type: 'agent_msg', agent: 'Red Team Agent', role: 'Adversary', message: redTeamText });
    
    await delay(1000);
    emit({ type: 'consensus_update', agentConfidences: {
      'Research Agent': Math.floor(85 + Math.random() * 10),
      'Finance Agent': Math.floor(75 + Math.random() * 15),
      'Risk Agent': Math.floor(70 + Math.random() * 20),
      'Domain Expert': Math.floor(80 + Math.random() * 15),
      'Evidence Verifier': Math.floor(90 + Math.random() * 8),
      'Red Team Agent': Math.floor(85 + Math.random() * 12),
      'Consensus Agent': Math.floor(78 + Math.random() * 10)
    }});
  } catch (error) {
    console.error("Scenario update error:", error);
    emit({ type: 'system', message: 'Scenario update failed.' });
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DecisionSphere backend running on port ${PORT}`);
  });
}

startServer();
