const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Replace voteFallback
serverCode = serverCode.replace(
  /const voteFallback = \[\s*\{ agent: 'Research Agent'[\s\S]*?\];/g,
  `const voteFallback = [
      { agent: 'Research Agent', decision: 'APPROVE', reason: 'Initial data on ' + query + ' dictates adoption may be necessary for survival.' },
      { agent: 'Domain Expert', decision: 'APPROVE', reason: 'Strategic alignment is strong in the ' + session.domain + ' sector.' },
      { agent: 'Finance Agent', decision: 'APPROVE', reason: 'Long-term ROI justifies the proposed CAPEX.' },
      { agent: 'Risk & Compliance Agent', decision: 'ABSTAIN', reason: 'Security and compliance risks are critical and mitigation plans are theoretical.' },
      { agent: 'Red Team Agent', decision: 'REJECT', reason: 'Hidden costs and execution risks will destroy our market position.' }
    ];`
);

// Replace reportFallback
serverCode = serverCode.replace(
  /const reportFallback = `# Executive Summary[\s\S]*?`;/g,
  `const reportFallback = getConsensusFallback(query, session.domain);`
);

fs.writeFileSync('server.ts', serverCode);
console.log('Final fallbacks patched.');
