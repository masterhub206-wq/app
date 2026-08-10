import AsyncStorage from "@react-native-async-storage/async-storage";

export type AdminRole = "super_admin" | "support_agent";

export type AdminProfile = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const SESSION_KEY: string = "flash-earn-admin-profile";
const PUBLIC_ENV: Record<string, string | undefined> = ((globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {});
const SUPABASE_URL: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const DEMO_EMAIL: string = "demo@flashearn.app";
const DEMO_PASSWORD: string = "flash123";

type SupabaseAuthResponse = {
  access_token?: string;
  user?: {
    id?: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
  error_description?: string;
  msg?: string;
};

type AdminUserRow = {
  id?: string;
  email?: string;
  role?: string;
  display_name?: string;
  full_name?: string;
};

function isAdminRole(role: string | undefined): role is AdminRole {
  return role === "super_admin" || role === "support_agent";
}

function getDisplayName(email: string, record?: AdminUserRow): string {
  const name: string | undefined = record?.display_name ?? record?.full_name;
  if (name) {
    return name;
  }
  return email.split("@")[0]?.replace(/[._-]/g, " ") ?? "Admin";
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function signInWithSupabase(email: string, password: string): Promise<AdminProfile> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new AuthError("Supabase is not configured in this build.");
  }

  const authResponse: Response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  const authData: SupabaseAuthResponse | null = await readJson<SupabaseAuthResponse>(authResponse);

  if (!authResponse.ok || !authData?.access_token || !authData.user?.id) {
    throw new AuthError(authData?.error_description ?? authData?.msg ?? "Incorrect email or password.");
  }

  const userId: string = authData.user.id;
  const profileResponse: Response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/admin_users?select=id,email,role,display_name,full_name&id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authData.access_token}`,
      },
    },
  );
  const records: AdminUserRow[] | null = await readJson<AdminUserRow[]>(profileResponse);
  const record: AdminUserRow | undefined = records?.[0];

  if (!profileResponse.ok || !record || !isAdminRole(record.role)) {
    throw new AuthError("This account is not authorized for Flash Earn Admin.");
  }

  const resolvedEmail: string = record.email ?? authData.user.email ?? email;
  return {
    id: userId,
    email: resolvedEmail,
    displayName: getDisplayName(resolvedEmail, record),
    role: record.role,
  };
}

/** Signs an administrator in and verifies their role in admin_users. */
export async function signInWithPassword(email: string, password: string): Promise<AdminProfile> {
  const normalizedEmail: string = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new AuthError("Enter your work email and password.");
  }

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    return signInWithSupabase(normalizedEmail, password);
  }

  if (normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
    return {
      id: "demo-super-admin",
      email: DEMO_EMAIL,
      displayName: "Alex Morgan",
      role: "super_admin",
    };
  }

  throw new AuthError("Use the demo access below, or add Supabase credentials to enable live auth.");
}

export async function restoreAdminProfile(): Promise<AdminProfile | null> {
  const storedValue: string | null = await AsyncStorage.getItem(SESSION_KEY);
  if (!storedValue) {
    return null;
  }

  try {
    const profile: AdminProfile = JSON.parse(storedValue) as AdminProfile;
    if (profile.id && profile.email && isAdminRole(profile.role)) {
      return profile;
    }
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  return null;
}

export async function persistAdminProfile(profile: AdminProfile): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
}

export async function clearAdminProfile(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export const demoCredentials = {
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
} as const;
