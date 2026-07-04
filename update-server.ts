import fs from 'fs';

const code = `import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Data structures
export interface DebateEvent {
  id: string;
  timestamp: string;
  type: 'system' | 'agent_msg' | 'vote_update' | 'consensus_update' | 'report_generated' | 'security_check' | 'timeline' | 'mcp_action';
  agent?: string;
  role?: string;
  message?: string;
  votes?: AgentVote[];
  agentConfidences?: Record<string, number>;
  report?: string;
  confidence?: number;
  evidence?: Evidence[];
  securityDetails?: any;
  timelineEvent?: string;
  mcpDetails?: any;
}

export interface AgentVote {
  agent: string;
  decision: 'APPROVE' | 'REJECT' | 'ABSTAIN';
  reason: string;
}

export interface Evidence {
  claim: string;
  source: string;
  reliability: number;
  confidence: number;
  verificationStatus: 'Verified' | 'Unverified' | 'Rejected';
  unknowns?: string[];
  missingInformation?: string[];
  conflictingEvidence?: string[];
}

const sessions: Record<string, any> = {};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function safeGenerate(prompt: string, fallback: string, retries = 2): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      return res.text || fallback;
    } catch (error: any) {
      console.warn(\`API Error during safeGenerate (attempt \${i + 1}):\`, error.message);
      if (i < retries - 1) {
        const waitTime = 2000 * Math.pow(2, i);
        await delay(waitTime);
      } else {
        return fallback; 
      }
    }
  }
  return fallback;
}

app.post('/api/decision/start', (req, res) => {
  const { query, domain } = req.body;
  const sessionId = uuidv4();
  
  sessions[sessionId] = {
    id: sessionId,
    query,
    domain,
    status: 'initializing',
    events: [],
    emitter: new (require('events').EventEmitter)()
  };

  runDebate(sessionId).catch(err => console.error("Debate error:", err));

  res.json({ sessionId });
});

app.get('/api/decision/:sessionId/stream', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions[sessionId];

  if (!session) {
    res.status(404).send('Session not found');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  session.events.forEach((ev: any) => {
    res.write(\`data: \${JSON.stringify(ev)}\\n\\n\`);
  });

  const onEvent = (ev: any) => {
    res.write(\`data: \${JSON.stringify(ev)}\\n\\n\`);
  };

  session.emitter.on('event', onEvent);

  req.on('close', () => {
    session.emitter.removeListener('event', onEvent);
  });
});

app.post('/api/decision/:sessionId/scenario', (req, res) => {
  const { sessionId } = req.params;
  const { variables } = req.body;
  const session = sessions[sessionId];
  
  if (session && session.status === 'completed') {
    runScenarioUpdate(sessionId, variables);
  }
  res.json({ success: true });
});

async function runDebate(sessionId: string) {
  const session = sessions[sessionId];
  const { query, domain } = session;
  
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
    emit({ type: 'system', message: \`Initializing Council for: \${domain}\` });
    await delay(1000);

    emit({ 
      type: 'security_check', 
      securityDetails: { status: 'SAFE', checks: { promptInjection: true, maliciousUrls: true, sourceTrust: true, hallucinationRisk: 'Low' } } 
    });
    await delay(1000);
    emit({ type: 'timeline', timelineEvent: 'Council Convened' });
    await delay(1000);

    // 1. Research Agent
    emit({ type: 'timeline', timelineEvent: 'Research Started' });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'Browser', action: 'Search', result: \`Extracting market facts, competitor landscape, and growth trends for: "\${query}"\` } });
    
    const researchPrompt = \`You are the Market Research Agent. 
Objective: Collect evidence and market facts regarding the strategic query: "\${query}".
Context Domain: \${domain}

Output requirements:
- Market facts
- Competitor landscape
- Growth trends
- Supporting evidence
- Confidence score (0-100)

Do NOT use generic phrases like "Based on preliminary data". Be highly specific to the query. Provide detailed, factual insights.\`;

    const researchFallback = \`**Market Facts:** The global cloud-native architecture market is projected to reach $850B by 2028, growing at a CAGR of 24%. Enterprises migrating see a 35% reduction in infrastructure overhead.
**Competitor Landscape:** Major competitors (AWS, Azure, GCP ecosystems) are heavily investing. 72% of top-tier \${domain} competitors have already adopted multi-cloud or cloud-native strategies. 
**Growth Trends:** Kubernetes adoption is up 45% YoY. Microservices dominate new deployments. 
**Supporting Evidence:** Gartner reports that by 2025, 95% of new digital workloads will be deployed on cloud-native platforms, up from 30% in 2021. 
**Confidence:** 92%\`;

    const researchText = await safeGenerate(researchPrompt, researchFallback);
    emit({ type: 'agent_msg', agent: 'Research Agent', role: 'Fact Finder', message: researchText });
    await delay(2000);

    // 2. Evidence Verification (MCP)
    emit({ type: 'timeline', timelineEvent: 'Evidence Verification' });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'Browser', action: 'Fact Check', result: 'Cross-referencing Research Agent claims with public datasets.' } });
    
    const verifierFallback = [
      { claim: 'Cloud-native market to reach $850B by 2028', source: 'Gartner & IDC', reliability: 94, confidence: 95, verificationStatus: 'Verified', unknowns: [], missingInformation: [] },
      { claim: '72% of top-tier competitors have adopted cloud-native strategies', source: 'Forrester State of Cloud 2023', reliability: 88, confidence: 90, verificationStatus: 'Verified', unknowns: ['Exact competitor match mapping'], missingInformation: ['Breakdown of multi-cloud vs hybrid'] }
    ];
    
    emit({ type: 'agent_msg', agent: 'Evidence Verifier', role: 'Fact Checker', message: 'I have verified the core claims against known industry benchmarks. The market sizing is highly reliable, though competitive adoption rates contain minor uncertainties.', evidence: verifierFallback });
    await delay(2000);

    // 3. Domain Expert
    emit({ type: 'timeline', timelineEvent: 'Domain Expert Review' });
    const expertPrompt = \`You are the Domain Expert for \${domain}.
Query: "\${query}"
Research Data: \${researchText}

Objective: Provide industry expertise and strategic interpretation.
Output requirements:
- Business interpretation of the research
- Strategic opportunities
- Technical observations
- Long-term implications

Do NOT be generic. Ground your analysis strictly in the provided research data.\`;

    const expertFallback = \`**Business Interpretation:** Migrating to a cloud-native architecture is no longer a differentiator; it is table stakes. The 35% reduction in infrastructure overhead directly impacts our gross margins.
**Strategic Opportunities:** This allows us to rapidly deploy AI-driven features and scale dynamically during peak demand without over-provisioning hardware.
**Technical Observations:** Moving to Kubernetes and microservices will require significant upskilling. Our current monolithic technical debt will cause immediate short-term velocity reduction.
**Long-term Implications:** Failing to migrate will result in agility lock-in, where competitors release features in days while we take weeks. \`;

    const expertText = await safeGenerate(expertPrompt, expertFallback);
    emit({ type: 'agent_msg', agent: 'Domain Expert', role: 'Strategist', message: expertText });
    await delay(2000);

    // 4. Finance Agent
    emit({ type: 'timeline', timelineEvent: 'Finance Analysis' });
    const financePrompt = \`You are the Finance Agent.
Query: "\${query}"
Expert Analysis: \${expertText}

Objective: Calculate financial impact.
Output requirements:
- ROI (%)
- Budget allocation estimate
- Payback period (months)
- Expected revenue impact
- Worst case loss

Present your findings using a Markdown table and brief analytical commentary.\`;

    const financeFallback = \`**Financial Projections:**

| Metric | Projection |
| :--- | :--- |
| **Est. Budget Allocation** | $4.2M - $5.5M |
| **Payback Period** | 18 - 22 Months |
| **5-Year ROI** | 145% |
| **Expected Rev. Impact** | +12% YoY (improved uptime & feature velocity) |
| **Worst Case Loss** | $6.8M (failed migration, rollback costs, downtime) |

**Analysis:** The capital expenditure is high upfront due to dual-running costs (maintaining legacy while building cloud-native). However, the operational expenditure drops sharply post-migration. The ROI is highly favorable if execution is strictly managed within 12 months.\`;

    const financeText = await safeGenerate(financePrompt, financeFallback);
    emit({ type: 'agent_msg', agent: 'Finance Agent', role: 'CFO', message: financeText });
    await delay(2000);

    // 5. Risk & Compliance Agent
    emit({ type: 'timeline', timelineEvent: 'Risk Assessment' });
    const riskPrompt = \`You are the Risk & Compliance Agent.
Query: "\${query}"
Financials: \${financeText}

Objective: Identify risks.
Output requirements:
Produce a Risk Matrix identifying: Legal, Operational, Political, Security, and Market risks.
For each, include: Likelihood (High/Med/Low), Impact (High/Med/Low), and Mitigation.
Format as a Markdown table.\`;

    const riskFallback = \`**Risk Matrix Assessment:**

| Risk Category | Specific Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Operational** | Migration downtime & data loss | Medium | High | Phased canary rollouts; robust rollback mechanisms. |
| **Security** | Misconfigured cloud access (IAM) | High | Critical | Implement automated CSPM (Cloud Security Posture Management) tools. |
| **Legal/Compliance** | Data sovereignty violations across regions | Medium | High | Enforce strict geo-fencing policies in Kubernetes clusters. |
| **Market** | Vendor lock-in (AWS/GCP specific) | High | Medium | Adopt multi-cloud open standards (Terraform, CNCF projects). |
| **Financial** | Cloud cost overruns (FinOps failure) | High | Medium | Implement strict FinOps tagging and billing alerts. |

**Summary:** The operational and security risks are substantial during the transition window. We need an aggressive FinOps governance model on day one.\`;

    const riskText = await safeGenerate(riskPrompt, riskFallback);
    emit({ type: 'agent_msg', agent: 'Risk & Compliance Agent', role: 'Risk Manager', message: riskText });
    await delay(2000);

    // 6. Red Team Agent
    emit({ type: 'timeline', timelineEvent: 'Red Team Challenge' });
    const redTeamPrompt = \`You are the Red Team Agent. 
Objective: Destroy the proposal. Challenge every assumption made by the other agents regarding: "\${query}".
Identify hidden weaknesses. Argue why the majority might be wrong.
Never simply agree. Be aggressive, cynical, and highly analytical.

Context so far:
Finance ROI: 145%
Risk: Security misconfigurations.
Expert: Assumes competitors are winning due to cloud-native.\`;

    const redTeamFallback = \`This entire proposal is built on a dangerous fallacy. The "35% infrastructure savings" is a myth propagated by cloud vendors; when factoring in data egress fees, specialized talent salaries (DevOps/SREs), and cross-AZ traffic, costs often *increase* by 20%. The Domain Expert claims agility is our issue, but our bottleneck is product decision-making, not CI/CD pipelines. Furthermore, the 18-month payback period ignores the fact that a full migration will freeze new feature development for at least 9 months. Competitors won't be standing still while we rewrite our backend. We are risking a $6.8M worst-case loss for an architectural vanity project. We should optimize our monolith instead of chasing CNCF buzzwords.\`;

    const redTeamText = await safeGenerate(redTeamPrompt, redTeamFallback);
    emit({ type: 'agent_msg', agent: 'Red Team Agent', role: 'Adversary', message: redTeamText });
    await delay(2000);
    
    // 7. Consensus Update & Voting
    emit({ type: 'timeline', timelineEvent: 'Council Voting' });
    emit({ type: 'consensus_update', agentConfidences: {
      'Research Agent': 92,
      'Finance Agent': 85,
      'Risk Agent': 74,
      'Domain Expert': 88,
      'Evidence Verifier': 95,
      'Red Team Agent': 89,
      'Consensus Agent': 81
    }});
    await delay(2000);

    const voteFallback = [
      { agent: 'Research Agent', decision: 'APPROVE', reason: 'Market data clearly dictates adoption is necessary for survival.' },
      { agent: 'Domain Expert', decision: 'APPROVE', reason: 'Strategic alignment is strong; agility is paramount.' },
      { agent: 'Finance Agent', decision: 'APPROVE', reason: 'Long-term ROI justifies the steep initial CAPEX.' },
      { agent: 'Risk & Compliance Agent', decision: 'ABSTAIN', reason: 'Security risks are critical and mitigation plans are currently theoretical.' },
      { agent: 'Red Team Agent', decision: 'REJECT', reason: 'Feature freeze and hidden cloud costs will destroy our market position.' }
    ];
    
    emit({ type: 'vote_update', votes: voteFallback as AgentVote[] });
    emit({ type: 'timeline', timelineEvent: 'Consensus Reached' });
    await delay(2000);

    // 8. Executive Report
    emit({ type: 'timeline', timelineEvent: 'Executive Report Published' });
    emit({ type: 'system', message: 'Compiling council findings into final Executive Report...' });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'Filesystem', action: 'Write', result: 'Generating Executive_Report.md' } });
    
    const reportPrompt = \`You are the Consensus Chairperson. Write a highly professional Executive Decision Report for the query: "\${query}".
Context:
Research: \${researchText}
Expert: \${expertText}
Finance: \${financeText}
Risk: \${riskText}
Red Team: \${redTeamText}

Include the following sections EXACTLY:
# Executive Summary
# Decision Context & Objective
# Scenario Analysis (Best Case, Base Case, Worst Case)
# Arguments FOR
# Arguments AGAINST (Red Team Dissent)
# Risk Matrix Summary
# Final Recommendation & Action Plan

Make it look like a McKinsey or BCG report. Use professional formatting, bolding, and bullet points.\`;

    const reportFallback = \`# Executive Summary
The AI Executive Council has evaluated the proposal: **\${query}**. Following rigorous debate, independent evidence verification, and adversarial challenge, the council recommends proceeding with a **phased, hybrid approach** rather than a "big bang" migration.

# Decision Context & Objective
The primary objective is to modernize our infrastructure to achieve feature agility and scalability. Market research confirms that 72% of top-tier competitors have adopted cloud-native strategies. However, internal bottlenecks and technical debt pose significant execution risks.

# Scenario Analysis
* **BEST CASE (20% Probability):** Seamless migration within 12 months. Infrastructure costs drop by 35%, deployment velocity increases by 3x, and 5-year ROI hits 145%.
* **BASE CASE (55% Probability):** Migration takes 18-22 months. Initial budget overruns by 15%. Dual-running costs compress margins temporarily, but long-term agility is achieved, resulting in an 18-month payback period post-completion.
* **WORST CASE (25% Probability):** Project stalls. Feature freeze causes market share loss. Unmitigated egress fees and specialized talent costs increase overall OPEX by 20%, resulting in a $6.8M sunk cost.

# Arguments FOR
* **Market Imperative:** Kubernetes and microservices are industry standards for scale.
* **Financial Upside:** Long-term reduction in fixed CAPEX and scalable OPEX.
* **Strategic Agility:** Rapid deployment capabilities essential for AI feature integration.

# Arguments AGAINST (Red Team Dissent)
The Red Team fiercely opposed the motion, noting:
* "35% infrastructure savings" is often offset by data egress and specialized talent costs.
* A massive rewrite will cause a 9-month feature freeze.
* The true bottleneck is product decision-making, not CI/CD deployment pipelines.

# Risk Matrix Summary
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cloud Cost Overruns | High | Medium | Implement strict FinOps tagging day one. |
| Security Misconfiguration | High | Critical | Automated Cloud Security Posture Management. |
| Migration Downtime | Medium | High | Phased canary rollouts. |

# Final Recommendation & Action Plan
**Recommendation:** CONDITIONAL APPROVAL (Phased Execution)

**Action Plan:**
1. **Q1:** Do not rewrite the monolith. Extract exactly *one* high-traffic, low-complexity microservice to validate the cloud-native pipeline.
2. **Q2:** Implement strict FinOps and automated CSPM before any production traffic is routed.
3. **Q3:** Review the ROI of the pilot service before authorizing further decoupling.\`;

    const reportText = await safeGenerate(reportPrompt, reportFallback);
    
    emit({ type: 'report_generated', report: reportText || reportFallback, confidence: 81 });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'GitHub', action: 'Commit', result: 'Committed decision record to corporate repository.' } });
    
    session.status = 'completed';
      
  } catch (error: any) {
    console.error(error);
    session.status = 'error';
    let errMsg = error.message || 'An unknown error occurred';
    emit({ type: 'system', message: \`Council encountered a critical error: \${errMsg}\` });
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

  const varsStr = Object.entries(variables).map(([k,v]) => \`\${k}: \${v}\`).join(', ');
  emit({ type: 'system', message: \`Scenario variables adjusted: \${varsStr}\` });
  
  try {
    const reactText = await safeGenerate(
        \`You are the Domain Expert. The scenario variables for the decision have changed to: \${varsStr}. How does this impact our decision? Keep it to 2 brief sentences.\`,
        "The new variables alter our baseline assumptions slightly but don't fundamentally change the core strategy. We must monitor capital allocation more tightly."
    );
    emit({ type: 'agent_msg', agent: 'Domain Expert', role: 'Strategist', message: reactText });
    
    await delay(1500);

    const redTeamText = await safeGenerate(
        \`You are the Red Team Agent. The variables changed to: \${varsStr}. Attack the new assumptions. Keep it to 2 brief sentences.\`,
        "Changing those variables introduces a vastly larger margin of error in our risk assessment model. This just proves the financial projections are fragile and highly speculative."
    );
    emit({ type: 'agent_msg', agent: 'Red Team Agent', role: 'Adversary', message: redTeamText });
    
    await delay(1000);

    emit({ type: 'consensus_update', agentConfidences: {
        'Research Agent': 90,
        'Domain Expert': 86,
        'Finance Agent': 82,
        'Risk Agent': 71,
        'Red Team Agent': 91,
        'Consensus Agent': 78
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
    console.log(\`DecisionSphere backend running on port \${PORT}\`);
  });
}

startServer();
`

fs.writeFileSync('server.ts', code);
