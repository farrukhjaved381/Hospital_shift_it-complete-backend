// Lightweight hashing utility that prefers argon2id if available, falls back to bcryptjs
// No hard dependency on argon2 to keep build green without network install

let argon2: any | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  argon2 = require('argon2');
} catch (_) {
  argon2 = null;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');

export async function hashString(plain: string): Promise<string> {
  if (argon2) {
    // argon2id is default; tune parameters as needed later
    return argon2.hash(plain, { type: argon2.argon2id });
  }
  return bcrypt.hash(plain, 12);
}

export async function verifyHash(plain: string, hashed: string): Promise<boolean> {
  if (argon2) {
    return argon2.verify(hashed, plain);
  }
  return bcrypt.compare(plain, hashed);
}

