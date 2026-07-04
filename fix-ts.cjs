const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(
  /type: 'agent_msg' \| 'system' \| 'mcp_action' \| 'timeline' \| 'report_generated' \| 'security_check' \| 'consensus_update' \| 'vote_update';/,
  `type: 'agent_msg' | 'system' | 'mcp_action' | 'timeline' | 'report_generated' | 'security_check' | 'consensus_update' | 'vote_update' | 'stream_end';`
);
fs.writeFileSync('server.ts', serverCode);

let clientCode = fs.readFileSync('src/components/DebateRoom.tsx', 'utf8');
clientCode = clientCode.replace(
  /type: 'agent_msg' \| 'system' \| 'mcp_action' \| 'timeline' \| 'report_generated' \| 'security_check' \| 'consensus_update' \| 'vote_update';/,
  `type: 'agent_msg' | 'system' | 'mcp_action' | 'timeline' | 'report_generated' | 'security_check' | 'consensus_update' | 'vote_update' | 'stream_end';`
);
fs.writeFileSync('src/components/DebateRoom.tsx', clientCode);
console.log('Fixed types');
