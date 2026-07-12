'use server';
import { timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSession, deleteSession } from './session';

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
// Credential validation
// ---------------------------------------------------------------------------

/**
 * Compare two strings using constant-time comparison to prevent timing attacks.
 * Handles strings of different lengths without leaking length information.
 */
function safeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  // Always run a comparison of equal length so timing is consistent.
  // If lengths differ, run a dummy comparison before returning false.
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

  if (!safeStringEqual(username, adminUsername)) {
    // Run bcrypt anyway to prevent timing attacks that could reveal a valid username.
    await bcrypt.compare(password, adminPasswordHash);
    return false;
  }

  return bcrypt.compare(password, adminPasswordHash);
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
