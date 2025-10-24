// Simple password hashing and verification
// Note: In production, use a more robust solution like Argon2 or bcrypt

export async function hashPassword(password) {
  // Simple hash for demo - use proper library in production
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt_string');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Simple JWT-like token generation (demo only)
export function generateToken(userId) {
  const payload = {
    userId,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  return btoa(JSON.stringify(payload));
}

export function verifyToken(token) {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}