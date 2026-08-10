import { createClient, RealtimeChannel } from "@supabase/supabase-js";

export type SupportPriority = "Normal" | "Priority" | "Escalated";
export type MessageSender = "user" | "support";
export type RealtimeStatus = "connected" | "reconnecting" | "offline" | "unavailable";

export type Conversation = {
  id: string;
  name: string;
  email: string;
  topic: string;
  preview: string;
  time: string;
  unreadCount: number;
  priority: SupportPriority;
};

export type SupportMessage = {
  id: string;
  conversationId: string;
  body: string;
  sender: MessageSender;
  createdAt: string;
};

export type ConversationListResult = { items: Conversation[]; source: "live" | "demo" | "fallback"; liveError?: string };
export type MessageListResult = { items: SupportMessage[]; source: "live" | "demo" | "fallback"; liveError?: string };

type PublicEnvironment = { process?: { env?: Record<string, string | undefined> } };
type DatabaseRow = Record<string, unknown>;

const PUBLIC_ENV: Record<string, string | undefined> = ((globalThis as PublicEnvironment).process?.env ?? {});
const SUPABASE_URL: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = PUBLIC_ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } })
  : null;

const DEMO_CONVERSATIONS: Conversation[] = [
  { id: "CS-9128", name: "Jordan Bell", email: "jordan.b@email.com", topic: "Cash out pending", preview: "I requested this yesterday and still don't see it...", time: "2m", unreadCount: 2, priority: "Priority" },
  { id: "CS-9124", name: "Samira Jones", email: "samira.j@email.com", topic: "Bonus missing", preview: "The streak reward disappeared after I updated my phone.", time: "8m", unreadCount: 1, priority: "Normal" },
  { id: "CS-9119", name: "Chris Park", email: "chris.p@email.com", topic: "Account verification", preview: "Can you help me understand what document is needed?", time: "19m", unreadCount: 0, priority: "Normal" },
  { id: "CS-9111", name: "Drew Miles", email: "drew.m@email.com", topic: "Suspicious activity", preview: "I think someone else accessed my account.", time: "31m", unreadCount: 3, priority: "Escalated" },
  { id: "CS-9098", name: "Riley Stone", email: "riley.s@email.com", topic: "Referral credit", preview: "My friend joined but the referral is not showing.", time: "1h", unreadCount: 0, priority: "Normal" },
];

const DEMO_MESSAGES: Record<string, SupportMessage[]> = {
  "CS-9128": [
    { id: "msg-9128-1", conversationId: "CS-9128", body: "Hey, I requested my cash out yesterday but it still hasn't arrived. Can you check this for me?", sender: "user", createdAt: "10:42 AM" },
    { id: "msg-9128-2", conversationId: "CS-9128", body: "I can see the request on my side. Is this the first time you've used this payout method?", sender: "support", createdAt: "10:44 AM" },
    { id: "msg-9128-3", conversationId: "CS-9128", body: "Yes, it is. I just want to make sure I didn't miss a step.", sender: "user", createdAt: "10:45 AM" },
  ],
  "CS-9124": [
    { id: "msg-9124-1", conversationId: "CS-9124", body: "My streak reward disappeared after I updated my phone.", sender: "user", createdAt: "10:35 AM" },
    { id: "msg-9124-2", conversationId: "CS-9124", body: "Thanks for flagging this. I am checking your reward history now.", sender: "support", createdAt: "10:37 AM" },
  ],
  "CS-9111": [
    { id: "msg-9111-1", conversationId: "CS-9111", body: "I think someone else accessed my account.", sender: "user", createdAt: "10:12 AM" },
  ],
};

function stringValue(row: DatabaseRow, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value: unknown = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function numberValue(value: unknown): number {
  const parsed: number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function relativeTime(value: unknown): string {
  if (typeof value !== "string") return "recently";
  const timestamp: number = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return value;
  const minutes: number = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.max(1, Math.round(minutes / 60))}h`;
}

function normalizePriority(value: unknown): SupportPriority {
  const normalized: string = String(value ?? "normal").toLowerCase();
  return normalized === "escalated" ? "Escalated" : normalized === "priority" || normalized === "high" ? "Priority" : "Normal";
}

function normalizeConversation(row: DatabaseRow, index: number): Conversation {
  const id: string = stringValue(row, ["id", "conversation_id", "ticket_id"], `CS-LIVE-${index + 1}`);
  const name: string = stringValue(row, ["user_name", "name", "full_name", "display_name"], "Unknown member");
  return {
    id,
    name,
    email: stringValue(row, ["user_email", "email"], `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`),
    topic: stringValue(row, ["topic", "subject", "category"], "Support request"),
    preview: stringValue(row, ["last_message", "preview", "latest_message"], "New support request"),
    time: relativeTime(row.updated_at ?? row.last_message_at ?? row.created_at),
    unreadCount: Math.max(0, Math.round(numberValue(row.unread_count ?? row.unread ?? 0))),
    priority: normalizePriority(row.priority),
  };
}

function normalizeMessage(row: DatabaseRow, index: number, conversationId: string): SupportMessage {
  const rawSender: string = String(row.sender ?? row.sender_type ?? row.author_role ?? "user").toLowerCase();
  return {
    id: stringValue(row, ["id", "message_id"], `msg-live-${index + 1}`),
    conversationId: stringValue(row, ["conversation_id", "thread_id"], conversationId),
    body: stringValue(row, ["content", "message", "body", "text"], ""),
    sender: rawSender === "support" || rawSender === "admin" ? "support" : "user",
    createdAt: stringValue(row, ["created_at", "sent_at", "timestamp"], "Recently"),
  };
}

/** Loads support inbox conversations with a preview fallback for local development. */
export async function fetchConversations(): Promise<ConversationListResult> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 230));
    return { items: DEMO_CONVERSATIONS, source: "demo" };
  }
  try {
    const result = await supabase.from("support_conversations").select("*").order("updated_at", { ascending: false }).limit(100);
    if (result.error) throw new Error(result.error.message);
    return { items: (result.data as DatabaseRow[]).map(normalizeConversation), source: "live" };
  } catch (error) {
    return { items: DEMO_CONVERSATIONS, source: "fallback", liveError: error instanceof Error ? error.message : "Support inbox is unavailable." };
  }
}

/** Loads one conversation's messages ordered from oldest to newest. */
export async function fetchMessages(conversationId: string): Promise<MessageListResult> {
  if (!supabase) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 180));
    return { items: DEMO_MESSAGES[conversationId] ?? [], source: "demo" };
  }
  try {
    const result = await supabase.from("support_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
    if (result.error) throw new Error(result.error.message);
    return { items: (result.data as DatabaseRow[]).map((row: DatabaseRow, index: number) => normalizeMessage(row, index, conversationId)), source: "live" };
  } catch (error) {
    return { items: DEMO_MESSAGES[conversationId] ?? [], source: "fallback", liveError: error instanceof Error ? error.message : "Messages are unavailable." };
  }
}

/** Sends a support reply with sender explicitly recorded as support. */
export async function sendSupportReply(conversationId: string, body: string): Promise<SupportMessage> {
  const message: string = body.trim();
  if (!message) throw new Error("Write a reply before sending.");
  if (!supabase) {
    return { id: `msg-demo-${Date.now()}`, conversationId, body: message, sender: "support", createdAt: "Just now" };
  }
  const primary = await supabase.from("support_messages").insert({ conversation_id: conversationId, sender: "support", content: message }).select("*").single();
  if (!primary.error && primary.data) return normalizeMessage(primary.data as DatabaseRow, 0, conversationId);
  const fallback = await supabase.from("support_messages").insert({ conversation_id: conversationId, sender: "support", message }).select("*").single();
  if (fallback.error || !fallback.data) throw new Error(fallback.error?.message ?? "The support reply could not be sent.");
  return normalizeMessage(fallback.data as DatabaseRow, 0, conversationId);
}

/** Subscribes to inbox and message changes and returns an unsubscribe function. */
export function subscribeToSupportRealtime(conversationId: string | null, onUpdate: () => void, onStatus: (status: RealtimeStatus) => void): () => void {
  if (!supabase) {
    onStatus("unavailable");
    return () => undefined;
  }
  const channel: RealtimeChannel = supabase
    .channel(`flash-earn-support-${conversationId ?? "inbox"}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, onUpdate)
    .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", ...(conversationId ? { filter: `conversation_id=eq.${conversationId}` } : {}) }, onUpdate);
  channel.subscribe((status: string) => {
    if (status === "SUBSCRIBED") onStatus("connected");
    else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onStatus("reconnecting");
    else if (status === "CLOSED") onStatus("offline");
  });
  return () => { void supabase.removeChannel(channel); };
}

export function isSupportLiveConfigured(): boolean {
  return supabase !== null;
}
