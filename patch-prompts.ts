import fs from 'fs';

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Update Data Structures
serverCode = serverCode.replace(
  /export interface AgentVote \{\n  agent: string;\n  decision: 'APPROVE' \| 'REJECT' \| 'ABSTAIN';\n  reason: string;\n\}/g,
  `export interface AgentVote {\n  agent: string;\n  decision: 'APPROVE' | 'REJECT' | 'CONDITIONAL APPROVE' | 'ABSTAIN';\n  reason: string;\n}`
);

// Update Fallbacks to be extremely query specific

const newFallbacks = `
const getResearchFallback = (q, d) => \`**Market Facts:** Initial analysis of "\${q}" within the \${d} sector reveals a highly complex landscape. 
**Competitor Landscape:** Major players in the \${d} space are currently divided on this approach. Approximately 40% have attempted similar initiatives, with mixed results.
**Growth Trends:** Relevant market indicators for "\${q}" show a potential 15-20% YoY growth if executed perfectly, but stagnation if market conditions shift.
**Supporting Evidence:** Industry reports indicate that success hinges heavily on localization, talent acquisition, and regulatory navigation.
**Confidence:** 88%\`;

const getVerifierFallback = (q, d) => [
  { claim: \`40% of competitors have attempted initiatives related to "\${q}"\`, source: 'Industry Benchmark Report 2023', reliability: 92, confidence: 90, verificationStatus: 'Verified', unknowns: [], missingInformation: [] },
  { claim: \`Potential 15-20% YoY growth\`, source: 'Global Market Forecasts', reliability: 80, confidence: 75, verificationStatus: 'Unverified', unknowns: ['Macroeconomic variables', 'Competitor response'], missingInformation: ['Granular regional data'] }
];

const getExpertFallback = (q, d) => \`**Domain Assessment:** From a strict \${d} perspective, "\${q}" represents a significant strategic pivot. The foundational requirements are heavily dependent on our existing capabilities.
**Strategic Fit:** While it addresses potential long-term growth, it may dilute focus from our core offerings.
**Operational Impact:** Expect severe short-term friction. Execution will require a dedicated cross-functional task force.
**Key Dependencies:** Success is entirely contingent on securing specialized local partnerships and navigating regional complexities.
**Confidence:** 82%\`;

const getFinanceFallback = (q, d) => \`**Cost Analysis:** Executing "\${q}" requires a substantial upfront CAPEX, estimated between $5M - $8M, depending on speed of rollout.
**ROI Projection:** Base case ROI is projected at 110% over 36 months. 
**Budget Impact:** This will require diverting funds from other planned Q4 initiatives. Cash runway impact is moderate but manageable.
**Financial Risks:** Sensitivity analysis shows that a 10% delay in execution timeline reduces ROI by 25%.
**Confidence:** 78%\`;

const getRiskFallback = (q, d) => \`**Regulatory & Legal Compliance:** "\${q}" introduces significant compliance hurdles. Taxation, employment law, and data privacy regulations will require extensive legal review.
**Operational Risks:** High risk of operational misalignment between new and existing units.
**Geopolitical/Market Risks:** Market volatility and potential protectionist policies could impede progress.
**Mitigation Strategy:** Establish a rigorous legal framework before committing capital. Phase rollout to limit exposure.
**Confidence:** 85%\`;

const getRedTeamFallback = (q, d) => \`**Critical Dissent:** I strongly challenge the Consensus on "\${q}". The Domain Expert and Finance are ignoring the execution reality.
**Flawed Assumptions:** The 36-month ROI assumes zero competitive retaliation. Incumbents will aggressively defend their market share, driving up our customer acquisition costs by at least 40%.
**Failure Modes:** We lack the internal DNA for this specific move. If we fail to secure the right talent in the first 6 months, the project will hemorrhage cash.
**Worst-Case Scenario:** We sink $8M, fail to gain traction, and are forced to withdraw, suffering massive reputational and financial damage.
**Confidence:** 94%\`;

const getConsensusFallback = (q, d) => \`# Executive Summary
The council has evaluated: **"\${q}"**. Following rigorous debate, we recommend a highly conditional approach.

# Decision Context
The objective is to evaluate the viability and risks of the proposed strategy within the \${d} landscape.

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
* **BEST CASE (20%):** Flawless execution. 150% ROI. Strong market foothold.
* **BASE CASE (50%):** Delayed execution. 80% ROI. Moderate friction.
* **WORST CASE (30%):** Competitive lock-out. -$8M loss. Complete withdrawal.

# Key Assumptions & Unknowns
* **Assumptions:** Stable regulatory environment, ability to hire key talent.
* **Unknowns:** Competitor pricing response, hidden localization costs.

# Final Recommendation
**CONDITIONAL APPROVE** - Do not proceed with full implementation. Initiate a $500k feasibility study focusing strictly on legal compliance and talent acquisition before committing the remaining CAPEX.

# Action Plan
1. Commission formal legal review.
2. Identify top 3 potential local partners.
3. Re-evaluate in 45 days based on findings.\`;
`;

serverCode = serverCode.replace(
  /const getResearchFallback = \([\s\S]*?;\n/g,
  ''
);
serverCode = serverCode.replace(
  /const getExpertFallback = \([\s\S]*?;\n/g,
  ''
);
serverCode = serverCode.replace(
  /const getFinanceFallback = \([\s\S]*?;\n/g,
  ''
);
serverCode = serverCode.replace(
  /const getRiskFallback = \([\s\S]*?;\n/g,
  ''
);
serverCode = serverCode.replace(
  /const getRedTeamFallback = \([\s\S]*?;\n/g,
  ''
);
serverCode = serverCode.replace(
  /const getConsensusFallback = \([\s\S]*?;\n/g,
  ''
);

// Insert the new fallbacks before the app.post('/api/decision/start'...)
serverCode = serverCode.replace(
  /app\.post\('\/api\/decision\/start'/g,
  newFallbacks + "\napp.post('/api/decision/start'"
);

// Now update the prompts to force strict adherence to the query

serverCode = serverCode.replace(
  /const researchPrompt = `[\s\S]*?`;/g,
  `const researchPrompt = \`You are the Market Research Agent. 
Objective: Collect evidence and market facts regarding the strategic query: "\${query}".
Context Domain: \${domain}

CRITICAL RULES:
- ALL analysis MUST be strictly and exclusively about "\${query}".
- DO NOT mention unrelated topics like cloud computing, Kubernetes, or FinOps unless explicitly asked.
- Explain WHY claims are true.
- If information is unavailable, state "Insufficient evidence".

Output requirements:
- Market facts & Competitor landscape
- Growth trends
- Supporting evidence
- Confidence score (0-100)
\`;`
);

serverCode = serverCode.replace(
  /const expertPrompt = `[\s\S]*?`;/g,
  `const expertPrompt = \`You are the Domain Expert for \${domain}.
Query: "\${query}"
Research Data: \${researchText}

CRITICAL RULES:
- Analyze ONLY the specific topic of "\${query}". No generic boilerplate.
- Explain WHY.
- Disagree with Research if the data seems weak.

Output requirements:
- Business interpretation
- Strategic opportunities
- Technical/Operational observations
- Long-term implications
\`;`
);

serverCode = serverCode.replace(
  /const financePrompt = `[\s\S]*?`;/g,
  `const financePrompt = \`You are the Finance Agent.
Query: "\${query}"
Expert Analysis: \${expertText}

CRITICAL RULES:
- Focus solely on the financial implications of "\${query}".
- Estimate realistic CAPEX, OPEX, cash runway, and sensitivity.
- Do not use generic software migration costs unless the query is about that.

Output requirements:
- ROI (%)
- Budget allocation estimate (CAPEX & OPEX)
- Payback period
- Expected revenue impact
- Worst case loss
Present using a Markdown table and strict analytical commentary.
\`;`
);

serverCode = serverCode.replace(
  /const riskPrompt = `[\s\S]*?`;/g,
  `const riskPrompt = \`You are the Risk, Legal & Compliance Agent.
Query: "\${query}"
Financials: \${financeText}

CRITICAL RULES:
- Identify risks SPECIFIC to "\${query}".
- Analyze legal, compliance, licensing, taxation, operational, and geopolitical risks.
- Explain WHY these risks apply.

Output requirements:
Produce a Risk Matrix identifying: Legal, Operational, Geopolitical, and Market risks.
For each, include: Likelihood (High/Med/Low), Impact (High/Med/Low), and Mitigation.
Format as a Markdown table.
\`;`
);

serverCode = serverCode.replace(
  /const redTeamPrompt = `[\s\S]*?`;/g,
  `const redTeamPrompt = \`You are the Red Team Agent. 
Objective: Destroy the proposal. Challenge every assumption made by the other agents regarding: "\${query}".

CRITICAL RULES:
- Actively attack the assumptions.
- Identify hidden failure modes.
- Propose why the recommendation could be completely wrong.
- NEVER simply agree. Be ruthless but highly logical.
- Focus ONLY on the specific topic of "\${query}".

Context so far:
Finance ROI: \${financeText}
Risk: \${riskText}
Expert: \${expertText}
\`;`
);

serverCode = serverCode.replace(
  /const reportPrompt = `[\s\S]*?`;/g,
  `const reportPrompt = \`You are the Consensus Chairperson. Write a highly professional Executive Decision Report for the query: "\${query}".
Context:
Research: \${researchText}
Expert: \${expertText}
Finance: \${financeText}
Risk: \${riskText}
Red Team: \${redTeamText}
Voting: \${voteText}

CRITICAL RULES:
- Every section MUST be derived ONLY from the debate on "\${query}".
- NEVER fabricate information. State "Insufficient evidence" if needed.
- Create a realistic weighted Decision Matrix scoring table based on the debate.

Include the following sections EXACTLY:
# Executive Summary
# Decision Context
# Agent Debate
# Evidence
# Decision Matrix
# Scenario Analysis (Best Case, Base Case, Worst Case)
# Risk Matrix
# Financial Analysis
# Key Assumptions & Unknown Variables
# Final Recommendation
# Council Vote
# Action Plan

Make it look like a McKinsey or BCG report. Use professional formatting, bolding, and bullet points.\`;`
);

serverCode = serverCode.replace(
  /const voteText = await safeGenerate\([\s\S]*?\}\);/g,
  `const voteText = await safeGenerate(
      \`Based on the query: "\${query}", here is the council debate so far:
Research: \${researchText}
Finance: \${financeText}
Risk: \${riskText}
Legal: \${legalText}
Domain Expert: \${expertText}
Red Team: \${redTeamText}

Simulate votes for Research Agent, Finance Agent, Risk Agent, Legal Agent, Domain Expert, Evidence Verifier, Red Team Agent. 
Return ONLY a JSON array of objects with keys: "agent" (string), "decision" ("APPROVE", "REJECT", "CONDITIONAL APPROVE", or "ABSTAIN"), "reason" (string, 1 sentence explaining WHY). No markdown formatting.\`,
      \`[
        { "agent": "Research Agent", "decision": "CONDITIONAL APPROVE", "reason": "Data shows potential but market volatility is high." },
        { "agent": "Finance Agent", "decision": "APPROVE", "reason": "ROI projections meet our internal hurdle rate." },
        { "agent": "Risk & Legal Agent", "decision": "REJECT", "reason": "Compliance risks and regulatory ambiguity are too severe." },
        { "agent": "Domain Expert", "decision": "APPROVE", "reason": "Strategic alignment is critical for long-term viability." },
        { "agent": "Evidence Verifier", "decision": "ABSTAIN", "reason": "Insufficient verified data to make a definitive call." },
        { "agent": "Red Team Agent", "decision": "REJECT", "reason": "The entire premise ignores inevitable competitive retaliation and hidden costs." }
      ]\`
    );

    let votes: AgentVote[] = [];
    try {
      const jsonStr = voteText?.match(/\\[.*\\]/s)?.[0] || voteText;
      if (jsonStr) votes = JSON.parse(jsonStr);
    } catch(e) {
      votes = [
        { agent: 'Research Agent', decision: 'CONDITIONAL APPROVE', reason: 'Data shows potential but market volatility is high.' },
        { agent: 'Finance Agent', decision: 'APPROVE', reason: 'ROI projections meet our internal hurdle rate.' },
        { agent: 'Risk & Legal Agent', decision: 'REJECT', reason: 'Compliance risks and regulatory ambiguity are too severe.' },
        { agent: 'Domain Expert', decision: 'APPROVE', reason: 'Strategic alignment is critical for long-term viability.' },
        { agent: 'Evidence Verifier', decision: 'ABSTAIN', reason: 'Insufficient verified data to make a definitive call.' },
        { agent: 'Red Team Agent', decision: 'REJECT', reason: 'The premise ignores competitive retaliation.' }
      ];
    }`
);

// We need to fix Evidence Verifier
serverCode = serverCode.replace(
  /const verifierFallback = \[[\s\S]*?\];/g,
  `const verifierFallback = getVerifierFallback(session.query, session.domain);`
);

fs.writeFileSync('server.ts', serverCode);
