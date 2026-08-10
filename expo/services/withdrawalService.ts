import { createClient } from "@supabase/supabase-js";

export type WithdrawalStatus = "pending" | "approved" | "rejected";
export type WithdrawalSource = "live" | "demo" | "fallback";
export type RealtimeStatus = "connected" | "reconnecting" | "offline" | "unavailable";

export type WithdrawalRequest = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  riskScore: number;
  deductedCoins: number;
  usdAmount: number;
  paymentMethod: string;
  accountDetails: string;
  requestedAt: string;
  status: WithdrawalStatus;
};

export type RewardEvent = {
  id: string;
  title: string;
  description: string;
  coins: number;
  createdAt: string;
  eventType: "earned" | "bonus" | "referral" | "cashout";
};

export type WithdrawalListResult = {
  items: WithdrawalRequest[];
  source: WithdrawalSource;
  liveError?: string;
};

export type RewardHistoryResult = {
  events: RewardEvent[];
  source: WithdrawalSource;
  liveError?: string;
};

type PublicEnvironment = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

type DatabaseRow = Record<string, unknown>;

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

const DEMO_REQUESTS: WithdrawalRequest[] = [
  {
    id: "WD-48291",
    userId: "user-jamie-thompson",
    userName: "Jamie Thompson",
    email: "jamie.t@example.com",
    riskScore: 18,
    deductedCoins: 8400,
    usdAmount: 84,
    paymentMethod: "Cash App",
    accountDetails: "$cashtag_jamie ··· 4281",
    requestedAt: "4 min ago",
    status: "pending",
  },
  {
    id: "WD-48288",
    userId: "user-morgan-kim",
    userName: "Morgan Kim",
    email: "morgan.k@example.com",
    riskScore: 61,
    deductedCoins: 24050,
    usdAmount: 240.5,
    paymentMethod: "Bank transfer",
    accountDetails: "Checking ··· 9012",
    requestedAt: "12 min ago",
    status: "pending",
  },
  {
    id: "WD-48272",
    userId: "user-priya-shah",
    userName: "Priya Shah",
    email: "priya.s@example.com",
    riskScore: 11,
    deductedCoins: 5675,
    usdAmount: 56.75,
    paymentMethod: "Venmo",
    accountDetails: "@priya-shah",
    requestedAt: "28 min ago",
    status: "pending",
  },
  {
    id: "WD-48266",
    userId: "user-alex-rivera",
    userName: "Alex Rivera",
    email: "alex.r@example.com",
    riskScore: 24,
    deductedCoins: 11200,
    usdAmount: 112,
    paymentMethod: "PayPal",
    accountDetails: "alex.rivera@example.com",
    requestedAt: "42 min ago",
    status: "approved",
  },
  {
    id: "WD-48259",
    userId: "user-taylor-brooks",
    userName: "Taylor Brooks",
    email: "taylor.b@example.com",
    riskScore: 89,
    deductedCoins: 39000,
    usdAmount: 390,
    paymentMethod: "Binance Pay",
    accountDetails: "taylor-b · Binance ID 903184",
    requestedAt: "1 hr ago",
    status: "rejected",
  },
];

const DEMO_EVENTS: Record<string, RewardEvent[]> = {
  "user-jamie-thompson": [
    { id: "evt-j-1", title: "Cashback mission completed", description: "Completed 3 partner purchases", coins: 1800, createdAt: "Today · 10:42 AM", eventType: "earned" },
    { id: "evt-j-2", title: "7-day streak bonus", description: "Maintained an active earning streak", coins: 650, createdAt: "Today · 8:15 AM", eventType: "bonus" },
    { id: "evt-j-3", title: "Referral reward", description: "Referred a verified friend", coins: 1200, createdAt: "Yesterday · 4:08 PM", eventType: "referral" },
    { id: "evt-j-4", title: "Daily check-in", description: "Opened the Flash Earn app", coins: 100, createdAt: "Yesterday · 9:01 AM", eventType: "earned" },
    { id: "evt-j-5", title: "Withdrawal requested", description: "Converted 8,400 coins to Cash App", coins: -8400, createdAt: "4 min ago", eventType: "cashout" },
  ],
  "user-morgan-kim": [
    { id: "evt-m-1", title: "Survey completed", description: "Finished a high-value partner survey", coins: 5100, createdAt: "Today · 11:18 AM", eventType: "earned" },
    { id: "evt-m-2", title: "Referral reward", description: "Referred a new member", coins: 1200, createdAt: "Today · 9:22 AM", eventType: "referral" },
    { id: "evt-m-3", title: "Withdrawal requested", description: "Converted 24,050 coins to bank transfer", coins: -24050, createdAt: "12 min ago", eventType: "cashout" },
  ],
  "user-priya-shah": [
    { id: "evt-p-1", title: "Receipt uploaded", description: "Verified a partner receipt", coins: 850, createdAt: "Today · 10:03 AM", eventType: "earned" },
    { id: "evt-p-2", title: "Streak bonus", description: "Completed a 5-day earning streak", coins: 400, createdAt: "Yesterday · 8:04 AM", eventType: "bonus" },
    { id: "evt-p-3", title: "Withdrawal requested", description: "Converted 5,675 coins to Venmo", coins: -5675, createdAt: "28 min ago", eventType: "cashout" },
  ],
  "user-alex-rivera": [
    { id: "evt-a-1", title: "Cashback mission completed", description: "Completed a partner offer", coins: 11200, createdAt: "Today · 9:48 AM", eventType: "earned" },
    { id: "evt-a-2", title: "Withdrawal approved", description: "Payout released to PayPal", coins: -11200, createdAt: "42 min ago", eventType: "cashout" },
  ],
  "user-taylor-brooks": [
    { id: "evt-t-1", title: "Offer burst detected", description: "Completed 12 offers in 4 minutes", coins: 39000, createdAt: "Today · 7:21 AM", eventType: "earned" },
    { id: "evt-t-2", title: "Withdrawal rejected", description: "Payout rejected after risk review", coins: 39000, createdAt: "1 hr ago", eventType: "cashout" },
  ],
};

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
  return `${Math.max(1, Math.round(minutes / 60))} hr ago`;
}

function normalizeStatus(value: unknown): WithdrawalStatus {
  const status: string = String(value ?? "pending").toLowerCase();
  if (status === "approved" || status === "paid" || status === "completed") {
    return "approved";
  }
  if (status === "rejected" || status === "refunded" || status === "denied") {
    return "rejected";
  }
  return "pending";
}

function normalizeWithdrawal(row: DatabaseRow, index: number): WithdrawalRequest {
  const userName: string = stringValue(row, ["user_name", "name", "full_name", "display_name"], "Unknown member");
  const userId: string = stringValue(row, ["user_id", "profile_id", "member_id"], `live-user-${index + 1}`);
  const riskScore: number = numberValue(row.risk_score ?? row.riskScore ?? row.fraud_score);
  const usdAmount: number = numberValue(row.usd_amount ?? row.amount ?? row.payout_amount ?? row.cashout_amount);
  const deductedCoins: number = numberValue(row.deducted_coins ?? row.coins ?? row.coin_amount ?? row.reward_coins ?? usdAmount * 100);
  const requestedValue: string | undefined = typeof row.requested_at === "string" ? row.requested_at : typeof row.created_at === "string" ? row.created_at : undefined;
  return {
    id: stringValue(row, ["id", "withdrawal_id"], `WD-LIVE-${index + 1}`),
    userId,
    userName,
    email: stringValue(row, ["email", "user_email"], `${userName.toLowerCase().replace(/\s+/g, ".")}@example.com`),
    riskScore,
    deductedCoins,
    usdAmount,
    paymentMethod: stringValue(row, ["payment_method", "method", "payout_method"], "Payout method"),
    accountDetails: stringValue(row, ["account_details", "account", "payment_account", "destination", "payout_account"], "Account details unavailable"),
    requestedAt: relativeTime(requestedValue),
    status: normalizeStatus(row.status),
  };
}

function normalizeRewardEvent(row: DatabaseRow, index: number): RewardEvent {
  const rawType: string = String(row.event_type ?? row.type ?? "earned").toLowerCase();
  const eventType: RewardEvent["eventType"] = rawType === "bonus" || rawType === "referral" || rawType === "cashout" ? rawType : "earned";
  const createdAt: string = stringValue(row, ["created_at", "occurred_at", "timestamp"], "Recently");
  return {
    id: stringValue(row, ["id", "event_id"], `event-${index + 1}`),
    title: stringValue(row, ["title", "name", "event_name"], eventType === "cashout" ? "Withdrawal event" : "Reward earned"),
    description: stringValue(row, ["description", "details", "source"], "Reward activity recorded"),
    coins: numberValue(row.coins ?? row.coin_amount ?? row.amount),
    createdAt: createdAt === "Recently" ? createdAt : relativeTime(createdAt),
    eventType,
  };
}

function demoRequests(status: WithdrawalStatus): WithdrawalRequest[] {
  return DEMO_REQUESTS.filter((item: WithdrawalRequest) => item.status === status);
}

/** Loads withdrawals for the selected status, using demo records when Supabase is not configured. */
export async function fetchWithdrawals(status: WithdrawalStatus): Promise<WithdrawalListResult> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 260));
    return { items: demoRequests(status), source: "demo" };
  }

  try {
    const query = supabase.from("withdrawals").select("*");
    const result = status === "pending"
      ? await query.in("status", ["pending", "review"]).order("created_at", { ascending: false }).limit(100)
      : await query.eq("status", status).order("created_at", { ascending: false }).limit(100);
    if (result.error) {
      throw new Error(result.error.message);
    }
    const items: WithdrawalRequest[] = (result.data as DatabaseRow[]).map(normalizeWithdrawal).filter((item: WithdrawalRequest) => item.status === status);
    return { items, source: "live" };
  } catch (error) {
    return {
      items: demoRequests(status),
      source: "fallback",
      liveError: error instanceof Error ? error.message : "Live withdrawal data is unavailable.",
    };
  }
}

async function invokeRpc(name: string, payloads: DatabaseRow[]): Promise<void> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 300));
    return;
  }
  let lastMessage: string = "The payout action could not be completed.";
  for (const payload of payloads) {
    const result = await supabase.rpc(name, payload);
    if (!result.error) {
      return;
    }
    lastMessage = result.error.message;
  }
  throw new Error(lastMessage);
}

/** Approves a payout through the approve_withdrawal Supabase RPC. */
export async function approveWithdrawal(id: string): Promise<void> {
  await invokeRpc("approve_withdrawal", [{ p_withdrawal_id: id }, { withdrawal_id: id }]);
}

/** Rejects and refunds a payout through the reject_withdrawal_and_refund Supabase RPC. */
export async function rejectWithdrawalAndRefund(id: string, reason: string): Promise<void> {
  await invokeRpc("reject_withdrawal_and_refund", [
    { p_withdrawal_id: id, p_reason: reason },
    { withdrawal_id: id, rejection_reason: reason },
  ]);
}

/** Loads a member's reward event history for the audit drawer. */
export async function fetchRewardHistory(userId: string): Promise<RewardHistoryResult> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 220));
    return { events: DEMO_EVENTS[userId] ?? [], source: "demo" };
  }
  try {
    const result = await supabase.from("reward_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return { events: (result.data as DatabaseRow[]).map(normalizeRewardEvent), source: "live" };
  } catch (error) {
    return {
      events: DEMO_EVENTS[userId] ?? [],
      source: "fallback",
      liveError: error instanceof Error ? error.message : "Reward history is unavailable.",
    };
  }
}

/** Subscribes to live withdrawal changes and returns an unsubscribe function. */
export function subscribeToWithdrawalRealtime(onUpdate: () => void, onStatus: (status: RealtimeStatus) => void): () => void {
  if (!supabase) {
    onStatus("unavailable");
    return () => undefined;
  }
  const channel = supabase
    .channel("flash-earn-withdrawals")
    .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, onUpdate)
    .on("postgres_changes", { event: "*", schema: "public", table: "reward_events" }, onUpdate);
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

export function isWithdrawalLiveConfigured(): boolean {
  return supabase !== null;
}

function csvCell(value: string | number): string {
  const normalized: string = String(value).replace(/"/g, "\"\"");
  return `"${normalized}"`;
}

/** Builds a spreadsheet-friendly CSV export for selected withdrawal requests. */
export function buildWithdrawalsCsv(items: WithdrawalRequest[]): string {
  const header: string = ["Withdrawal ID", "User", "Email", "Risk score", "Deducted coins", "USD amount", "Payment method", "Account details", "Requested", "Status"].map(csvCell).join(",");
  const rows: string[] = items.map((item: WithdrawalRequest) => [
    item.id,
    item.userName,
    item.email,
    item.riskScore,
    item.deductedCoins,
    item.usdAmount.toFixed(2),
    item.paymentMethod,
    item.accountDetails,
    item.requestedAt,
    item.status,
  ].map(csvCell).join(","));
  return [header, ...rows].join("\n");
}
