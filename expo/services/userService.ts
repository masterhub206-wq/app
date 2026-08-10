import { createClient } from "@supabase/supabase-js";

export type UserRisk = "Low risk" | "Watch" | "High risk";
export type UserStatus = "Active" | "Banned";

export type HubUser = {
  id: string;
  name: string;
  email: string;
  balance: number;
  level: number;
  deviceId: string;
  risk: UserRisk;
  signals: number;
  status: UserStatus;
  joinedAt: string;
};

export type UserListResult = {
  items: HubUser[];
  source: "live" | "demo" | "fallback";
  liveError?: string;
};

type PublicEnvironment = { process?: { env?: Record<string, string | undefined> } };
type DatabaseRow = Record<string, unknown>;

const PUBLIC_ENV: Record<string, string | undefined> = ((globalThis as PublicEnvironment).process?.env ?? {});
const SUPABASE_URL: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } })
  : null;

const DEMO_USERS: HubUser[] = [
  { id: "FE-10482", name: "Morgan Kim", email: "morgan.k@email.com", balance: 48260, level: 14, deviceId: "iPhone15,2 · A8F2C1", risk: "High risk", signals: 4, status: "Active", joinedAt: "2 days ago" },
  { id: "FE-10477", name: "Taylor Brooks", email: "taylor.b@email.com", balance: 9120, level: 8, deviceId: "SM-S921B · C31D90", risk: "Watch", signals: 2, status: "Active", joinedAt: "6 days ago" },
  { id: "FE-10468", name: "Jamie Thompson", email: "jamie.t@email.com", balance: 120840, level: 23, deviceId: "iPhone14,5 · 9B4E11", risk: "Low risk", signals: 0, status: "Active", joinedAt: "1 week ago" },
  { id: "FE-10461", name: "Drew Miles", email: "drew.m@email.com", balance: 32000, level: 11, deviceId: "Pixel 8 · 77AC40", risk: "High risk", signals: 5, status: "Banned", joinedAt: "2 weeks ago" },
  { id: "FE-10453", name: "Priya Shah", email: "priya.s@email.com", balance: 78610, level: 18, deviceId: "iPhone13,2 · 21E8F4", risk: "Low risk", signals: 0, status: "Active", joinedAt: "3 weeks ago" },
];

function numberValue(value: unknown): number {
  const parsed: number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(row: DatabaseRow, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value: unknown = row[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return fallback;
}

function relativeTime(value: unknown): string {
  if (typeof value !== "string") return "recently";
  const timestamp: number = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return value;
  const days: number = Math.max(0, Math.round((Date.now() - timestamp) / 86400000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.round(days / 7)} weeks ago`;
}

function normalizeUser(row: DatabaseRow, index: number): HubUser {
  const riskScore: number = numberValue(row.risk_score ?? row.riskScore ?? row.fraud_score);
  const rawRisk: string = String(row.risk_label ?? row.risk ?? "").toLowerCase();
  const risk: UserRisk = rawRisk.includes("high") || riskScore >= 75 ? "High risk" : rawRisk.includes("watch") || riskScore >= 45 ? "Watch" : "Low risk";
  const banned: boolean = Boolean(row.is_banned ?? row.banned ?? row.isBanned ?? String(row.status ?? "").toLowerCase() === "banned");
  const name: string = stringValue(row, ["name", "full_name", "display_name", "user_name"], "Unknown member");
  return {
    id: stringValue(row, ["id", "user_id", "member_id"], `FE-LIVE-${index + 1}`),
    name,
    email: stringValue(row, ["email", "user_email"], `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`),
    balance: numberValue(row.balance ?? row.coin_balance ?? row.coins ?? row.wallet_balance),
    level: Math.max(1, Math.round(numberValue(row.level ?? row.user_level ?? row.tier ?? 1))),
    deviceId: stringValue(row, ["device_id", "device", "last_device_id"], "Device ID unavailable"),
    risk,
    signals: Math.max(0, Math.round(numberValue(row.signals ?? row.risk_signals ?? row.signal_count))),
    status: banned ? "Banned" : "Active",
    joinedAt: relativeTime(row.created_at ?? row.joined_at),
  };
}

/** Loads user hub records from Supabase and keeps the admin preview usable without credentials. */
export async function fetchHubUsers(): Promise<UserListResult> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 260));
    return { items: DEMO_USERS, source: "demo" };
  }
  try {
    const result = await supabase.from("users").select("*").order("created_at", { ascending: false }).limit(100);
    if (result.error) throw new Error(result.error.message);
    return { items: (result.data as DatabaseRow[]).map(normalizeUser), source: "live" };
  } catch (error) {
    return { items: DEMO_USERS, source: "fallback", liveError: error instanceof Error ? error.message : "Live users are unavailable." };
  }
}

async function invokeRpc(name: string, payloads: DatabaseRow[]): Promise<void> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 280));
    return;
  }
  let lastMessage: string = "This user action could not be completed.";
  for (const payload of payloads) {
    const result = await supabase.rpc(name, payload);
    if (!result.error) return;
    lastMessage = result.error.message;
  }
  throw new Error(lastMessage);
}

/** Toggles an account ban through the toggle_ban_user RPC. */
export async function toggleBanUser(userId: string, isBanned: boolean, reason: string): Promise<void> {
  await invokeRpc("toggle_ban_user", [
    { p_user_id: userId, p_is_banned: isBanned, p_reason: reason },
    { user_id: userId, banned: isBanned, reason },
  ]);
}

/** Adjusts a member's coin balance through the admin_adjust_balance RPC. */
export async function adjustUserBalance(userId: string, coins: number, reason: string): Promise<void> {
  await invokeRpc("admin_adjust_balance", [
    { p_user_id: userId, p_amount: coins, p_reason: reason },
    { user_id: userId, coins, amount: coins, reason },
  ]);
}

export function isUserLiveConfigured(): boolean {
  return supabase !== null;
}
