import { Ban, Check, Coins, Minus, Plus, Search, ShieldAlert, Smartphone, UserRoundCheck, UsersRound, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { AdminShell } from "@/components/AdminShell";
import { Avatar, MonoLabel, SectionHeading, StatusPill } from "@/components/ui";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { fetchHubUsers, HubUser, isUserLiveConfigured, adjustUserBalance, toggleBanUser, UserRisk } from "@/services/userService";

type UserFilter = "All" | "Banned" | "High Risk";

function formatCoins(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function riskTone(risk: UserRisk): "green" | "amber" | "red" {
  return risk === "High risk" ? "red" : risk === "Watch" ? "amber" : "green";
}

function UserActionModal({
  user,
  isSuperAdmin,
  loading,
  onClose,
  onBan,
  onAdjust,
}: {
  user: HubUser | null;
  isSuperAdmin: boolean;
  loading: boolean;
  onClose: () => void;
  onBan: (isBanned: boolean, reason: string) => Promise<void>;
  onAdjust: (coins: number, reason: string) => Promise<void>;
}): React.ReactElement | null {
  const [banReason, setBanReason] = useState<string>("");
  const [coins, setCoins] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [adjustmentMode, setAdjustmentMode] = useState<"add" | "remove">("add");

  useEffect(() => {
    setBanReason("");
    setCoins("");
    setAdjustmentReason("");
    setAdjustmentMode("add");
  }, [user?.id]);

  if (!user) return null;
  const nextBanned: boolean = user.status === "Active";

  const submitBan = async (): Promise<void> => {
    if (!isSuperAdmin) {
      Alert.alert("Super Admin approval needed", "Support Agents can review users but cannot ban or unban accounts.");
      return;
    }
    if (nextBanned && !banReason.trim()) {
      Alert.alert("Add a reason", "A reason is required for the ban audit trail.");
      return;
    }
    await onBan(nextBanned, banReason.trim() || "Account restored after admin review.");
  };

  const submitAdjustment = async (): Promise<void> => {
    if (!isSuperAdmin) {
      Alert.alert("Super Admin approval needed", "Support Agents cannot adjust member balances.");
      return;
    }
    const value: number = Number(coins);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert("Enter a coin amount", "Use a positive whole number of coins.");
      return;
    }
    if (!adjustmentReason.trim()) {
      Alert.alert("Add a reason", "Balance adjustments must include an audit reason.");
      return;
    }
    await onAdjust(adjustmentMode === "add" ? Math.round(value) : -Math.round(value), adjustmentReason.trim());
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
        <Pressable accessibilityLabel="Close user actions" onPress={onClose} style={styles.backdrop} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Avatar color={user.status === "Banned" ? Colors.red : Colors.cyan} name={user.name} size={46} />
            <View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>{user.name}</Text><Text style={styles.modalSubtitle}>{user.email} · {user.id}</Text></View>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><X color={Colors.textMuted} size={19} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.userSummary}><View><Text style={styles.summaryLabel}>BALANCE</Text><Text style={styles.summaryValue}>{formatCoins(user.balance)}</Text><Text style={styles.summaryUnit}>coins</Text></View><View><Text style={styles.summaryLabel}>LEVEL</Text><Text style={styles.summaryValue}>L{user.level}</Text></View><View><Text style={styles.summaryLabel}>RISK</Text><StatusPill label={user.risk} tone={riskTone(user.risk)} /></View></View>

            <View style={styles.formSection}><View style={styles.formTitleRow}><View style={styles.formIconRed}><Ban color={Colors.red} size={15} /></View><View><Text style={styles.formTitle}>{user.status === "Active" ? "Ban account" : "Restore account"}</Text><Text style={styles.formHint}>{user.status === "Active" ? "Stop access and record the reason" : "Return this member to active status"}</Text></View><Switch disabled={!isSuperAdmin || loading} onValueChange={() => void submitBan()} thumbColor={user.status === "Active" ? Colors.white : Colors.red} trackColor={{ false: Colors.borderStrong, true: Colors.red }} value={user.status === "Banned"} /></View><TextInput editable={isSuperAdmin && !loading} onChangeText={setBanReason} placeholder={nextBanned ? "Reason for ban (required)" : "Optional restore note"} placeholderTextColor={Colors.textDim} style={styles.textInput} value={banReason} /></View>

            <View style={styles.formSection}><View style={styles.formTitleRow}><View style={styles.formIconCyan}><Coins color={Colors.cyan} size={15} /></View><View><Text style={styles.formTitle}>Manual coin adjustment</Text><Text style={styles.formHint}>Every change is written to the audit log</Text></View></View><View style={styles.adjustmentModeRow}><Pressable disabled={!isSuperAdmin || loading} onPress={() => setAdjustmentMode("add")} style={[styles.adjustmentMode, adjustmentMode === "add" && styles.adjustmentModeActive]}><Plus color={adjustmentMode === "add" ? Colors.green : Colors.textDim} size={15} /><Text style={[styles.adjustmentModeText, adjustmentMode === "add" && styles.adjustmentModeTextActive]}>Add coins</Text></Pressable><Pressable disabled={!isSuperAdmin || loading} onPress={() => setAdjustmentMode("remove")} style={[styles.adjustmentMode, adjustmentMode === "remove" && styles.adjustmentModeRemoveActive]}><Minus color={adjustmentMode === "remove" ? Colors.red : Colors.textDim} size={15} /><Text style={[styles.adjustmentModeText, adjustmentMode === "remove" && styles.adjustmentModeTextRemoveActive]}>Remove</Text></Pressable></View><TextInput editable={isSuperAdmin && !loading} keyboardType="number-pad" onChangeText={setCoins} placeholder="0" placeholderTextColor={Colors.textDim} style={styles.coinInput} value={coins} /><TextInput editable={isSuperAdmin && !loading} onChangeText={setAdjustmentReason} placeholder="Reason for adjustment (required)" placeholderTextColor={Colors.textDim} style={styles.textInput} value={adjustmentReason} /><Pressable disabled={loading || !isSuperAdmin} onPress={() => void submitAdjustment()} style={({ pressed }) => [styles.adjustButton, pressed && styles.pressed, (!isSuperAdmin || loading) && styles.disabledButton]}>{loading ? <ActivityIndicator color={Colors.background} size="small" /> : <><Check color={Colors.background} size={15} /><Text style={styles.adjustButtonText}>Apply adjustment</Text></>}</Pressable></View>
            {!isSuperAdmin ? <View style={styles.permissionNotice}><ShieldAlert color={Colors.amber} size={15} /><Text style={styles.permissionNoticeText}>Review-only mode. Destructive user actions require a Super Admin.</Text></View> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function UsersScreen(): React.ReactElement {
  const { admin } = useAuth();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [filter, setFilter] = useState<UserFilter>("All");
  const [users, setUsers] = useState<HubUser[]>([]);
  const [source, setSource] = useState<"live" | "demo" | "fallback">("demo");
  const [selectedUser, setSelectedUser] = useState<HubUser | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const isSuperAdmin: boolean = admin?.role === "super_admin";

  const loadUsers = async (): Promise<void> => {
    setLoading(true);
    const result = await fetchHubUsers();
    setUsers(result.items);
    setSource(result.source);
    setLoading(false);
  };

  useEffect(() => { void loadUsers(); }, []);

  const visibleUsers: HubUser[] = useMemo(() => {
    const normalizedQuery: string = query.trim().toLowerCase();
    return users.filter((user: HubUser) => {
      const matchesQuery: boolean = !normalizedQuery || user.name.toLowerCase().includes(normalizedQuery) || user.email.toLowerCase().includes(normalizedQuery) || user.deviceId.toLowerCase().includes(normalizedQuery);
      const matchesFilter: boolean = filter === "All" || (filter === "Banned" ? user.status === "Banned" : user.risk === "High risk");
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, users]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleBan = async (isBanned: boolean, reason: string): Promise<void> => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await toggleBanUser(selectedUser.id, isBanned, reason);
      const updated: HubUser = { ...selectedUser, status: isBanned ? "Banned" : "Active" };
      setUsers((current: HubUser[]) => current.map((item: HubUser) => item.id === updated.id ? updated : item));
      setSelectedUser(updated);
      Alert.alert(isBanned ? "Account banned" : "Account restored", `${updated.name} was updated successfully.`);
    } catch (error) {
      Alert.alert("Action failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustment = async (coins: number, reason: string): Promise<void> => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adjustUserBalance(selectedUser.id, coins, reason);
      const updated: HubUser = { ...selectedUser, balance: selectedUser.balance + coins };
      setUsers((current: HubUser[]) => current.map((item: HubUser) => item.id === updated.id ? updated : item));
      setSelectedUser(updated);
      Alert.alert("Balance updated", `${coins > 0 ? "+" : ""}${formatCoins(coins)} coins applied to ${updated.name}.`);
    } catch (error) {
      Alert.alert("Adjustment failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const counts: { label: UserFilter; count: number }[] = [
    { label: "All", count: users.length },
    { label: "Banned", count: users.filter((user: HubUser) => user.status === "Banned").length },
    { label: "High Risk", count: users.filter((user: HubUser) => user.risk === "High risk").length },
  ];

  return (
    <AdminShell onRefresh={handleRefresh} refreshing={refreshing} subtitle="Protect the earning community" title="User hub">
      <View style={styles.riskSummary}><View style={styles.riskSummaryIcon}><ShieldAlert color={Colors.red} size={21} /></View><View style={styles.riskSummaryCopy}><Text style={styles.riskSummaryTitle}>Risk monitor is active</Text><Text style={styles.riskSummaryText}>{users.filter((user: HubUser) => user.risk === "High risk").length} accounts need a human decision today</Text></View><View style={styles.riskScore}><Text style={styles.riskScoreValue}>94%</Text><Text style={styles.riskScoreLabel}>CLEAN</Text></View></View>
      <View style={styles.statsRow}><View style={styles.statItem}><UsersRound color={Colors.cyan} size={16} /><Text style={styles.statValue}>{users.length || "—"}</Text><Text style={styles.statLabel}>VISIBLE</Text></View><View style={styles.statItem}><ShieldAlert color={Colors.amber} size={16} /><Text style={styles.statValue}>{users.filter((user: HubUser) => user.risk === "High risk").length || "—"}</Text><Text style={styles.statLabel}>HIGH RISK</Text></View><View style={styles.statItem}><Ban color={Colors.red} size={16} /><Text style={styles.statValue}>{users.filter((user: HubUser) => user.status === "Banned").length || "—"}</Text><Text style={styles.statLabel}>BANNED</Text></View></View>
      <View style={styles.searchBox}><Search color={Colors.textDim} size={17} /><TextInput onChangeText={setQuery} placeholder="Search name, email, or device" placeholderTextColor={Colors.textDim} style={styles.searchInput} value={query} /></View>
      <View style={styles.filterRow}>{counts.map((item: { label: UserFilter; count: number }) => <Pressable key={item.label} onPress={() => setFilter(item.label)} style={({ pressed }) => [styles.filterChip, filter === item.label && styles.filterChipActive, pressed && styles.pressed]}><Text style={[styles.filterText, filter === item.label && styles.filterTextActive]}>{item.label}</Text><Text style={[styles.filterCount, filter === item.label && styles.filterCountActive]}>{item.count}</Text></Pressable>)}</View>
      <View style={styles.sectionTop}><SectionHeading eyebrow="MEMBERS" title={`${visibleUsers.length} accounts`} /><View style={styles.accessPill}><UserRoundCheck color={isSuperAdmin ? Colors.green : Colors.amber} size={13} /><Text style={[styles.accessText, { color: isSuperAdmin ? Colors.green : Colors.amber }]}>{isSuperAdmin ? "Can take action" : "Review only"}</Text></View></View>
      {loading ? <View style={styles.loadingState}><ActivityIndicator color={Colors.primarySoft} /><Text style={styles.loadingText}>Loading user hub…</Text></View> : <View style={styles.list}>{visibleUsers.map((user: HubUser) => <Pressable key={user.id} onPress={() => setSelectedUser(user)} style={({ pressed }) => [styles.userCard, user.status === "Banned" && styles.bannedCard, pressed && styles.pressed]}><View style={styles.userTop}><Avatar color={user.status === "Banned" ? Colors.red : user.risk === "High risk" ? Colors.primarySoft : Colors.cyan} name={user.name} size={43} /><View style={styles.userCopy}><View style={styles.nameRow}><Text style={styles.userName}>{user.name}</Text>{user.status === "Banned" ? <StatusPill label="Banned" tone="red" /> : null}</View><Text style={styles.userEmail}>{user.email}</Text><MonoLabel>{user.id} · joined {user.joinedAt}</MonoLabel></View></View><View style={styles.userStats}><View style={styles.userStat}><Coins color={Colors.amber} size={14} /><Text style={styles.userStatLabel}>BALANCE</Text><Text style={styles.userStatValue}>{formatCoins(user.balance)}</Text></View><View style={styles.userStat}><Text style={styles.levelMark}>L</Text><Text style={styles.userStatLabel}>LEVEL</Text><Text style={styles.userStatValue}>{user.level}</Text></View><View style={[styles.userStat, styles.deviceStat]}><Smartphone color={Colors.cyan} size={14} /><Text style={styles.userStatLabel}>DEVICE ID</Text><Text numberOfLines={1} style={styles.deviceValue}>{user.deviceId}</Text></View></View><View style={styles.userBottom}><View style={styles.riskRow}><StatusPill label={user.risk} tone={riskTone(user.risk)} /><Text style={styles.signalText}>{user.signals} signals</Text></View><Text style={styles.manageText}>Manage user ›</Text></View></Pressable>)}</View>}
      {!loading && !visibleUsers.length ? <View style={styles.emptyState}><Search color={Colors.cyan} size={22} /><Text style={styles.emptyTitle}>No matching users</Text><Text style={styles.emptyText}>Try a different search or filter.</Text></View> : null}
      <View style={styles.footerRow}><Text style={styles.disclaimer}>{source === "live" ? "Live user directory · Pull to refresh" : "Preview user directory · Supabase sync activates when configured"}</Text></View>
      <UserActionModal isSuperAdmin={isSuperAdmin} loading={actionLoading} onAdjust={handleAdjustment} onBan={handleBan} onClose={() => setSelectedUser(null)} user={selectedUser} />
    </AdminShell>
  );
}

const styles = {
  riskSummary: { alignItems: "center" as const, backgroundColor: "#2A1820", borderColor: "#5E283B", borderRadius: 18, borderWidth: 1, flexDirection: "row" as const, minHeight: 88, paddingHorizontal: 14 },
  riskSummaryIcon: { alignItems: "center" as const, backgroundColor: "#421C28", borderRadius: 12, height: 43, justifyContent: "center" as const, width: 43 },
  riskSummaryCopy: { flex: 1, marginLeft: 11 },
  riskSummaryTitle: { color: Colors.text, fontSize: 13, fontWeight: "900" as const },
  riskSummaryText: { color: "#DDAABC", fontSize: 10, marginTop: 5 },
  riskScore: { alignItems: "flex-end" as const },
  riskScoreValue: { color: Colors.green, fontSize: 20, fontWeight: "900" as const },
  riskScoreLabel: { color: Colors.green, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1, marginTop: 2 },
  statsRow: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row" as const, justifyContent: "space-around" as const, marginTop: 12, paddingVertical: 14 },
  statItem: { alignItems: "center" as const, gap: 5 },
  statValue: { color: Colors.text, fontSize: 15, fontWeight: "900" as const },
  statLabel: { color: Colors.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1 },
  searchBox: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 13, borderWidth: 1, flexDirection: "row" as const, gap: 8, height: 46, marginTop: 15, paddingHorizontal: 12 },
  searchInput: { color: Colors.text, flex: 1, fontSize: 12, height: 46 },
  filterRow: { flexDirection: "row" as const, gap: 8, marginTop: 11 },
  filterChip: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 999, borderWidth: 1, flexDirection: "row" as const, gap: 6, minHeight: 34, paddingHorizontal: 11 },
  filterChipActive: { backgroundColor: "#3A1029", borderColor: Colors.primarySoft },
  filterText: { color: Colors.textMuted, fontSize: 10, fontWeight: "800" as const },
  filterTextActive: { color: Colors.text },
  filterCount: { color: Colors.textDim, fontSize: 9, fontWeight: "900" as const },
  filterCountActive: { color: Colors.primarySoft },
  sectionTop: { alignItems: "flex-end" as const, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 26 },
  accessPill: { alignItems: "center" as const, flexDirection: "row" as const, gap: 5, marginBottom: 2 },
  accessText: { fontSize: 10, fontWeight: "800" as const },
  list: { gap: 11, marginTop: 14 },
  userCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, padding: 14 },
  bannedCard: { borderColor: "#5E283B" },
  userTop: { alignItems: "center" as const, flexDirection: "row" as const },
  userCopy: { flex: 1, marginLeft: 10 },
  nameRow: { alignItems: "center" as const, flexDirection: "row" as const, gap: 7 },
  userName: { color: Colors.text, flexShrink: 1, fontSize: 13, fontWeight: "900" as const },
  userEmail: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  userStats: { borderBottomColor: Colors.border, borderBottomWidth: 1, borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, marginTop: 14, paddingVertical: 12 },
  userStat: { borderRightColor: Colors.border, borderRightWidth: 1, flex: 1, gap: 4, paddingHorizontal: 9 },
  deviceStat: { borderRightWidth: 0, flex: 1.55 },
  userStatLabel: { color: Colors.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 0.8 },
  userStatValue: { color: Colors.text, fontSize: 14, fontWeight: "900" as const },
  deviceValue: { color: Colors.cyan, fontFamily: "monospace", fontSize: 9, fontWeight: "800" as const },
  levelMark: { color: Colors.primarySoft, fontSize: 15, fontWeight: "900" as const },
  userBottom: { alignItems: "center" as const, flexDirection: "row" as const, justifyContent: "space-between", marginTop: 12 },
  riskRow: { alignItems: "center" as const, flexDirection: "row" as const, gap: 7 },
  signalText: { color: Colors.textDim, fontSize: 9, fontWeight: "700" as const },
  manageText: { color: Colors.cyan, fontSize: 10, fontWeight: "900" as const },
  loadingState: { alignItems: "center" as const, gap: 9, paddingVertical: 55 },
  loadingText: { color: Colors.textMuted, fontSize: 11 },
  emptyState: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 17, borderWidth: 1, marginTop: 14, paddingVertical: 32 },
  emptyTitle: { color: Colors.text, fontSize: 14, fontWeight: "900" as const, marginTop: 9 },
  emptyText: { color: Colors.textMuted, fontSize: 10, marginTop: 5 },
  footerRow: { alignItems: "center" as const, marginTop: 18 },
  disclaimer: { color: Colors.textDim, fontSize: 10, textAlign: "center" as const },
  modalRoot: { flex: 1, justifyContent: "flex-end" as const },
  backdrop: { backgroundColor: "#000000B8", bottom: 0, left: 0, position: "absolute" as const, right: 0, top: 0 },
  modalCard: { backgroundColor: Colors.surfaceRaised, borderColor: Colors.borderStrong, borderTopLeftRadius: 27, borderTopRightRadius: 27, borderWidth: 1, maxHeight: "91%" as const, paddingHorizontal: 18, paddingTop: 10 },
  modalHandle: { alignSelf: "center" as const, backgroundColor: Colors.borderStrong, borderRadius: 3, height: 5, marginBottom: 17, width: 42 },
  modalHeader: { alignItems: "center" as const, flexDirection: "row" as const, gap: 10 },
  modalHeaderCopy: { flex: 1 },
  modalTitle: { color: Colors.text, fontSize: 17, fontWeight: "900" as const },
  modalSubtitle: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  closeButton: { alignItems: "center" as const, borderColor: Colors.border, borderRadius: 11, borderWidth: 1, height: 38, justifyContent: "center" as const, width: 38 },
  modalScroll: { paddingBottom: 30, paddingTop: 19 },
  userSummary: { backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 16, flexDirection: "row" as const, justifyContent: "space-around" as const, paddingVertical: 13 },
  summaryLabel: { color: Colors.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1, textAlign: "center" as const },
  summaryValue: { color: Colors.text, fontSize: 17, fontWeight: "900" as const, marginTop: 5, textAlign: "center" as const },
  summaryUnit: { color: Colors.textMuted, fontSize: 9, textAlign: "center" as const },
  formSection: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 17, borderWidth: 1, marginTop: 13, padding: 14 },
  formTitleRow: { alignItems: "center" as const, flexDirection: "row" as const, gap: 10 },
  formIconRed: { alignItems: "center" as const, backgroundColor: "#421C28", borderRadius: 10, height: 32, justifyContent: "center" as const, width: 32 },
  formIconCyan: { alignItems: "center" as const, backgroundColor: "#0C3137", borderRadius: 10, height: 32, justifyContent: "center" as const, width: 32 },
  formTitle: { color: Colors.text, fontSize: 12, fontWeight: "900" as const },
  formHint: { color: Colors.textMuted, fontSize: 9, marginTop: 3 },
  textInput: { backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 11, borderWidth: 1, color: Colors.text, fontSize: 11, marginTop: 12, minHeight: 43, paddingHorizontal: 12 },
  coinInput: { backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 11, borderWidth: 1, color: Colors.text, fontSize: 20, fontWeight: "900" as const, marginTop: 12, minHeight: 50, paddingHorizontal: 12 },
  adjustmentModeRow: { flexDirection: "row" as const, gap: 8, marginTop: 14 },
  adjustmentMode: { alignItems: "center" as const, borderColor: Colors.border, borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: "row" as const, gap: 5, justifyContent: "center" as const, minHeight: 37 },
  adjustmentModeActive: { backgroundColor: "#103B2D", borderColor: Colors.green },
  adjustmentModeRemoveActive: { backgroundColor: "#421C28", borderColor: Colors.red },
  adjustmentModeText: { color: Colors.textMuted, fontSize: 10, fontWeight: "800" as const },
  adjustmentModeTextActive: { color: Colors.green },
  adjustmentModeTextRemoveActive: { color: Colors.red },
  adjustButton: { alignItems: "center" as const, backgroundColor: Colors.cyan, borderRadius: 11, flexDirection: "row" as const, gap: 6, justifyContent: "center" as const, marginTop: 12, minHeight: 45 },
  adjustButtonText: { color: Colors.background, fontSize: 11, fontWeight: "900" as const },
  permissionNotice: { alignItems: "center" as const, backgroundColor: "#3C2E1A", borderColor: "#6E5122", borderRadius: 12, flexDirection: "row" as const, gap: 8, marginTop: 13, padding: 11 },
  permissionNoticeText: { color: Colors.amber, flex: 1, fontSize: 10, lineHeight: 15 },
  disabledButton: { opacity: 0.48 },
  pressed: { opacity: 0.68 },
};
