const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /# Scenario Analysis[\s\S]*?# Key Assumptions & Unknown Variables/,
  `# Scenario Analysis
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

# Key Assumptions & Unknown Variables`
);

fs.writeFileSync('server.ts', code);
console.log('Scenario format patched.');
