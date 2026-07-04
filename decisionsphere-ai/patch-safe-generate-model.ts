import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(/model: 'gemini-1\.5-flash'/g, "model: 'gemini-2.5-flash'");
fs.writeFileSync('server.ts', serverCode);
