import { createClient } from "@supabase/supabase-js";

export type PromoCode = {
  id: string;
  code: string;
  coins: number;
  used: number;
  maxUses: number;
  expiresAt: string | null;
  status: "Active" | "Ending soon" | "Expired";
};

export type PromoListResult = { items: PromoCode[]; source: "live" | "demo" | "fallback"; liveError?: string };

type PublicEnvironment = { process?: { env?: Record<string, string | undefined> } };
type DatabaseRow = Record<string, unknown>;
const PUBLIC_ENV: Record<string, string | undefined> = ((globalThis as PublicEnvironment).process?.env ?? {});
const SUPABASE_URL: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } })
  : null;

const DEMO_PROMOS: PromoCode[] = [
  { id: "promo-1", code: "FLASH25", coins: 2500, used: 1842, maxUses: 2500, expiresAt: "2026-08-31", status: "Active" },
  { id: "promo-2", code: "EARNMORE", coins: 1000, used: 926, maxUses: 1000, expiresAt: "2026-08-18", status: "Ending soon" },
  { id: "promo-3", code: "WELCOME10", coins: 1000, used: 4290, maxUses: 0, expiresAt: null, status: "Active" },
];

function numberValue(value: unknown): number {
  const parsed: number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(row: DatabaseRow, keys: string[]): string | null {
  for (const key of keys) {
    const value: unknown = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function statusFor(expiresAt: string | null, used: number, maxUses: number): PromoCode["status"] {
  if (expiresAt) {
    const time: number = new Date(expiresAt).getTime();
    if (Number.isFinite(time) && time < Date.now()) return "Expired";
    if (Number.isFinite(time) && time - Date.now() < 7 * 86400000) return "Ending soon";
  }
  if (maxUses > 0 && used >= maxUses) return "Expired";
  return "Active";
}

function normalizePromo(row: DatabaseRow, index: number): PromoCode {
  const used: number = Math.max(0, Math.round(numberValue(row.used ?? row.used_count ?? row.redemptions ?? row.redeemed)));
  const maxUses: number = Math.max(0, Math.round(numberValue(row.max_uses ?? row.maxUses ?? row.usage_limit)));
  const expiresAt: string | null = stringValue(row, ["expires_at", "expiry", "expires_on"]);
  return {
    id: stringValue(row, ["id", "promo_id"]) ?? `promo-live-${index + 1}`,
    code: (stringValue(row, ["code", "promo_code"]) ?? `CODE${index + 1}`).toUpperCase(),
    coins: Math.round(numberValue(row.coins ?? row.coin_amount ?? row.reward_coins ?? row.amount)),
    used,
    maxUses,
    expiresAt,
    status: statusFor(expiresAt, used, maxUses),
  };
}

/** Loads active and recent promo codes for the admin manager. */
export async function fetchPromoCodes(): Promise<PromoListResult> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 220));
    return { items: DEMO_PROMOS, source: "demo" };
  }
  try {
    const result = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false }).limit(100);
    if (result.error) throw new Error(result.error.message);
    return { items: (result.data as DatabaseRow[]).map(normalizePromo), source: "live" };
  } catch (error) {
    return { items: DEMO_PROMOS, source: "fallback", liveError: error instanceof Error ? error.message : "Promo codes are unavailable." };
  }
}

/** Creates a promo code in Supabase or returns a local demo record. */
export async function createPromoCode(input: { code: string; coins: number; expiresAt: string | null; maxUses: number }): Promise<PromoCode> {
  const code: string = input.code.trim().toUpperCase();
  if (!code) throw new Error("Enter a promo code.");
  if (input.coins <= 0) throw new Error("Coins must be greater than zero.");
  if (input.maxUses < 0) throw new Error("Max uses cannot be negative.");
  if (!supabase) {
    return { id: `promo-demo-${Date.now()}`, code, coins: Math.round(input.coins), used: 0, maxUses: Math.round(input.maxUses), expiresAt: input.expiresAt, status: statusFor(input.expiresAt, 0, input.maxUses) };
  }
  const result = await supabase.from("promo_codes").insert({ code, coins: Math.round(input.coins), expires_at: input.expiresAt, max_uses: Math.round(input.maxUses), used_count: 0 }).select("*").single();
  if (result.error || !result.data) throw new Error(result.error?.message ?? "The promo code could not be created.");
  return normalizePromo(result.data as DatabaseRow, 0);
}

export function isPromoLiveConfigured(): boolean {
  return supabase !== null;
}
