export interface DashboardUserSession {
  username: string;
  displayName: string;
  roleLabel: string;
  loggedInAt: string;
  remembered: boolean;
}

interface StoredAuthConfig {
  version: 1;
  username: string;
  displayName: string;
  roleLabel: string;
  passwordHash: string;
  isDefaultPassword: boolean;
  updatedAt: string;
}

const AUTH_CONFIG_KEY = 'piket_dashboard_auth_v1';
const SESSION_STORAGE_KEY = 'piket_dashboard_session_v1';

export const DEFAULT_LOGIN_USERNAME = 'admin';
export const DEFAULT_LOGIN_PASSWORD = 'piket2026';

function fallbackHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    'fb_' +
    (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salted = `piketkita_salt_2026::${password}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const data = new TextEncoder().encode(salted);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const bytes = Array.from(new Uint8Array(digest));
      return 'sha256_' + bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback to deterministic local hash if subtle crypto is unavailable
  }
  return fallbackHash(salted);
}

async function getDefaultAuthConfig(): Promise<StoredAuthConfig> {
  return {
    version: 1,
    username: DEFAULT_LOGIN_USERNAME,
    displayName: 'Operator Piket',
    roleLabel: 'Administrator Jadwal',
    passwordHash: await hashPassword(DEFAULT_LOGIN_PASSWORD),
    isDefaultPassword: true,
    updatedAt: new Date().toISOString(),
  };
}

export async function getAuthConfig(): Promise<StoredAuthConfig> {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredAuthConfig;
      if (parsed && parsed.version === 1 && parsed.username && parsed.passwordHash) {
        return parsed;
      }
    }
  } catch {
    // Abaikan error storage
  }
  const defaults = await getDefaultAuthConfig();
  try {
    localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(defaults));
  } catch {
    // Abaikan error kuota
  }
  return defaults;
}

export function isUsingDefaultCredentialsSync(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as StoredAuthConfig;
    return Boolean(
      parsed?.isDefaultPassword &&
        parsed?.username?.toLowerCase() === DEFAULT_LOGIN_USERNAME
    );
  } catch {
    return true;
  }
}

export function getActiveSession(): DashboardUserSession | null {
  try {
    const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as DashboardUserSession;
      if (parsed?.username) return parsed;
    }
    const localRaw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw) as DashboardUserSession;
      if (parsed?.username) return parsed;
    }
  } catch {
    // Abaikan error storage
  }
  return null;
}

function saveSession(session: DashboardUserSession) {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    const payload = JSON.stringify(session);
    if (session.remembered) {
      localStorage.setItem(SESSION_STORAGE_KEY, payload);
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, payload);
    }
  } catch {
    // Abaikan error kuota
  }
}

export function logoutSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Abaikan error
  }
}

export async function verifyLogin(
  usernameInput: string,
  passwordInput: string,
  remember: boolean
): Promise<
  | { ok: true; session: DashboardUserSession }
  | { ok: false; error: string }
> {
  const username = usernameInput.trim().toLowerCase();
  if (!username || !passwordInput) {
    return { ok: false, error: 'Masukkan username dan kata sandi terlebih dahulu.' };
  }

  const config = await getAuthConfig();
  const inputHash = await hashPassword(passwordInput);

  // Support matching against SHA-256 or fallback hash in case protocol switched between http/https
  const fallbackInputHash = fallbackHash(`piketkita_salt_2026::${passwordInput}`);
  const passwordMatches =
    inputHash === config.passwordHash ||
    fallbackInputHash === config.passwordHash ||
    (config.isDefaultPassword && passwordInput === DEFAULT_LOGIN_PASSWORD);

  if (username !== config.username.trim().toLowerCase() || !passwordMatches) {
    return {
      ok: false,
      error: 'Username atau kata sandi tidak sesuai. Periksa kembali akses Anda.',
    };
  }

  const session: DashboardUserSession = {
    username: config.username,
    displayName: config.displayName,
    roleLabel: config.roleLabel,
    loggedInAt: new Date().toISOString(),
    remembered: remember,
  };
  saveSession(session);
  return { ok: true, session };
}

export async function updateAccountCredentials(params: {
  currentPassword: string;
  newUsername: string;
  newDisplayName: string;
  newRoleLabel: string;
  newPassword?: string;
  remembered: boolean;
}): Promise<
  | { ok: true; session: DashboardUserSession }
  | { ok: false; error: string }
> {
  const config = await getAuthConfig();
  const currentHash = await hashPassword(params.currentPassword);
  const currentFallback = fallbackHash(
    `piketkita_salt_2026::${params.currentPassword}`
  );
  const currentValid =
    currentHash === config.passwordHash ||
    currentFallback === config.passwordHash ||
    (config.isDefaultPassword && params.currentPassword === DEFAULT_LOGIN_PASSWORD);

  if (!currentValid) {
    return {
      ok: false,
      error: 'Kata sandi saat ini salah. Perubahan akun dibatalkan.',
    };
  }

  const cleanUsername = params.newUsername.trim();
  const cleanDisplayName = params.newDisplayName.trim();
  const cleanRoleLabel = params.newRoleLabel.trim() || 'Administrator Jadwal';

  if (cleanUsername.length < 3) {
    return {
      ok: false,
      error: 'Username minimal 3 karakter.',
    };
  }
  if (!cleanDisplayName) {
    return {
      ok: false,
      error: 'Nama tampilan tidak boleh kosong.',
    };
  }
  if (params.newPassword && params.newPassword.length < 6) {
    return {
      ok: false,
      error: 'Kata sandi baru minimal 6 karakter.',
    };
  }

  const nextPasswordHash = params.newPassword
    ? await hashPassword(params.newPassword)
    : config.passwordHash;
  const isDefault = params.newPassword
    ? params.newPassword === DEFAULT_LOGIN_PASSWORD &&
      cleanUsername.toLowerCase() === DEFAULT_LOGIN_USERNAME
    : config.isDefaultPassword &&
      cleanUsername.toLowerCase() === DEFAULT_LOGIN_USERNAME;

  const nextConfig: StoredAuthConfig = {
    version: 1,
    username: cleanUsername,
    displayName: cleanDisplayName,
    roleLabel: cleanRoleLabel,
    passwordHash: nextPasswordHash,
    isDefaultPassword: isDefault,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(nextConfig));
  } catch {
    return {
      ok: false,
      error: 'Gagal menyimpan konfigurasi akun ke penyimpanan lokal.',
    };
  }

  const nextSession: DashboardUserSession = {
    username: nextConfig.username,
    displayName: nextConfig.displayName,
    roleLabel: nextConfig.roleLabel,
    loggedInAt: new Date().toISOString(),
    remembered: params.remembered,
  };
  saveSession(nextSession);

  return { ok: true, session: nextSession };
}

export async function resetAuthToDefault(
  remembered: boolean
): Promise<DashboardUserSession> {
  const defaults = await getDefaultAuthConfig();
  try {
    localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(defaults));
  } catch {
    // Abaikan error kuota
  }
  const session: DashboardUserSession = {
    username: defaults.username,
    displayName: defaults.displayName,
    roleLabel: defaults.roleLabel,
    loggedInAt: new Date().toISOString(),
    remembered,
  };
  saveSession(session);
  return session;
}
