import { SignJWT } from 'jose';
import fs from 'node:fs';

const envText = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const secretLine = envText.split('\n').find((l) => l.startsWith('SESSION_SECRET='));
const secret = secretLine.slice('SESSION_SECRET='.length).trim();

const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
const token = await new SignJWT({ sub: 'admin', expiresAt })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(new TextEncoder().encode(secret));

fs.writeFileSync('/tmp/claude-1000/-home-mudge-apps-webpresa/f8562d86-8608-4632-9ffb-7b0e3b5f9593/scratchpad/session-token.txt', token);
console.log('written');
