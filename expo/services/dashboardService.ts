import { createClient } from "@supabase/supabase-js";

export type DashboardRange = 7 | 30;
export type DashboardSource = "realtime" | "demo" | "fallback";
export type WithdrawalActionStatus = "approved" | "rejected";

export type DailyMetric = {
  date: string;
  label: string;
  revenue: number;
  cashouts: number;
};

export type PendingWithdrawal = {
  id: string;
  userName: string;
  amount: number;
  method: string;
  requestedAt: string;
  riskLabel: string;
  riskScore: number;
};

export type SecurityAlert = {
  id: string;
  userName: string;
  reason: string;
  severity: "high" | "medium" | "low";
  riskScore: number;
  createdAt: string;
};

export type DashboardSnapshot = {
  totalUsers: number;
  todaysSignups: number;
  pendingCashoutsCount: number;
  pendingCashoutsValue: number;
  estimatedRevenue: number;
  paidCashouts: number;
  netProfit: number;
  dailyMetrics: DailyMetric[];
  pendingWithdrawals: PendingWithdrawal[];
  securityAlerts: SecurityAlert[];
  updatedAt: string;
  source: DashboardSource;
  liveError?: string;
};

export type RealtimeStatus = "connected" | "reconnecting" | "offline" | "unavailable";

type PublicEnvironment = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

type UserRow = {
  id?: string;
  created_at?: string;
};

type WithdrawalRow = {
  id?: string;
  user_name?: string;
  user?: string;
  amount?: number | string;
  method?: string;
  requested_at?: string;
  created_at?: string;
  risk_label?: string;
  risk_score?: number | string;
  status?: string;
};

type DailyMetricRow = {
  date?: string;
  revenue?: number | string;
  cashouts?: number | string;
  paid_cashouts?: number | string;
};

type SecurityAlertRow = {
  id?: string;
  user_name?: string;
  user?: string;
  reason?: string;
  message?: string;
  severity?: string;
  risk_score?: number | string;
  created_at?: string;
};

const PUBLIC_ENV: Record<string, string | undefined> = ((globalThis as PublicEnvironment).process?.env ?? {});
const SUPABASE_URL: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    })
  : null;

const DEMO_WITHDRAWALS: PendingWithdrawal[] = [
  { id: "WD-48291", userName: "Jamie Thompson", amount: 84, method: "Cash App ··· 4281", requestedAt: "4 min ago", riskLabel: "Low risk", riskScore: 18 },
  { id: "WD-48288", userName: "Morgan Kim", amount: 240.5, method: "Bank transfer ··· 9012", requestedAt: "12 min ago", riskLabel: "Review signal", riskScore: 61 },
  { id: "WD-48272", userName: "Priya Shah", amount: 56.75, method: "Venmo ··· priya-s", requestedAt: "28 min ago", riskLabel: "Low risk", riskScore: 11 },
];

const DEMO_ALERTS: SecurityAlert[] = [
  { id: "AL-309", userName: "Morgan Kim", reason: "Multiple payout destinations in 24h", severity: "high", riskScore: 87, createdAt: "7 min ago" },
  { id: "AL-302", userName: "Taylor Brooks", reason: "Velocity spike across reward claims", severity: "medium", riskScore: 72, createdAt: "34 min ago" },
];

function numberValue(value: number | string | undefined): number {
  const parsed: number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfDay(value: Date): Date {
  const result: Date = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateLabel(value: string): string {
  const date: Date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function relativeTime(value: string | undefined): string {
  if (!value) {
    return "recently";
  }
  const timestamp: number = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return value;
  }
  const minutes: number = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours: number = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function demoMetrics(range: DashboardRange): DailyMetric[] {
  const revenuePattern: number[] = [11200, 12650, 11840, 14880, 15720, 16940, 18220, 17480, 19120, 20180, 18650, 21600, 22750, 21840, 24100, 23650, 25280, 26640, 25820, 27950, 28740, 27320, 29400, 30250, 31580, 30740, 32900, 34120, 33680, 35840];
  const cashoutPattern: number[] = [7240, 8160, 7680, 9320, 10120, 11080, 10440, 11620, 12080, 11240, 12840, 13220, 14060, 13640, 14880, 15120, 14640, 15920, 16680, 16120, 17440, 16980, 18120, 18840, 18420, 19600, 20240, 19880, 21120, 21840];
  const today: Date = startOfDay(new Date());
  const metrics: DailyMetric[] = revenuePattern.map((revenue: number, index: number) => {
    const date: Date = new Date(today);
    date.setDate(today.getDate() - (revenuePattern.length - index - 1));
    const dateValue: string = isoDate(date);
    return {
      date: dateValue,
      label: dateLabel(dateValue),
      revenue,
      cashouts: cashoutPattern[index] ?? 0,
    };
  });
  return metrics.slice(-range);
}

function demoSnapshot(range: DashboardRange, source: DashboardSource = "demo", liveError?: string): DashboardSnapshot {
  const dailyMetrics: DailyMetric[] = demoMetrics(range);
  const estimatedRevenue: number = dailyMetrics.reduce((total: number, item: DailyMetric) => total + item.revenue, 0);
  const paidCashouts: number = dailyMetrics.reduce((total: number, item: DailyMetric) => total + item.cashouts, 0);
  return {
    totalUsers: 18420,
    todaysSignups: 126,
    pendingCashoutsCount: 18,
    pendingCashoutsValue: 9714.35,
    estimatedRevenue,
    paidCashouts,
    netProfit: estimatedRevenue - paidCashouts,
    dailyMetrics,
    pendingWithdrawals: DEMO_WITHDRAWALS,
    securityAlerts: DEMO_ALERTS,
    updatedAt: new Date().toISOString(),
    source,
    liveError,
  };
}

function normalizeWithdrawal(row: WithdrawalRow, index: number): PendingWithdrawal {
  const id: string = row.id ?? `WD-LIVE-${index + 1}`;
  const userName: string = row.user_name ?? row.user ?? "Unknown member";
  const riskScore: number = numberValue(row.risk_score);
  return {
    id,
    userName,
    amount: numberValue(row.amount),
    method: row.method ?? "Payout method unavailable",
    requestedAt: relativeTime(row.requested_at ?? row.created_at),
    riskLabel: row.risk_label ?? (riskScore >= 75 ? "High risk" : riskScore >= 45 ? "Review signal" : "Low risk"),
    riskScore,
  };
}

function normalizeAlert(row: SecurityAlertRow, index: number): SecurityAlert {
  const riskScore: number = numberValue(row.risk_score);
  const severity: "high" | "medium" | "low" = row.severity === "high" || row.severity === "medium" ? row.severity : riskScore >= 75 ? "high" : riskScore >= 45 ? "medium" : "low";
  return {
    id: row.id ?? `AL-LIVE-${index + 1}`,
    userName: row.user_name ?? row.user ?? "Unknown member",
    reason: row.reason ?? row.message ?? "Suspicious activity detected",
    severity,
    riskScore,
    createdAt: relativeTime(row.created_at),
  };
}

async function fetchLiveSnapshot(range: DashboardRange): Promise<DashboardSnapshot> {
  if (!supabase) {
    return demoSnapshot(range);
  }

  const today: Date = startOfDay(new Date());
  const rangeStart: Date = new Date(today);
  rangeStart.setDate(today.getDate() - (range - 1));
  const [usersResult, withdrawalsResult, metricsResult, alertsResult] = await Promise.all([
    supabase.from("users").select("id,created_at"),
    supabase.from("withdrawals").select("id,user_name,user,amount,method,requested_at,created_at,risk_label,risk_score,status").in("status", ["pending", "review"]).order("created_at", { ascending: false }).limit(12),
    supabase.from("daily_metrics").select("date,revenue,cashouts,paid_cashouts").gte("date", isoDate(rangeStart)).order("date", { ascending: true }),
    supabase.from("security_alerts").select("id,user_name,user,reason,message,severity,risk_score,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(8),
  ]);

  const firstError = usersResult.error ?? withdrawalsResult.error ?? metricsResult.error ?? alertsResult.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const users: UserRow[] = (usersResult.data ?? []) as UserRow[];
  const withdrawals: WithdrawalRow[] = (withdrawalsResult.data ?? []) as WithdrawalRow[];
  const metricRows: DailyMetricRow[] = (metricsResult.data ?? []) as DailyMetricRow[];
  const alertRows: SecurityAlertRow[] = (alertsResult.data ?? []) as SecurityAlertRow[];
  const metrics: DailyMetric[] = metricRows.map((row: DailyMetricRow, index: number) => {
    const fallbackDate: Date = new Date(rangeStart);
    fallbackDate.setDate(rangeStart.getDate() + index);
    const date: string = row.date ?? isoDate(fallbackDate);
    return {
      date,
      label: dateLabel(date),
      revenue: numberValue(row.revenue),
      cashouts: numberValue(row.cashouts ?? row.paid_cashouts),
    };
  });
  const safeMetrics: DailyMetric[] = metrics.length ? metrics.slice(-range) : demoMetrics(range);
  const estimatedRevenue: number = safeMetrics.reduce((total: number, item: DailyMetric) => total + item.revenue, 0);
  const paidCashouts: number = safeMetrics.reduce((total: number, item: DailyMetric) => total + item.cashouts, 0);
  const todaysSignups: number = users.filter((user: UserRow) => user.created_at?.slice(0, 10) === isoDate(today)).length;
  const pending: PendingWithdrawal[] = withdrawals.map(normalizeWithdrawal);
  const alerts: SecurityAlert[] = alertRows.map(normalizeAlert);

  return {
    totalUsers: users.length,
    todaysSignups,
    pendingCashoutsCount: pending.length,
    pendingCashoutsValue: pending.reduce((total: number, item: PendingWithdrawal) => total + item.amount, 0),
    estimatedRevenue,
    paidCashouts,
    netProfit: estimatedRevenue - paidCashouts,
    dailyMetrics: safeMetrics,
    pendingWithdrawals: pending,
    securityAlerts: alerts,
    updatedAt: new Date().toISOString(),
    source: "realtime",
  };
}

/** Returns the latest dashboard snapshot, falling back to preview data when live tables are unavailable. */
export async function fetchDashboardSnapshot(range: DashboardRange): Promise<DashboardSnapshot> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 380));
    return demoSnapshot(range);
  }
  try {
    return await fetchLiveSnapshot(range);
  } catch (error) {
    const message: string = error instanceof Error ? error.message : "The live dashboard could not be loaded.";
    return demoSnapshot(range, "fallback", message);
  }
}

/** Updates a withdrawal in Supabase when live credentials are configured. */
export async function updateWithdrawalStatus(id: string, status: WithdrawalActionStatus): Promise<void> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 220));
    return;
  }
  const { error } = await supabase.from("withdrawals").update({ status }).eq("id", id);
  if (error) {
    throw new Error("This payout could not be updated. Please refresh and try again.");
  }
}

/** Subscribes to Supabase changes that affect the dashboard and returns a cleanup function. */
export function subscribeToDashboardRealtime(onUpdate: () => void, onStatus: (status: RealtimeStatus) => void): () => void {
  if (!supabase) {
    onStatus("unavailable");
    return () => undefined;
  }
  const channel = supabase
    .channel("flash-earn-dashboard")
    .on("postgres_changes", { event: "*", schema: "public", table: "users" }, onUpdate)
    .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, onUpdate)
    .on("postgres_changes", { event: "*", schema: "public", table: "daily_metrics" }, onUpdate)
    .on("postgres_changes", { event: "*", schema: "public", table: "security_alerts" }, onUpdate);

  channel.subscribe((status: string) => {
    if (status === "SUBSCRIBED") {
      onStatus("connected");
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      onStatus("reconnecting");
    } else if (status === "CLOSED") {
      onStatus("offline");
    }
  });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function isDashboardLiveConfigured(): boolean {
  return supabase !== null;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(value);
}

export function formatCurrencyPrecise(value: number): string {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 2, minimumFractionDigits: 2, style: "currency" }).format(value);
}
