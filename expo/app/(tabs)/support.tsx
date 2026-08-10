import { ArrowLeft, CheckCheck, ChevronRight, MessageCircleMore, Send, ShieldAlert, Timer, Wifi, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";

import { AdminShell } from "@/components/AdminShell";
import { Avatar, MonoLabel, SectionHeading, StatusPill } from "@/components/ui";
import Colors from "@/constants/colors";
import { Conversation, fetchConversations, fetchMessages, isSupportLiveConfigured, MessageListResult, sendSupportReply, subscribeToSupportRealtime, SupportMessage, SupportPriority, RealtimeStatus } from "@/services/supportService";

function priorityTone(priority: SupportPriority): "neutral" | "pink" | "red" {
  return priority === "Escalated" ? "red" : priority === "Priority" ? "pink" : "neutral";
}

function ChatThread({
  conversation,
  onBack,
  onRefreshInbox,
}: {
  conversation: Conversation;
  onBack: () => void;
  onRefreshInbox: () => void;
}): React.ReactElement {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [composer, setComposer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(isSupportLiveConfigured() ? "reconnecting" : "unavailable");
  const messagesRef = useRef<FlatList<SupportMessage> | null>(null);

  const loadMessages = async (): Promise<void> => {
    setLoading(true);
    const result: MessageListResult = await fetchMessages(conversation.id);
    setMessages(result.items);
    setLoading(false);
  };

  useEffect(() => {
    void loadMessages();
    const unsubscribe: () => void = subscribeToSupportRealtime(conversation.id, () => { void loadMessages(); }, setRealtimeStatus);
    return unsubscribe;
  }, [conversation.id]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => messagesRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [loading, messages.length]);

  const sendReply = async (): Promise<void> => {
    const body: string = composer.trim();
    if (!body || sending) return;
    setComposer("");
    setSending(true);
    try {
      const sent: SupportMessage = await sendSupportReply(conversation.id, body);
      setMessages((current: SupportMessage[]) => current.some((item: SupportMessage) => item.id === sent.id) ? current : [...current, sent]);
      onRefreshInbox();
    } catch (error) {
      setComposer(body);
      Alert.alert("Reply failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: SupportMessage }): React.ReactElement => {
    const isSupport: boolean = item.sender === "support";
    return <View style={[styles.messageRow, isSupport && styles.messageRowSupport]}><View style={[styles.messageBubble, isSupport ? styles.supportBubble : styles.userBubble]}><Text style={[styles.messageBody, isSupport && styles.supportMessageBody]}>{item.body}</Text><Text style={[styles.messageTime, isSupport && styles.supportMessageTime]}>{item.createdAt}</Text></View></View>;
  };

  return (
    <AdminShell contentStyle={styles.chatShell} onRefresh={async () => { await loadMessages(); }} refreshing={loading} scrollEnabled={false} subtitle={conversation.topic} title="Support chat">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.chatContainer}>
        <View style={styles.chatHeader}><Pressable accessibilityLabel="Back to conversations" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><ArrowLeft color={Colors.text} size={20} /></Pressable><Avatar color={conversation.priority === "Escalated" ? Colors.red : Colors.cyan} name={conversation.name} size={41} /><View style={styles.chatHeaderCopy}><Text style={styles.chatName}>{conversation.name}</Text><Text style={styles.chatEmail}>{conversation.email}</Text></View><View style={styles.liveStatus}><View style={[styles.statusDot, { backgroundColor: realtimeStatus === "connected" ? Colors.green : Colors.amber }]} /><Text style={[styles.liveStatusText, { color: realtimeStatus === "connected" ? Colors.green : Colors.amber }]}>{realtimeStatus === "connected" ? "LIVE" : "SYNC"}</Text></View></View>
        <View style={styles.topicBar}><View style={styles.topicBarCopy}><Text style={styles.topicLabel}>CONVERSATION</Text><Text style={styles.topicValue}>{conversation.topic}</Text></View><StatusPill label={conversation.priority} tone={priorityTone(conversation.priority)} /></View>
        {loading ? <View style={styles.chatLoading}><ActivityIndicator color={Colors.primarySoft} /><Text style={styles.loadingText}>Loading messages…</Text></View> : <FlatList ref={messagesRef} contentContainerStyle={styles.messageList} data={messages} keyExtractor={(item: SupportMessage) => item.id} keyboardShouldPersistTaps="handled" ListEmptyComponent={<View style={styles.emptyMessages}><MessageCircleMore color={Colors.textDim} size={22} /><Text style={styles.emptyMessagesText}>No messages yet</Text></View>} onContentSizeChange={() => messagesRef.current?.scrollToEnd({ animated: false })} renderItem={renderMessage} showsVerticalScrollIndicator={false} />}
        <View style={styles.composerRow}><TextInput editable={!sending} multiline onChangeText={setComposer} onSubmitEditing={() => void sendReply()} placeholder="Write a reply…" placeholderTextColor={Colors.textDim} returnKeyType="send" style={styles.composerInput} value={composer} /><Pressable accessibilityLabel="Send support reply" disabled={!composer.trim() || sending} onPress={() => void sendReply()} style={({ pressed }) => [styles.sendButton, pressed && styles.pressed, (!composer.trim() || sending) && styles.disabledButton]}>{sending ? <ActivityIndicator color={Colors.background} size="small" /> : <Send color={Colors.background} size={17} />}</Pressable></View>
      </KeyboardAvoidingView>
    </AdminShell>
  );
}

export default function SupportScreen(): React.ReactElement {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [source, setSource] = useState<"live" | "demo" | "fallback">("demo");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(isSupportLiveConfigured() ? "reconnecting" : "unavailable");

  const loadConversations = async (): Promise<void> => {
    setLoading(true);
    const result = await fetchConversations();
    setConversations(result.items);
    setSource(result.source);
    setLoading(false);
  };

  useEffect(() => {
    void loadConversations();
    const unsubscribe: () => void = subscribeToSupportRealtime(null, () => { void loadConversations(); }, setRealtimeStatus);
    return unsubscribe;
  }, []);

  const visibleConversations: Conversation[] = useMemo(() => {
    const normalizedQuery: string = query.trim().toLowerCase();
    return conversations.filter((item: Conversation) => !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery) || item.email.toLowerCase().includes(normalizedQuery) || item.topic.toLowerCase().includes(normalizedQuery));
  }, [conversations, query]);

  const unreadCount: number = conversations.reduce((total: number, item: Conversation) => total + item.unreadCount, 0);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const openConversation = (conversation: Conversation): void => {
    setConversations((current: Conversation[]) => current.map((item: Conversation) => item.id === conversation.id ? { ...item, unreadCount: 0 } : item));
    setSelectedConversation({ ...conversation, unreadCount: 0 });
  };

  if (selectedConversation) {
    return <ChatThread conversation={selectedConversation} onBack={() => setSelectedConversation(null)} onRefreshInbox={() => { void loadConversations(); }} />;
  }

  return (
    <AdminShell onRefresh={handleRefresh} refreshing={refreshing} subtitle="Keep every member moving forward" title="Support chat">
      <View style={styles.inboxHero}><View style={styles.inboxIcon}><MessageCircleMore color={Colors.cyan} size={22} /></View><View style={styles.inboxCopy}><Text style={styles.inboxValue}>{unreadCount}</Text><Text style={styles.inboxLabel}>unread messages</Text></View><View style={styles.slaBox}><Timer color={Colors.green} size={14} /><Text style={styles.slaText}>4m SLA</Text></View></View>
      <View style={styles.searchBox}><SearchIcon /><TextInput onChangeText={setQuery} placeholder="Search conversations" placeholderTextColor={Colors.textDim} style={styles.searchInput} value={query} /></View>
      <View style={styles.tabRow}><View style={styles.activeTab}><Text style={styles.activeTabText}>Open inbox</Text><View style={styles.tabCount}><Text style={styles.tabCountText}>{conversations.length}</Text></View></View><View style={styles.realtimeLabel}>{realtimeStatus === "connected" ? <Wifi color={Colors.green} size={13} /> : <X color={Colors.textDim} size={13} />}<Text style={[styles.realtimeText, { color: realtimeStatus === "connected" ? Colors.green : Colors.textDim }]}>{realtimeStatus === "connected" ? "Realtime" : source === "live" ? "Syncing" : "Preview data"}</Text></View></View>
      <View style={styles.sectionTop}><SectionHeading eyebrow="INBOX" title="Latest conversations" /><StatusPill label={`${unreadCount} unread`} tone="pink" /></View>
      {loading ? <View style={styles.listLoading}><ActivityIndicator color={Colors.primarySoft} /><Text style={styles.loadingText}>Loading inbox…</Text></View> : <View style={styles.list}>{visibleConversations.map((item: Conversation) => <Pressable key={item.id} onPress={() => openConversation(item)} style={({ pressed }) => [styles.conversationCard, item.unreadCount > 0 && styles.unreadCard, pressed && styles.pressed]}><View style={styles.conversationTop}><Avatar color={item.priority === "Escalated" ? Colors.red : item.priority === "Priority" ? Colors.primarySoft : Colors.cyan} name={item.name} size={40} /><View style={styles.conversationCopy}><View style={styles.nameRow}><Text style={[styles.conversationName, item.unreadCount > 0 && styles.unreadName]}>{item.name}</Text>{item.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}</View><Text style={styles.topic}>{item.topic}</Text><Text style={styles.email}>{item.email}</Text></View><View style={styles.timeColumn}><Text style={styles.time}>{item.time}</Text>{item.unreadCount > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{item.unreadCount}</Text></View> : null}</View></View><Text numberOfLines={1} style={styles.preview}>{item.preview}</Text><View style={styles.conversationBottom}><MonoLabel>{item.id}</MonoLabel><View style={styles.metaRight}>{item.priority === "Escalated" ? <ShieldAlert color={Colors.red} size={13} /> : <CheckCheck color={Colors.green} size={13} />}<Text style={[styles.priority, { color: item.priority === "Escalated" ? Colors.red : item.priority === "Priority" ? Colors.primarySoft : Colors.textMuted }]}>{item.priority}</Text><ChevronRight color={Colors.textDim} size={16} /></View></View></Pressable>)}</View>}
      {!loading && !visibleConversations.length ? <View style={styles.emptyState}><MessageCircleMore color={Colors.textDim} size={22} /><Text style={styles.emptyTitle}>No conversations found</Text><Text style={styles.emptyText}>Try a different search term.</Text></View> : null}
      <View style={styles.footerNote}><Text style={styles.footerNoteText}>Tap a conversation to open the live thread</Text></View>
    </AdminShell>
  );
}

function SearchIcon(): React.ReactElement {
  return <MessageCircleMore color={Colors.textDim} size={17} />;
}

const styles = {
  inboxHero: { alignItems: "center" as const, backgroundColor: "#0E282D", borderColor: "#174B52", borderRadius: 18, borderWidth: 1, flexDirection: "row" as const, minHeight: 88, paddingHorizontal: 15 },
  inboxIcon: { alignItems: "center" as const, backgroundColor: "#16434A", borderRadius: 13, height: 45, justifyContent: "center" as const, width: 45 },
  inboxCopy: { flex: 1, marginLeft: 12 },
  inboxValue: { color: Colors.cyan, fontSize: 28, fontWeight: "900" as const, letterSpacing: -1 },
  inboxLabel: { color: "#9BDDE1", fontSize: 11, marginTop: 2 },
  slaBox: { alignItems: "center" as const, backgroundColor: "#103B2D", borderRadius: 9, flexDirection: "row" as const, gap: 5, paddingHorizontal: 8, paddingVertical: 7 },
  slaText: { color: Colors.green, fontSize: 10, fontWeight: "900" as const },
  searchBox: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 13, borderWidth: 1, flexDirection: "row" as const, gap: 8, height: 46, marginTop: 16, paddingHorizontal: 12 },
  searchInput: { color: Colors.text, flex: 1, fontSize: 12, height: 46 },
  tabRow: { alignItems: "center" as const, borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 18 },
  activeTab: { alignItems: "center" as const, borderBottomColor: Colors.primarySoft, borderBottomWidth: 2, flexDirection: "row" as const, gap: 7, paddingBottom: 11, paddingHorizontal: 2 },
  activeTabText: { color: Colors.text, fontSize: 12, fontWeight: "900" as const },
  tabCount: { alignItems: "center" as const, backgroundColor: "#3A1029", borderRadius: 8, justifyContent: "center" as const, minHeight: 19, minWidth: 19, paddingHorizontal: 5 },
  tabCountText: { color: Colors.primarySoft, fontSize: 9, fontWeight: "900" as const },
  realtimeLabel: { alignItems: "center" as const, flexDirection: "row" as const, gap: 5, paddingBottom: 11 },
  realtimeText: { fontSize: 9, fontWeight: "900" as const, letterSpacing: 0.5 },
  sectionTop: { alignItems: "flex-end" as const, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 27 },
  list: { gap: 10, marginTop: 14 },
  conversationCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 17, borderWidth: 1, padding: 14 },
  unreadCard: { backgroundColor: "#1C1721", borderColor: "#4D2342" },
  conversationTop: { alignItems: "center" as const, flexDirection: "row" as const },
  conversationCopy: { flex: 1, marginLeft: 10 },
  nameRow: { alignItems: "center" as const, flexDirection: "row" as const, gap: 6 },
  conversationName: { color: Colors.textMuted, fontSize: 13, fontWeight: "700" as const },
  unreadName: { color: Colors.text, fontWeight: "900" as const },
  unreadDot: { backgroundColor: Colors.primarySoft, borderRadius: 4, height: 7, width: 7 },
  topic: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  email: { color: Colors.textDim, fontSize: 9, marginTop: 3 },
  timeColumn: { alignItems: "flex-end" as const, gap: 7 },
  time: { color: Colors.textDim, fontSize: 10, fontWeight: "700" as const },
  unreadBadge: { alignItems: "center" as const, backgroundColor: Colors.primary, borderRadius: 10, minHeight: 20, minWidth: 20, justifyContent: "center" as const, paddingHorizontal: 5 },
  unreadBadgeText: { color: Colors.white, fontSize: 9, fontWeight: "900" as const },
  preview: { color: Colors.textMuted, fontSize: 11, marginTop: 13 },
  conversationBottom: { alignItems: "center" as const, borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 13, paddingTop: 11 },
  metaRight: { alignItems: "center" as const, flexDirection: "row" as const, gap: 5 },
  priority: { fontSize: 10, fontWeight: "800" as const, marginRight: 4 },
  listLoading: { alignItems: "center" as const, gap: 9, paddingVertical: 56 },
  loadingText: { color: Colors.textMuted, fontSize: 11 },
  emptyState: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 17, borderWidth: 1, marginTop: 14, paddingVertical: 32 },
  emptyTitle: { color: Colors.text, fontSize: 14, fontWeight: "900" as const, marginTop: 9 },
  emptyText: { color: Colors.textMuted, fontSize: 10, marginTop: 5 },
  footerNote: { alignItems: "center" as const, marginTop: 20 },
  footerNoteText: { color: Colors.textDim, fontSize: 10, fontWeight: "600" as const },
  chatShell: { paddingBottom: 0 },
  chatContainer: { flex: 1 },
  chatHeader: { alignItems: "center" as const, flexDirection: "row" as const, gap: 9, paddingBottom: 14 },
  backButton: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 11, borderWidth: 1, height: 40, justifyContent: "center" as const, width: 40 },
  chatHeaderCopy: { flex: 1 },
  chatName: { color: Colors.text, fontSize: 15, fontWeight: "900" as const },
  chatEmail: { color: Colors.textMuted, fontSize: 10, marginTop: 3 },
  liveStatus: { alignItems: "center" as const, flexDirection: "row" as const, gap: 5 },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  liveStatusText: { fontSize: 9, fontWeight: "900" as const, letterSpacing: 0.7 },
  topicBar: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 12, padding: 12 },
  topicBarCopy: { flex: 1 },
  topicLabel: { color: Colors.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1 },
  topicValue: { color: Colors.text, fontSize: 12, fontWeight: "800" as const, marginTop: 4 },
  chatLoading: { alignItems: "center" as const, flex: 1, gap: 9, justifyContent: "center" as const },
  messageList: { gap: 10, paddingBottom: 12, paddingTop: 6 },
  messageRow: { alignItems: "flex-start" as const, flexDirection: "row" as const },
  messageRowSupport: { justifyContent: "flex-end" as const },
  messageBubble: { borderRadius: 17, maxWidth: "82%" as const, paddingHorizontal: 13, paddingVertical: 10 },
  userBubble: { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderBottomLeftRadius: 5 },
  supportBubble: { backgroundColor: "#3A1029", borderBottomRightRadius: 5 },
  messageBody: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  supportMessageBody: { color: Colors.text },
  messageTime: { color: Colors.textDim, fontSize: 8, marginTop: 6 },
  supportMessageTime: { color: "#DDAABC", textAlign: "right" as const },
  emptyMessages: { alignItems: "center" as const, paddingVertical: 40 },
  emptyMessagesText: { color: Colors.textMuted, fontSize: 11, marginTop: 8 },
  composerRow: { alignItems: "flex-end" as const, borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, gap: 9, paddingTop: 11 },
  composerInput: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 14, borderWidth: 1, color: Colors.text, flex: 1, fontSize: 12, maxHeight: 100, minHeight: 44, paddingHorizontal: 13, paddingVertical: 11 },
  sendButton: { alignItems: "center" as const, backgroundColor: Colors.cyan, borderRadius: 13, height: 44, justifyContent: "center" as const, width: 44 },
  disabledButton: { opacity: 0.42 },
  pressed: { opacity: 0.68 },
};
