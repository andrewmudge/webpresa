'use server';
import { timingSafeEqual, scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSession, deleteSession } from './session';

const scryptAsync = promisify(scrypt);

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const SignInSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInState =
  | { errors?: { username?: string[]; password?: string[] }; message?: string }
  | undefined;

// ---------------------------------------------------------------------------
// Password hashing — scrypt with hex output
//
// Hash format stored in ADMIN_PASSWORD_HASH:  <64-byte hex>:<16-byte hex salt>
// Example:  abc123...:<salt>
//
// Generate with (run from web/):
//   node -e "
//     const {scryptSync,randomBytes}=require('crypto');
//     const salt=randomBytes(16).toString('hex');
//     const hash=scryptSync('YOUR_PASSWORD',salt,64).toString('hex');
//     console.log(hash+':'+salt);
//   "
//
// No \$ quoting needed — output is pure hex + colon.
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${derived.toString('hex')}:${salt}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [hashHex, salt] = stored.split(':');
  if (!hashHex || !salt) return false;
  try {
    const storedBuf = Buffer.from(hashHex, 'hex');
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    if (storedBuf.length !== derived.length) return false;
    return timingSafeEqual(storedBuf, derived);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Credential validation
// ---------------------------------------------------------------------------

/**
 * Compare two strings using constant-time comparison to prevent timing attacks.
 * Handles strings of different lengths without leaking length information.
 */
function safeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf); // constant-time dummy
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

async function validateCredentials(username: string, password: string): Promise<boolean> {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminUsername || !adminPasswordHash) {
    console.error('ADMIN_USERNAME or ADMIN_PASSWORD_HASH environment variable is not set');
    return false;
  }

  // Always run the full scrypt derivation regardless of username match
  // to prevent timing-based username enumeration.
  const passwordValid = await verifyPassword(password, adminPasswordHash);
  const usernameValid = safeStringEqual(username, adminUsername);
  return usernameValid && passwordValid;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = SignInSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const valid = await validateCredentials(parsed.data.username, parsed.data.password);
  if (!valid) {
    return { message: 'Invalid username or password' };
  }

  await createSession(parsed.data.username);
  redirect('/admin/businesses');
}

export async function signOut(): Promise<void> {
  await deleteSession();
  redirect('/admin/sign-in');
}
