export interface Evidence {
  claim: string;
  source: string;
  reliability: number;
  confidence: number;
  verificationStatus?: 'Verified' | 'Unverified' | 'Rejected';
  timestamp?: string;
  unknowns?: string[];
  missingInformation?: string[];
  conflictingEvidence?: string[];
}

export interface AgentVote {
  agent: string;
  decision: 'APPROVE' | 'REJECT' | 'ABSTAIN';
  reason: string;
}

export interface DebateEvent {
  id: string;
  type: 'system' | 'agent_msg' | 'report_generated' | 'security_check' | 'mcp_action' | 'timeline' | 'consensus_update' | 'vote_update';
  agent?: string;
  role?: string;
  message?: string;
  timestamp: string;
  report?: string;
  confidence?: number;
  evidence?: Evidence[];
  votes?: AgentVote[];
  agentConfidences?: Record<string, number>;
  mcpDetails?: {
    tool: 'Browser' | 'Filesystem' | 'GitHub';
    action: string;
    result: string;
  };
  securityDetails?: {
    status: 'Safe' | 'Warning' | 'Critical';
    checks: {
      promptInjection: boolean;
      maliciousUrls: boolean;
      sourceTrust: boolean;
      hallucinationRisk: 'Low' | 'Medium' | 'High';
    };
  };
  timelineEvent?: string;
}
