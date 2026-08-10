import { createClient } from "@supabase/supabase-js";

export type RewardSettings = {
  dailyStreakCoins: number;
  conversionRate: number;
  minWithdrawalLimit: number;
};

export type AuditEntry = {
  id: string;
  action: string;
  detail: string;
  time: string;
  tone: "green" | "cyan" | "pink" | "amber";
};

export type SettingsResult = { settings: RewardSettings; audit: AuditEntry[]; source: "live" | "demo" | "fallback"; liveError?: string };
type PublicEnvironment = { process?: { env?: Record<string, string | undefined> } };
type DatabaseRow = Record<string, unknown>;
const PUBLIC_ENV: Record<string, string | undefined> = ((globalThis as PublicEnvironment).process?.env ?? {});
const SUPABASE_URL: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } })
  : null;

export const DEFAULT_REWARD_SETTINGS: RewardSettings = { dailyStreakCoins: 100, conversionRate: 100, minWithdrawalLimit: 5000 };

const DEMO_AUDIT: AuditEntry[] = [
  { id: "audit-1", action: "Payout approved", detail: "WD-48266 · Alex Rivera", time: "42m ago", tone: "green" },
  { id: "audit-2", action: "Promo code created", detail: "FLASH25 · 2,500 coins", time: "1h ago", tone: "pink" },
  { id: "audit-3", action: "Reward values updated", detail: "Daily streak · 100 coins", time: "3h ago", tone: "cyan" },
  { id: "audit-4", action: "Support role invited", detail: "support@flashearn.com", time: "Yesterday", tone: "amber" },
];

function numberValue(value: unknown, fallback: number = 0): number {
  const parsed: number = typeof value === "number" ? value : Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(row: DatabaseRow, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value: unknown = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function relativeTime(value: unknown): string {
  if (typeof value !== "string") return "recently";
  const timestamp: number = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return value;
  const minutes: number = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  return minutes < 60 ? `${minutes}m ago` : `${Math.max(1, Math.round(minutes / 60))}h ago`;
}

function normalizeAudit(row: DatabaseRow, index: number): AuditEntry {
  const action: string = stringValue(row, ["action", "event", "operation", "event_name"], "Admin operation");
  const detail: string = stringValue(row, ["detail", "description", "metadata_summary", "target"], "System configuration");
  const kind: string = `${action} ${detail}`.toLowerCase();
  const tone: AuditEntry["tone"] = kind.includes("ban") || kind.includes("reject") ? "amber" : kind.includes("promo") ? "pink" : kind.includes("reward") || kind.includes("setting") ? "cyan" : "green";
  return { id: stringValue(row, ["id", "log_id"], `audit-live-${index + 1}`), action, detail, time: relativeTime(row.created_at ?? row.timestamp), tone };
}

/** Loads reward settings and recent audit records, with demo values for preview mode. */
export async function fetchSystemSettings(): Promise<SettingsResult> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 220));
    return { settings: DEFAULT_REWARD_SETTINGS, audit: DEMO_AUDIT, source: "demo" };
  }
  try {
    const [settingsResult, auditResult] = await Promise.all([
      supabase.from("system_settings").select("*").limit(1).maybeSingle(),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (settingsResult.error) throw new Error(settingsResult.error.message);
    if (auditResult.error) throw new Error(auditResult.error.message);
    const row: DatabaseRow = (settingsResult.data as DatabaseRow | null) ?? {};
    return {
      settings: {
        dailyStreakCoins: Math.round(numberValue(row.daily_streak_coins ?? row.dailyStreakCoins, DEFAULT_REWARD_SETTINGS.dailyStreakCoins)),
        conversionRate: numberValue(row.conversion_rate ?? row.conversionRate, DEFAULT_REWARD_SETTINGS.conversionRate),
        minWithdrawalLimit: Math.round(numberValue(row.min_withdrawal_limit ?? row.minWithdrawalLimit, DEFAULT_REWARD_SETTINGS.minWithdrawalLimit)),
      },
      audit: (auditResult.data as DatabaseRow[]).map(normalizeAudit),
      source: "live",
    };
  } catch (error) {
    return { settings: DEFAULT_REWARD_SETTINGS, audit: DEMO_AUDIT, source: "fallback", liveError: error instanceof Error ? error.message : "System settings are unavailable." };
  }
}

/** Persists reward values in the system settings singleton. */
export async function saveRewardSettings(settings: RewardSettings): Promise<void> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 260));
    return;
  }
  const result = await supabase.from("system_settings").upsert({ id: "default", daily_streak_coins: Math.round(settings.dailyStreakCoins), conversion_rate: settings.conversionRate, min_withdrawal_limit: Math.round(settings.minWithdrawalLimit), updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (result.error) throw new Error(result.error.message);
}

export function isSettingsLiveConfigured(): boolean {
  return supabase !== null;
}
