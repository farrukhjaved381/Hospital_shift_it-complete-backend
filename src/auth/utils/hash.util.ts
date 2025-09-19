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
  // Detect bcrypt vs argon2 by prefix to support legacy bcrypt hashes from seed
  // bcrypt hashes start with $2a$, $2b$, or $2y$
  const isBcrypt = typeof hashed === 'string' && /^\$2[aby]\$/.test(hashed);
  const isArgon2 = typeof hashed === 'string' && /^\$argon2/.test(hashed);

  try {
    if (isArgon2 && argon2) {
      return await argon2.verify(hashed, plain);
    }
    if (isBcrypt) {
      return await bcrypt.compare(plain, hashed);
    }
    // Fallbacks: prefer argon2 when available, else bcrypt
    if (argon2) {
      return await argon2.verify(hashed, plain);
    }
    return await bcrypt.compare(plain, hashed);
  } catch (_) {
    // In case of algorithm mismatch errors, try the other algorithm once
    try {
      if (argon2) {
        return await argon2.verify(hashed, plain);
      }
      return await bcrypt.compare(plain, hashed);
    } catch {
      return false;
    }
  }
}
