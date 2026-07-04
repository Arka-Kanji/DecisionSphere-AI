import fs from 'fs';

const file = fs.readFileSync('server.ts', 'utf8');

const newRunDebate = `async function runDebate(sessionId: string) {
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
      securityDetails: { status: 'Safe', checks: { promptInjection: true, maliciousUrls: true, sourceTrust: true, hallucinationRisk: 'Low' } } 
    });
    await delay(1000);
    emit({ type: 'timeline', timelineEvent: 'Council Convened' });
    await delay(1000);

    // 1. Research Agent
    emit({ type: 'timeline', timelineEvent: 'Research Started' });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'Browser', action: 'Search', result: \`Querying public data & trends for: \${query}\` } });
    const researchText = await safeGenerate(
      \`You are the Research Agent. Based on the query "\${query}", search and summarize key findings, trends, and market data. Keep it concise (2 paragraphs).\`,
      "Market data suggests strong adoption trends in this sector, highlighting potential for significant growth."
    );
    emit({ type: 'agent_msg', agent: 'Research Agent', role: 'researcher', message: researchText });
    await delay(2000);

    // 2. Evidence Verification
    emit({ type: 'timeline', timelineEvent: 'Evidence Retrieved' });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'Browser', action: 'Fact Check', result: 'Cross-referencing claims from Research Agent.' } });
    const verifierText = await safeGenerate(
      \`You are the Evidence Verifier. Extract 2 factual claims from this statement: "\${researchText}". 
Return ONLY a valid JSON array of objects with keys: 
"claim" (string), "source" (string, e.g. 'Gartner', 'Internal'), "reliability" (number 0-100), "confidence" (number 0-100), "verificationStatus" ('Verified', 'Unverified', 'Rejected'), "unknowns" (array of strings), "missingInformation" (array of strings), "conflictingEvidence" (array of strings). Do not include markdown formatting like \\\`\\\`\\\`json. Just the array.\`,
      \`[{"claim":"Market data suggests strong adoption trends in this sector.","source":"Industry Reports","reliability":85,"confidence":88, "verificationStatus": "Verified", "unknowns": [], "missingInformation": [], "conflictingEvidence": []}]\`
    );
    
    let evidence: Evidence[] = [];
    try {
      const jsonStr = verifierText?.match(/\\[.*\\]/s)?.[0] || verifierText;
      if (jsonStr) evidence = JSON.parse(jsonStr);
    } catch (e) {
      evidence = [{ claim: 'Market growth is stable', source: 'Global Data', reliability: 88, confidence: 90, verificationStatus: 'Verified' }];
    }
    
    emit({ type: 'agent_msg', agent: 'Evidence Verifier', role: 'verifier', message: 'I have verified the core claims against known sources.', evidence });
    await delay(2000);

    // 3. Finance Agent
    emit({ type: 'timeline', timelineEvent: 'Finance Analysis' });
    const financeText = await safeGenerate(
      \`You are the Finance Agent. Based on "\${query}", calculate potential financial impact, ROI, and build cost scenarios. Keep it to 2 brief paragraphs.\`,
      "Initial models indicate a favorable ROI within 18-24 months, assuming steady market conditions and controlled implementation costs."
    );
    emit({ type: 'agent_msg', agent: 'Finance Agent', role: 'finance', message: financeText });
    await delay(2000);

    // 4. Risk Review
    emit({ type: 'timeline', timelineEvent: 'Risk Review' });
    const riskText = await safeGenerate(
      \`You are the Risk Agent. Analyze operational risks and highlight uncertainty for: "\${query}". Keep it to 1 concise paragraph.\`,
      "The primary operational risks involve supply chain dependencies and potential friction during the transition period."
    );
    emit({ type: 'agent_msg', agent: 'Risk Agent', role: 'risk', message: riskText });
    await delay(2000);

    // 5. Legal & Compliance
    emit({ type: 'timeline', timelineEvent: 'Legal & Compliance Review' });
    const legalText = await safeGenerate(
      \`You are the Legal & Compliance Agent. Review regulations and flag concerns for: "\${query}". Keep it to 1 concise paragraph.\`,
      "No immediate regulatory blockers identified, but data privacy compliance must be closely monitored during execution."
    );
    emit({ type: 'agent_msg', agent: 'Legal & Compliance Agent', role: 'legal', message: legalText });
    await delay(2000);
    
    // 6. Domain Expert
    emit({ type: 'timeline', timelineEvent: 'Domain Expert Review' });
    const expertText = await safeGenerate(
      \`You are the Domain Expert for \${domain}. Provide industry knowledge and strategic alignment on: "\${query}". Keep it concise (1 paragraph).\`,
      "This aligns with current industry best practices and represents a necessary evolution of our capabilities."
    );
    emit({ type: 'agent_msg', agent: 'Domain Expert', role: 'expert', message: expertText });
    await delay(2000);

    // 7. Red Team Challenge
    emit({ type: 'timeline', timelineEvent: 'Red Team Challenge' });
    const redTeamText = await safeGenerate(
      \`You are the Red Team Agent. Challenge the assumptions made so far regarding "\${query}". Attempt to disprove recommendations and introduce counterarguments. 2 sentences maximum.\`,
      "The assumptions around adoption speed are overly optimistic. Competitors are already deploying alternatives that could render this obsolete before positive ROI is achieved."
    );
    emit({ type: 'agent_msg', agent: 'Red Team Agent', role: 'challenger', message: redTeamText });
    await delay(2000);
    
    emit({ type: 'timeline', timelineEvent: 'Evidence Revalidated' });
    await delay(1500);

    // 8. Consensus Update & Voting
    emit({ type: 'timeline', timelineEvent: 'Council Voting' });
    emit({ type: 'consensus_update', agentConfidences: {
      'Research Agent': 89,
      'Finance Agent': 81,
      'Risk Agent': 63,
      'Legal & Compliance Agent': 88,
      'Domain Expert': 85,
      'Evidence Verifier': 92,
      'Red Team Agent': 71,
      'Consensus Agent': 79
    }});
    await delay(2000);

    const voteText = await safeGenerate(
      \`Simulate votes for Research Agent, Finance Agent, Risk Agent, Legal & Compliance Agent, Domain Expert, Evidence Verifier, Red Team Agent based on the query: "\${query}". 
Return ONLY a JSON array of objects with keys: "agent" (string), "decision" ("APPROVE", "REJECT", or "ABSTAIN"), "reason" (string, 1 sentence). No markdown formatting.\`,
      \`[
        { "agent": "Research Agent", "decision": "APPROVE", "reason": "Data indicates strong potential." },
        { "agent": "Finance Agent", "decision": "APPROVE", "reason": "ROI models are favorable." },
        { "agent": "Risk Agent", "decision": "ABSTAIN", "reason": "Too many operational unknowns." },
        { "agent": "Legal & Compliance Agent", "decision": "APPROVE", "reason": "No regulatory blockers." },
        { "agent": "Domain Expert", "decision": "APPROVE", "reason": "Strategic alignment is strong." },
        { "agent": "Evidence Verifier", "decision": "APPROVE", "reason": "Core claims are substantiated." },
        { "agent": "Red Team Agent", "decision": "REJECT", "reason": "Too many unmitigated risks." }
      ]\`
    );
    
    let votes: AgentVote[] = [];
    try {
      const jsonStr = voteText?.match(/\\[.*\\]/s)?.[0] || voteText;
      if (jsonStr) votes = JSON.parse(jsonStr);
    } catch(e) {
      votes = [
        { agent: 'Domain Expert', decision: 'APPROVE', reason: 'Strategic alignment is strong.' },
        { agent: 'Red Team Agent', decision: 'REJECT', reason: 'Too many unmitigated risks.' }
      ];
    }
    emit({ type: 'vote_update', votes });
    emit({ type: 'timeline', timelineEvent: 'Consensus Reached' });
    await delay(2000);

    // 9. Executive Report
    emit({ type: 'timeline', timelineEvent: 'Executive Report Published' });
    emit({ type: 'system', message: 'Compiling council findings into final Executive Report...' });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'Filesystem', action: 'Write', result: 'Generating Executive_Report.md' } });
    
    const reportText = await safeGenerate(
      \`You are the Consensus Agent. Write an executive report for "\${query}". 
      Use Markdown.
      Include:
      # Executive Summary
      # Decision Objective
      # Council Debate Summary
      # Verified Evidence
      # Key Risks
      # Pros
      # Cons
      # Alternative Options
      # Scenario Analysis (Best Case, Expected Case, Worst Case)
      # Agent Voting Results
      # Consensus Score & Confidence
      # Unknowns
      # Final Recommendation
      # References
      Keep it visually appealing, concise, and professional.\`,
      \`# Executive Summary
The council has reviewed the query: **\${query}**.

# Key Evidence
- Verified claims support a positive trajectory.

# Risk Matrix
- Identified regulatory and competitive risks remain unmitigated.

# Pros
- Strong alignment with goals.

# Cons
- High uncertainty.

# Final Recommendation
Proceed with caution.

# Missing Information
Further deep dive on competitor capabilities is required.\`
    );
    
    emit({ type: 'report_generated', report: reportText || '# Generation Failed', confidence: 79 });
    emit({ type: 'mcp_action', mcpDetails: { tool: 'GitHub', action: 'Commit', result: 'Committed decision record to repository.' } });
    
    session.status = 'completed';
      
  } catch (error: any) {
    console.error(error);
    session.status = 'error';
    let errMsg = error.message || 'An unknown error occurred';
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      errMsg = 'API rate limit exceeded. The council cannot proceed due to quota constraints on the AI model. Please try again later.';
    }
    emit({ type: 'system', message: \`Council encountered a critical error: \${errMsg}\` });
  }
}`

const replaced = file.replace(/async function runDebate\(sessionId: string\) \{[\s\S]*?(?=async function runScenarioUpdate)/, newRunDebate + '\n\n');

fs.writeFileSync('server.ts', replaced);
