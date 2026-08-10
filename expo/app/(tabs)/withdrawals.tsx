import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { Check, ChevronRight, Clock3, Coins, Copy, CreditCard, Download, FileText, History, LockKeyhole, Mail, RefreshCw, Search, Share2, ShieldAlert, UserRound, X, XCircle } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminShell } from "@/components/AdminShell";
import { Avatar, MonoLabel, SectionHeading, StatusPill } from "@/components/ui";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  RewardEvent,
  RealtimeStatus,
  WithdrawalRequest,
  WithdrawalSource,
  WithdrawalStatus,
  approveWithdrawal,
  buildWithdrawalsCsv,
  fetchRewardHistory,
  fetchWithdrawals,
  isWithdrawalLiveConfigured,
  rejectWithdrawalAndRefund,
  subscribeToWithdrawalRealtime,
} from "@/services/withdrawalService";

const STATUS_TABS: Array<{ key: WithdrawalStatus; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

type SheetKind = "approve" | "reject" | "audit" | null;

type WithdrawalCardProps = {
  item: WithdrawalRequest;
  isSelected: boolean;
  selectionMode: boolean;
  canAct: boolean;
  copied: boolean;
  onToggleSelect: (id: string) => void;
  onCopy: (item: WithdrawalRequest) => void;
  onOpenAudit: (item: WithdrawalRequest) => void;
  onApprove: (item: WithdrawalRequest) => void;
  onReject: (item: WithdrawalRequest) => void;
};

function riskTone(score: number): "green" | "amber" | "red" {
  if (score >= 75) {
    return "red";
  }
  if (score >= 45) {
    return "amber";
  }
  return "green";
}

function statusTone(status: WithdrawalStatus): "pink" | "green" | "red" {
  if (status === "approved") {
    return "green";
  }
  if (status === "rejected") {
    return "red";
  }
  return "pink";
}

function avatarColor(item: WithdrawalRequest): string {
  if (item.riskScore >= 75) {
    return Colors.red;
  }
  if (item.riskScore >= 45) {
    return Colors.amber;
  }
  return item.userName.length % 2 === 0 ? Colors.cyan : Colors.primarySoft;
}

function formatCoins(value: number): string {
  return `${value.toLocaleString()} coins`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 2, minimumFractionDigits: 2, style: "currency" }).format(value);
}

function formatSource(source: WithdrawalSource, liveStatus: RealtimeStatus): { label: string; tone: "green" | "cyan" | "amber" } {
  if (source === "fallback") {
    return { label: "FALLBACK", tone: "amber" };
  }
  if (liveStatus === "connected") {
    return { label: "REALTIME", tone: "green" };
  }
  if (source === "live") {
    return { label: "SYNCING", tone: "cyan" };
  }
  return { label: "PREVIEW DATA", tone: "amber" };
}

function SkeletonCard(): React.ReactElement {
  return <View style={styles.skeletonCard}><View style={styles.skeletonTop}><View style={styles.skeletonCircle} /><View style={styles.skeletonCopy}><View style={styles.skeletonLineWide} /><View style={styles.skeletonLineShort} /></View><View style={styles.skeletonAmount} /></View><View style={styles.skeletonMethod} /><View style={styles.skeletonActions}><View style={styles.skeletonButton} /><View style={styles.skeletonButton} /></View></View>;
}

function WithdrawalCard({ item, isSelected, selectionMode, canAct, copied, onToggleSelect, onCopy, onOpenAudit, onApprove, onReject }: WithdrawalCardProps): React.ReactElement {
  const isPending: boolean = item.status === "pending";
  return (
    <View style={[styles.withdrawalCard, isSelected && styles.withdrawalCardSelected]}>
      <Pressable delayLongPress={450} onLongPress={() => onOpenAudit(item)} onPress={() => onOpenAudit(item)} style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}>
        <View style={styles.cardTop}>
          {selectionMode && isPending ? <Pressable accessibilityLabel={isSelected ? `Deselect ${item.userName}` : `Select ${item.userName}`} hitSlop={8} onPress={() => onToggleSelect(item.id)} style={[styles.checkbox, isSelected && styles.checkboxSelected]}>{isSelected ? <Check color={Colors.background} size={14} strokeWidth={3} /> : null}</Pressable> : null}
          <Avatar color={avatarColor(item)} name={item.userName} size={46} />
          <View style={styles.userCopy}><Text style={styles.userName}>{item.userName}</Text><View style={styles.emailRow}><Mail color={Colors.textDim} size={11} /><Text numberOfLines={1} style={styles.email}>{item.email}</Text></View><MonoLabel>{item.id} · {item.requestedAt}</MonoLabel></View>
          <View style={styles.riskBlock}><StatusPill label={`RISK ${item.riskScore}`} tone={riskTone(item.riskScore)} /><Text style={styles.riskCaption}>{item.riskScore >= 75 ? "Flagged" : item.riskScore >= 45 ? "Review" : "Clear"}</Text></View>
        </View>
        <View style={styles.valueRow}><View style={styles.valueItem}><View style={styles.valueIcon}><Coins color={Colors.amber} size={14} /></View><View><Text style={styles.valueLabel}>DEDUCTED</Text><Text style={styles.valueText}>{formatCoins(item.deductedCoins)}</Text></View></View><View style={styles.valueDivider} /><View style={styles.valueItem}><View style={[styles.valueIcon, { backgroundColor: "#0C3137" }]}><CreditCard color={Colors.cyan} size={14} /></View><View><Text style={styles.valueLabel}>PAYOUT</Text><Text style={[styles.valueText, { color: Colors.cyan }]}>{formatUsd(item.usdAmount)}</Text></View></View></View>
        <View style={styles.paymentRow}><View style={styles.paymentIcon}><CreditCard color={Colors.primarySoft} size={16} /></View><View style={styles.paymentCopy}><Text style={styles.paymentMethod}>{item.paymentMethod}</Text><Text numberOfLines={1} style={styles.accountDetails}>{item.accountDetails}</Text></View><Pressable accessibilityLabel={`Copy account details for ${item.userName}`} onPress={() => onCopy(item)} style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}>{copied ? <Check color={Colors.green} size={14} /> : <Copy color={Colors.cyan} size={14} />}<Text style={[styles.copyText, copied && { color: Colors.green }]}>{copied ? "Copied" : "Tap to copy"}</Text></Pressable></View>
        <View style={styles.auditHint}><History color={Colors.textDim} size={13} /><Text style={styles.auditHintText}>Tap or hold for complete reward history</Text><ChevronRight color={Colors.textDim} size={15} /></View>
      </Pressable>
      {isPending ? <View style={styles.cardActions}>{canAct ? <><Pressable accessibilityLabel={`Reject ${item.userName}`} onPress={() => onReject(item)} style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}><XCircle color={Colors.red} size={16} /><Text style={styles.rejectText}>Reject</Text></Pressable><Pressable accessibilityLabel={`Approve ${item.userName}`} onPress={() => onApprove(item)} style={({ pressed }) => [styles.approveButton, pressed && styles.pressed]}><Check color={Colors.background} size={16} /><Text style={styles.approveText}>Approve payout</Text></Pressable></> : <View style={styles.reviewOnly}><LockKeyhole color={Colors.amber} size={13} /><Text style={styles.reviewOnlyText}>Support Agent · review only</Text></View>}</View> : <View style={styles.statusFooter}><StatusPill label={item.status} tone={statusTone(item.status)} /><Text style={styles.statusFooterText}>{item.status === "approved" ? "Funds released" : "Coins refunded"}</Text></View>}
    </View>
  );
}

function SheetBackdrop({ onClose }: { onClose: () => void }): React.ReactElement {
  return <Pressable accessibilityLabel="Close sheet" onPress={onClose} style={styles.sheetBackdrop} />;
}

function ApproveSheet({ item, loading, onClose, onConfirm }: { item: WithdrawalRequest; loading: boolean; onClose: () => void; onConfirm: () => void }): React.ReactElement {
  const insets = useSafeAreaInsets();
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible><View style={styles.sheetRoot}><SheetBackdrop onClose={onClose} /><View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}><View style={styles.sheetHandle} /><View style={styles.sheetTitleRow}><View style={styles.sheetIconGreen}><Check color={Colors.green} size={20} strokeWidth={3} /></View><View style={styles.sheetTitleCopy}><Text style={styles.sheetEyebrow}>RELEASE PAYOUT</Text><Text style={styles.sheetTitle}>Approve withdrawal?</Text></View><Pressable onPress={onClose} style={({ pressed }) => [styles.sheetClose, pressed && styles.pressed]}><X color={Colors.textMuted} size={19} /></Pressable></View><View style={styles.confirmCard}><View><Text style={styles.confirmName}>{item.userName}</Text><Text style={styles.confirmAccount}>{item.paymentMethod} · {item.accountDetails}</Text></View><Text style={styles.confirmAmount}>{formatUsd(item.usdAmount)}</Text></View><Text style={styles.sheetMessage}>This will trigger the secure payout workflow and mark {item.userName.split(" ")[0] ?? "this member"}'s coins as released.</Text><View style={styles.sheetButtons}><Pressable disabled={loading} onPress={onClose} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}><Text style={styles.cancelText}>Not yet</Text></Pressable><Pressable disabled={loading} onPress={onConfirm} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed, loading && styles.disabledButton]}>{loading ? <ActivityIndicator color={Colors.background} /> : <><Check color={Colors.background} size={16} /><Text style={styles.confirmText}>Approve payout</Text></>}</Pressable></View></View></View></Modal>;
}

function RejectSheet({ item, reason, loading, onChangeReason, onClose, onConfirm }: { item: WithdrawalRequest; reason: string; loading: boolean; onChangeReason: (value: string) => void; onClose: () => void; onConfirm: () => void }): React.ReactElement {
  const insets = useSafeAreaInsets();
  const suggestions: string[] = ["Risk score exceeded threshold", "Payment details need verification", "Duplicate or suspicious activity"];
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetRoot}><SheetBackdrop onClose={onClose} /><View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}><View style={styles.sheetHandle} /><View style={styles.sheetTitleRow}><View style={styles.sheetIconRed}><X color={Colors.red} size={20} strokeWidth={3} /></View><View style={styles.sheetTitleCopy}><Text style={styles.sheetEyebrow}>RETURN COINS</Text><Text style={styles.sheetTitle}>Reject withdrawal</Text></View><Pressable onPress={onClose} style={({ pressed }) => [styles.sheetClose, pressed && styles.pressed]}><X color={Colors.textMuted} size={19} /></Pressable></View><Text style={styles.rejectIntro}>Why is <Text style={styles.rejectIntroStrong}>{item.userName}</Text>'s {formatUsd(item.usdAmount)} payout being rejected?</Text><View style={styles.suggestionRow}>{suggestions.map((suggestion: string) => <Pressable key={suggestion} onPress={() => onChangeReason(suggestion)} style={({ pressed }) => [styles.suggestionChip, reason === suggestion && styles.suggestionChipActive, pressed && styles.pressed]}><Text style={[styles.suggestionText, reason === suggestion && styles.suggestionTextActive]}>{suggestion}</Text></Pressable>)}</View><TextInput autoFocus multiline onChangeText={onChangeReason} placeholder="Enter a clear reason for the audit trail..." placeholderTextColor={Colors.textDim} style={styles.reasonInput} textAlignVertical="top" value={reason} /><View style={styles.sheetButtons}><Pressable disabled={loading} onPress={onClose} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable disabled={loading || !reason.trim()} onPress={onConfirm} style={({ pressed }) => [styles.rejectConfirmButton, pressed && styles.pressed, (loading || !reason.trim()) && styles.disabledButton]}>{loading ? <ActivityIndicator color={Colors.white} /> : <><X color={Colors.white} size={16} /><Text style={styles.rejectConfirmText}>Reject & refund</Text></>}</Pressable></View></View></KeyboardAvoidingView></Modal>;
}

function AuditDrawer({ item, events, loading, onClose }: { item: WithdrawalRequest; events: RewardEvent[]; loading: boolean; onClose: () => void }): React.ReactElement {
  const insets = useSafeAreaInsets();
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible><View style={styles.sheetRoot}><SheetBackdrop onClose={onClose} /><View style={[styles.auditDrawer, { paddingBottom: insets.bottom + 12 }]}><View style={styles.sheetHandle} /><View style={styles.auditHeader}><View style={styles.auditHeaderIcon}><UserRound color={Colors.cyan} size={19} /></View><View style={styles.auditHeaderCopy}><Text style={styles.sheetEyebrow}>MEMBER AUDIT DRAWER</Text><Text style={styles.sheetTitle}>{item.userName}</Text><Text style={styles.auditEmail}>{item.email}</Text></View><Pressable onPress={onClose} style={({ pressed }) => [styles.sheetClose, pressed && styles.pressed]}><X color={Colors.textMuted} size={19} /></Pressable></View><View style={styles.auditSummary}><View><Text style={styles.auditSummaryLabel}>RISK SCORE</Text><Text style={[styles.auditSummaryValue, { color: riskTone(item.riskScore) === "red" ? Colors.red : riskTone(item.riskScore) === "amber" ? Colors.amber : Colors.green }]}>{item.riskScore}</Text></View><View><Text style={styles.auditSummaryLabel}>PAYOUT</Text><Text style={styles.auditSummaryValue}>{formatUsd(item.usdAmount)}</Text></View><View><Text style={styles.auditSummaryLabel}>EVENTS</Text><Text style={styles.auditSummaryValue}>{events.length}</Text></View></View><View style={styles.historyHeading}><History color={Colors.primarySoft} size={16} /><Text style={styles.historyTitle}>Reward events</Text><Text style={styles.historyHint}>Complete history</Text></View>{loading ? <View style={styles.auditLoading}><ActivityIndicator color={Colors.primarySoft} /><Text style={styles.auditLoadingText}>Loading reward events…</Text></View> : <FlatList contentContainerStyle={styles.eventList} data={events} keyExtractor={(event: RewardEvent) => event.id} ListEmptyComponent={<View style={styles.auditEmpty}><FileText color={Colors.textDim} size={22} /><Text style={styles.auditEmptyTitle}>No reward events found</Text><Text style={styles.auditEmptyText}>This member has no visible activity yet.</Text></View>} renderItem={({ item: event }: ListRenderItemInfo<RewardEvent>) => <RewardEventRow event={event} />} showsVerticalScrollIndicator={false} />}</View></View></Modal>;
}

function RewardEventRow({ event }: { event: RewardEvent }): React.ReactElement {
  const accent: string = event.eventType === "cashout" ? Colors.primarySoft : event.eventType === "bonus" ? Colors.amber : event.eventType === "referral" ? Colors.cyan : Colors.green;
  return <View style={styles.eventRow}><View style={[styles.eventIcon, { backgroundColor: `${accent}18` }]}>{event.eventType === "cashout" ? <CreditCard color={accent} size={15} /> : event.eventType === "referral" ? <Share2 color={accent} size={15} /> : <Coins color={accent} size={15} />}</View><View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventDescription}>{event.description}</Text><Text style={styles.eventTime}>{event.createdAt}</Text></View><Text style={[styles.eventCoins, { color: accent }]}>{event.coins > 0 ? "+" : ""}{event.coins.toLocaleString()}</Text></View>;
}

export default function WithdrawalsScreen(): React.ReactElement {
  const { admin } = useAuth();
  const [status, setStatus] = useState<WithdrawalStatus>("pending");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [source, setSource] = useState<WithdrawalSource>(isWithdrawalLiveConfigured() ? "live" : "demo");
  const [liveError, setLiveError] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string>("");
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [target, setTarget] = useState<WithdrawalRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [auditEvents, setAuditEvents] = useState<RewardEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(isWithdrawalLiveConfigured() ? "reconnecting" : "unavailable");
  const isSuperAdmin: boolean = admin?.role === "super_admin";

  const loadWithdrawals = useCallback(async (showSkeleton: boolean): Promise<void> => {
    if (showSkeleton) {
      setIsLoading(true);
    }
    const result = await fetchWithdrawals(status);
    setWithdrawals(result.items);
    setSource(result.source);
    setLiveError(result.liveError ?? "");
    setIsLoading(false);
  }, [status]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectionMode(false);
    void loadWithdrawals(true);
  }, [loadWithdrawals]);

  useEffect(() => {
    const unsubscribe: () => void = subscribeToWithdrawalRealtime(() => {
      void loadWithdrawals(false);
    }, setRealtimeStatus);
    return unsubscribe;
  }, [loadWithdrawals]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadWithdrawals(false);
    setRefreshing(false);
  };

  const visibleWithdrawals: WithdrawalRequest[] = useMemo(() => {
    const normalizedQuery: string = query.trim().toLowerCase();
    return withdrawals.filter((item: WithdrawalRequest) => !normalizedQuery || item.userName.toLowerCase().includes(normalizedQuery) || item.email.toLowerCase().includes(normalizedQuery) || item.id.toLowerCase().includes(normalizedQuery) || item.paymentMethod.toLowerCase().includes(normalizedQuery));
  }, [query, withdrawals]);

  const selectedItems: WithdrawalRequest[] = useMemo(() => withdrawals.filter((item: WithdrawalRequest) => selectedIds.includes(item.id)), [selectedIds, withdrawals]);
  const allVisibleSelected: boolean = visibleWithdrawals.length > 0 && visibleWithdrawals.every((item: WithdrawalRequest) => selectedIds.includes(item.id));
  const sourceBadge = formatSource(source, realtimeStatus);

  const requireSuperAdmin = (): boolean => {
    if (isSuperAdmin) {
      return true;
    }
    Alert.alert("Super Admin approval needed", "Support Agents can review withdrawal details but cannot approve, reject, or export payout actions.");
    return false;
  };

  const openApprove = (item: WithdrawalRequest): void => {
    if (requireSuperAdmin()) {
      setTarget(item);
      setSheet("approve");
    }
  };

  const openReject = (item: WithdrawalRequest): void => {
    if (requireSuperAdmin()) {
      setRejectReason("");
      setTarget(item);
      setSheet("reject");
    }
  };

  const confirmApprove = async (): Promise<void> => {
    if (!target) {
      return;
    }
    setActionLoading(true);
    try {
      await approveWithdrawal(target.id);
      setSheet(null);
      setTarget(null);
      await loadWithdrawals(false);
    } catch (error) {
      Alert.alert("Approval failed", error instanceof Error ? error.message : "The payout could not be approved.");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReject = async (): Promise<void> => {
    if (!target || !rejectReason.trim()) {
      return;
    }
    setActionLoading(true);
    try {
      await rejectWithdrawalAndRefund(target.id, rejectReason.trim());
      setSheet(null);
      setTarget(null);
      setRejectReason("");
      await loadWithdrawals(false);
    } catch (error) {
      Alert.alert("Rejection failed", error instanceof Error ? error.message : "The payout could not be rejected.");
    } finally {
      setActionLoading(false);
    }
  };

  const openAudit = async (item: WithdrawalRequest): Promise<void> => {
    setTarget(item);
    setSheet("audit");
    setAuditEvents([]);
    setAuditLoading(true);
    const result = await fetchRewardHistory(item.userId);
    setAuditEvents(result.events);
    setAuditLoading(false);
  };

  const copyAccount = async (item: WithdrawalRequest): Promise<void> => {
    await Clipboard.setStringAsync(item.accountDetails);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((current: string) => current === item.id ? "" : current), 1800);
  };

  const toggleSelection = (id: string): void => {
    setSelectedIds((current: string[]) => current.includes(id) ? current.filter((currentId: string) => currentId !== id) : [...current, id]);
  };

  const toggleSelectAll = (): void => {
    if (allVisibleSelected) {
      setSelectedIds((current: string[]) => current.filter((id: string) => !visibleWithdrawals.some((item: WithdrawalRequest) => item.id === id)));
    } else {
      setSelectedIds((current: string[]) => Array.from(new Set([...current, ...visibleWithdrawals.map((item: WithdrawalRequest) => item.id)])));
    }
  };

  const exportSelected = async (): Promise<void> => {
    if (!requireSuperAdmin()) {
      return;
    }
    if (!selectedItems.length) {
      Alert.alert("Nothing selected", "Select one or more pending withdrawal requests first.");
      return;
    }
    const csv: string = buildWithdrawalsCsv(selectedItems);
    await Share.share({ message: csv, title: "Flash Earn pending withdrawals.csv" });
  };

  const renderItem = ({ item }: ListRenderItemInfo<WithdrawalRequest>): React.ReactElement => <WithdrawalCard canAct={isSuperAdmin} copied={copiedId === item.id} isSelected={selectedIds.includes(item.id)} item={item} onApprove={openApprove} onCopy={(request: WithdrawalRequest) => void copyAccount(request)} onOpenAudit={(request: WithdrawalRequest) => void openAudit(request)} onReject={openReject} onToggleSelect={toggleSelection} selectionMode={selectionMode} />;

  const listHeader = <View>
    <View style={styles.statusRow}><View style={styles.statusCopy}><View style={styles.statusLiveDot} /><Text style={styles.statusText}>{realtimeStatus === "connected" ? "Live withdrawal queue" : "Withdrawal queue"}</Text></View><StatusPill label={sourceBadge.label} tone={sourceBadge.tone} /></View>
    {liveError ? <View style={styles.fallbackNotice}><RefreshCw color={Colors.amber} size={13} /><Text style={styles.fallbackText}>Live data unavailable · showing preview requests</Text></View> : null}
    <View style={styles.summaryRow}><View><Text style={styles.summaryValue}>{status === "pending" ? withdrawals.length : withdrawals.length}</Text><Text style={styles.summaryLabel}>{status.toUpperCase()}</Text></View><View style={styles.summaryDivider} /><View><Text style={[styles.summaryValue, { color: Colors.cyan }]}>{formatUsd(withdrawals.reduce((total: number, item: WithdrawalRequest) => total + item.usdAmount, 0))}</Text><Text style={styles.summaryLabel}>VISIBLE VALUE</Text></View><View style={styles.summaryBadge}><Clock3 color={Colors.amber} size={14} /><Text style={styles.summaryBadgeText}>Secure flow</Text></View></View>
    <View style={styles.segmentedControl}>{STATUS_TABS.map((tab: { key: WithdrawalStatus; label: string }) => <Pressable key={tab.key} onPress={() => setStatus(tab.key)} style={({ pressed }) => [styles.segmentButton, status === tab.key && styles.segmentButtonActive, pressed && styles.pressed]}><Text style={[styles.segmentText, status === tab.key && styles.segmentTextActive]}>{tab.label}</Text>{status === tab.key ? <View style={styles.segmentIndicator} /> : null}</Pressable>)}</View>
    <View style={styles.searchRow}><View style={styles.searchBox}><Search color={Colors.textDim} size={17} /><TextInput onChangeText={setQuery} placeholder="Search name, email, or payout ID" placeholderTextColor={Colors.textDim} style={styles.searchInput} value={query} /></View><View style={styles.filterButton}><ShieldAlert color={Colors.cyan} size={17} /></View></View>
    {status === "pending" ? <View style={styles.selectionToolbar}><View><Text style={styles.selectionTitle}>{selectionMode ? `${selectedIds.length} selected` : "Batch tools"}</Text><Text style={styles.selectionSubtitle}>{selectionMode ? "Export a review-ready CSV" : "Select pending requests to export"}</Text></View><View style={styles.selectionActions}>{selectionMode ? <><Pressable onPress={toggleSelectAll} style={({ pressed }) => [styles.selectAllButton, pressed && styles.pressed]}><Text style={styles.selectAllText}>{allVisibleSelected ? "Clear all" : "Select all"}</Text></Pressable><Pressable disabled={!selectedItems.length} onPress={() => void exportSelected()} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed, !selectedItems.length && styles.disabledButton]}><Download color={selectedItems.length ? Colors.background : Colors.textDim} size={14} /><Text style={[styles.exportText, !selectedItems.length && styles.disabledText]}>CSV</Text></Pressable></> : <Pressable onPress={() => setSelectionMode(true)} style={({ pressed }) => [styles.selectButton, pressed && styles.pressed]}><Check color={Colors.cyan} size={14} /><Text style={styles.selectButtonText}>Select</Text></Pressable>}</View></View> : null}
    <View style={styles.sectionHeader}><SectionHeading eyebrow="WITHDRAWAL REQUESTS" title={`${visibleWithdrawals.length} visible`} /><View style={styles.accessPill}><LockKeyhole color={isSuperAdmin ? Colors.green : Colors.amber} size={12} /><Text style={[styles.accessText, { color: isSuperAdmin ? Colors.green : Colors.amber }]}>{isSuperAdmin ? "Full access" : "Review only"}</Text></View></View>
  </View>;

  return <AdminShell contentStyle={styles.shellContent} onRefresh={handleRefresh} refreshing={refreshing} scrollEnabled={false} subtitle="Verify, release, or refund member payouts" title="Withdrawal Requests"><FlatList contentContainerStyle={styles.listContent} data={visibleWithdrawals} keyExtractor={(item: WithdrawalRequest) => item.id} ListEmptyComponent={isLoading ? <View style={styles.skeletonList}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View> : <View style={styles.emptyState}><View style={styles.emptyIcon}><FileText color={Colors.cyan} size={23} /></View><Text style={styles.emptyTitle}>No {status} requests</Text><Text style={styles.emptyText}>{query ? "Try a different search term." : "The queue is clear for now."}</Text></View>} ListFooterComponent={<View style={styles.listFooter}><History color={Colors.textDim} size={13} /><Text style={styles.footerText}>{realtimeStatus === "connected" ? "Listening for payout and reward changes" : "Pull down to refresh the withdrawal queue"}</Text></View>} ListHeaderComponent={listHeader} refreshControl={<RefreshControl colors={[Colors.primary]} progressBackgroundColor={Colors.surfaceRaised} refreshing={refreshing} tintColor={Colors.primary} onRefresh={() => void handleRefresh()} />} renderItem={renderItem} showsVerticalScrollIndicator={false} /><>{sheet === "approve" && target ? <ApproveSheet item={target} loading={actionLoading} onClose={() => { setSheet(null); setTarget(null); }} onConfirm={() => void confirmApprove()} /> : null}{sheet === "reject" && target ? <RejectSheet item={target} loading={actionLoading} onChangeReason={setRejectReason} onClose={() => { setSheet(null); setTarget(null); setRejectReason(""); }} onConfirm={() => void confirmReject()} reason={rejectReason} /> : null}{sheet === "audit" && target ? <AuditDrawer events={auditEvents} item={target} loading={auditLoading} onClose={() => { setSheet(null); setTarget(null); }} /> : null}</></AdminShell>;
}

const styles = {
  shellContent: { paddingHorizontal: 0, paddingTop: 0 } as const,
  listContent: { paddingBottom: 24, paddingHorizontal: 18, paddingTop: 19 } as const,
  statusRow: { alignItems: "center" as const, flexDirection: "row" as const, justifyContent: "space-between" as const },
  statusCopy: { alignItems: "center" as const, flexDirection: "row" as const, gap: 7 },
  statusLiveDot: { backgroundColor: Colors.green, borderRadius: 4, height: 8, width: 8 },
  statusText: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" as const },
  fallbackNotice: { alignItems: "center" as const, backgroundColor: "#3C2E1A", borderRadius: 11, flexDirection: "row" as const, gap: 7, marginTop: 11, paddingHorizontal: 10, paddingVertical: 8 },
  fallbackText: { color: Colors.amber, flex: 1, fontSize: 10, fontWeight: "700" as const },
  summaryRow: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row" as const, justifyContent: "space-around" as const, marginTop: 15, minHeight: 91, paddingHorizontal: 9 },
  summaryValue: { color: Colors.primarySoft, fontSize: 23, fontWeight: "900" as const, letterSpacing: -0.6, textAlign: "center" as const },
  summaryLabel: { color: Colors.textDim, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1, marginTop: 4, textAlign: "center" as const },
  summaryDivider: { backgroundColor: Colors.border, height: 37, width: 1 },
  summaryBadge: { alignItems: "center" as const, backgroundColor: "#3C2E1A", borderRadius: 9, flexDirection: "row" as const, gap: 5, paddingHorizontal: 8, paddingVertical: 6 },
  summaryBadgeText: { color: Colors.amber, fontSize: 10, fontWeight: "800" as const },
  segmentedControl: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row" as const, marginTop: 15, padding: 4 },
  segmentButton: { alignItems: "center" as const, borderRadius: 10, flex: 1, justifyContent: "center" as const, minHeight: 42, position: "relative" as const },
  segmentButtonActive: { backgroundColor: "#3A1029" },
  segmentText: { color: Colors.textMuted, fontSize: 11, fontWeight: "800" as const },
  segmentTextActive: { color: Colors.primarySoft },
  segmentIndicator: { backgroundColor: Colors.primarySoft, borderRadius: 2, bottom: 4, height: 2, position: "absolute" as const, width: 22 },
  searchRow: { alignItems: "center" as const, flexDirection: "row" as const, gap: 9, marginTop: 14 },
  searchBox: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 13, borderWidth: 1, flex: 1, flexDirection: "row" as const, gap: 8, height: 46, paddingHorizontal: 12 },
  searchInput: { color: Colors.text, flex: 1, fontSize: 12, height: 46 },
  filterButton: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 13, borderWidth: 1, height: 46, justifyContent: "center" as const, width: 46 },
  selectionToolbar: { alignItems: "center" as const, backgroundColor: "#151F2A", borderColor: "#244455", borderRadius: 15, borderWidth: 1, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 13, paddingHorizontal: 12, paddingVertical: 10 },
  selectionTitle: { color: Colors.text, fontSize: 11, fontWeight: "900" as const },
  selectionSubtitle: { color: Colors.textMuted, fontSize: 9, marginTop: 3 },
  selectionActions: { alignItems: "center" as const, flexDirection: "row" as const, gap: 6 },
  selectButton: { alignItems: "center" as const, borderColor: Colors.cyan, borderRadius: 9, borderWidth: 1, flexDirection: "row" as const, gap: 5, minHeight: 34, paddingHorizontal: 10 },
  selectButtonText: { color: Colors.cyan, fontSize: 10, fontWeight: "900" as const },
  selectAllButton: { alignItems: "center" as const, minHeight: 34, justifyContent: "center" as const, paddingHorizontal: 5 },
  selectAllText: { color: Colors.cyan, fontSize: 10, fontWeight: "900" as const },
  exportButton: { alignItems: "center" as const, backgroundColor: Colors.cyan, borderRadius: 9, flexDirection: "row" as const, gap: 5, minHeight: 34, paddingHorizontal: 10 },
  exportText: { color: Colors.background, fontSize: 10, fontWeight: "900" as const },
  disabledButton: { opacity: 0.52 },
  disabledText: { color: Colors.textDim },
  sectionHeader: { alignItems: "flex-end" as const, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 27 },
  accessPill: { alignItems: "center" as const, flexDirection: "row" as const, gap: 5, marginBottom: 2 },
  accessText: { fontSize: 10, fontWeight: "800" as const },
  withdrawalCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 19, borderWidth: 1, marginTop: 12, overflow: "hidden" as const },
  withdrawalCardSelected: { borderColor: Colors.cyan, shadowColor: Colors.cyan, shadowOpacity: 0.18, shadowRadius: 10 },
  cardBody: { padding: 14 },
  cardTop: { alignItems: "center" as const, flexDirection: "row" as const },
  checkbox: { alignItems: "center" as const, borderColor: Colors.borderStrong, borderRadius: 7, borderWidth: 1, height: 22, justifyContent: "center" as const, marginRight: 9, width: 22 },
  checkboxSelected: { backgroundColor: Colors.cyan, borderColor: Colors.cyan },
  userCopy: { flex: 1, marginLeft: 10, minWidth: 0 },
  userName: { color: Colors.text, fontSize: 13, fontWeight: "900" as const, marginBottom: 4 },
  emailRow: { alignItems: "center" as const, flexDirection: "row" as const, gap: 4, marginBottom: 5 },
  email: { color: Colors.textMuted, flex: 1, fontSize: 9 },
  riskBlock: { alignItems: "flex-end" as const, marginLeft: 6 },
  riskCaption: { color: Colors.textDim, fontSize: 9, fontWeight: "700" as const, marginTop: 4 },
  valueRow: { alignItems: "center" as const, backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 13, borderWidth: 1, flexDirection: "row" as const, justifyContent: "space-around" as const, marginTop: 14, minHeight: 68, paddingHorizontal: 8 },
  valueItem: { alignItems: "center" as const, flexDirection: "row" as const, gap: 8, minWidth: 125 },
  valueIcon: { alignItems: "center" as const, backgroundColor: "#3C2E1A", borderRadius: 8, height: 28, justifyContent: "center" as const, width: 28 },
  valueLabel: { color: Colors.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 0.9 },
  valueText: { color: Colors.text, fontSize: 11, fontWeight: "900" as const, marginTop: 3 },
  valueDivider: { backgroundColor: Colors.border, height: 31, width: 1 },
  paymentRow: { alignItems: "center" as const, borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row" as const, gap: 9, paddingVertical: 13 },
  paymentIcon: { alignItems: "center" as const, backgroundColor: "#3A1029", borderRadius: 10, height: 34, justifyContent: "center" as const, width: 34 },
  paymentCopy: { flex: 1, minWidth: 0 },
  paymentMethod: { color: Colors.text, fontSize: 11, fontWeight: "800" as const },
  accountDetails: { color: Colors.textMuted, fontFamily: "monospace", fontSize: 9, marginTop: 4 },
  copyButton: { alignItems: "center" as const, borderColor: Colors.borderStrong, borderRadius: 9, borderWidth: 1, flexDirection: "row" as const, gap: 4, minHeight: 34, paddingHorizontal: 8 },
  copyText: { color: Colors.cyan, fontSize: 9, fontWeight: "900" as const },
  auditHint: { alignItems: "center" as const, flexDirection: "row" as const, gap: 5, paddingTop: 12 },
  auditHintText: { color: Colors.textDim, flex: 1, fontSize: 9, fontWeight: "700" as const },
  cardActions: { borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, gap: 8, padding: 12 },
  rejectButton: { alignItems: "center" as const, borderColor: Colors.borderStrong, borderRadius: 10, borderWidth: 1, flex: 0.85, flexDirection: "row" as const, gap: 5, height: 42, justifyContent: "center" as const },
  rejectText: { color: Colors.red, fontSize: 11, fontWeight: "900" as const },
  approveButton: { alignItems: "center" as const, backgroundColor: Colors.green, borderRadius: 10, flex: 1.35, flexDirection: "row" as const, gap: 5, height: 42, justifyContent: "center" as const },
  approveText: { color: Colors.background, fontSize: 11, fontWeight: "900" as const },
  reviewOnly: { alignItems: "center" as const, flexDirection: "row" as const, gap: 6, justifyContent: "center" as const, minHeight: 30, width: "100%" as const },
  reviewOnlyText: { color: Colors.amber, fontSize: 10, fontWeight: "800" as const },
  statusFooter: { alignItems: "center" as const, borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, gap: 8, padding: 12 },
  statusFooterText: { color: Colors.textMuted, fontSize: 10, fontWeight: "700" as const },
  skeletonList: { gap: 12, marginTop: 12 },
  skeletonCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 19, borderWidth: 1, minHeight: 220, padding: 14 },
  skeletonTop: { alignItems: "center" as const, flexDirection: "row" as const },
  skeletonCircle: { backgroundColor: Colors.surfaceBright, borderRadius: 23, height: 46, width: 46 },
  skeletonCopy: { flex: 1, gap: 8, marginLeft: 10 },
  skeletonLineWide: { backgroundColor: Colors.surfaceBright, borderRadius: 5, height: 12, width: 110 },
  skeletonLineShort: { backgroundColor: Colors.surfaceBright, borderRadius: 5, height: 9, width: 84 },
  skeletonAmount: { backgroundColor: Colors.surfaceBright, borderRadius: 5, height: 28, width: 59 },
  skeletonMethod: { backgroundColor: Colors.surfaceBright, borderRadius: 6, height: 55, marginTop: 15 },
  skeletonActions: { borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, gap: 8, marginTop: 14, paddingTop: 12 },
  skeletonButton: { backgroundColor: Colors.surfaceBright, borderRadius: 9, flex: 1, height: 42 },
  emptyState: { alignItems: "center" as const, paddingHorizontal: 32, paddingVertical: 55 },
  emptyIcon: { alignItems: "center" as const, backgroundColor: "#0C3137", borderRadius: 17, height: 52, justifyContent: "center" as const, width: 52 },
  emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: "900" as const, marginTop: 14 },
  emptyText: { color: Colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 6, textAlign: "center" as const },
  listFooter: { alignItems: "center" as const, flexDirection: "row" as const, gap: 6, justifyContent: "center" as const, paddingBottom: 4, paddingTop: 20 },
  footerText: { color: Colors.textDim, fontSize: 10, fontWeight: "700" as const },
  sheetRoot: { backgroundColor: "transparent", flex: 1, justifyContent: "flex-end" as const },
  sheetBackdrop: { backgroundColor: "#000000B8", bottom: 0, left: 0, position: "absolute" as const, right: 0, top: 0 },
  sheet: { backgroundColor: Colors.surfaceRaised, borderColor: Colors.borderStrong, borderTopLeftRadius: 27, borderTopRightRadius: 27, borderWidth: 1, paddingHorizontal: 18, paddingTop: 10 },
  sheetHandle: { alignSelf: "center" as const, backgroundColor: Colors.borderStrong, borderRadius: 3, height: 4, marginBottom: 20, width: 42 },
  sheetTitleRow: { alignItems: "center" as const, flexDirection: "row" as const, gap: 11 },
  sheetIconGreen: { alignItems: "center" as const, backgroundColor: "#103B2D", borderRadius: 13, height: 42, justifyContent: "center" as const, width: 42 },
  sheetIconRed: { alignItems: "center" as const, backgroundColor: "#421C28", borderRadius: 13, height: 42, justifyContent: "center" as const, width: 42 },
  sheetTitleCopy: { flex: 1 },
  sheetEyebrow: { color: Colors.textDim, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.3, marginBottom: 4 },
  sheetTitle: { color: Colors.text, fontSize: 20, fontWeight: "900" as const, letterSpacing: -0.5 },
  sheetClose: { alignItems: "center" as const, height: 40, justifyContent: "center" as const, width: 40 },
  confirmCard: { alignItems: "center" as const, backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 15, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 23, padding: 14 },
  confirmName: { color: Colors.text, fontSize: 13, fontWeight: "900" as const },
  confirmAccount: { color: Colors.textMuted, fontSize: 9, marginTop: 5, maxWidth: 205 },
  confirmAmount: { color: Colors.green, fontSize: 19, fontWeight: "900" as const },
  sheetMessage: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 15 },
  sheetButtons: { flexDirection: "row" as const, gap: 9, marginTop: 22 },
  cancelButton: { alignItems: "center" as const, borderColor: Colors.borderStrong, borderRadius: 12, borderWidth: 1, flex: 0.8, height: 49, justifyContent: "center" as const },
  cancelText: { color: Colors.textMuted, fontSize: 12, fontWeight: "900" as const },
  confirmButton: { alignItems: "center" as const, backgroundColor: Colors.green, borderRadius: 12, flex: 1.4, flexDirection: "row" as const, gap: 6, height: 49, justifyContent: "center" as const },
  confirmText: { color: Colors.background, fontSize: 12, fontWeight: "900" as const },
  rejectIntro: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 20 },
  rejectIntroStrong: { color: Colors.text, fontWeight: "900" as const },
  suggestionRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 7, marginTop: 14 },
  suggestionChip: { backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 7 },
  suggestionChipActive: { backgroundColor: "#421C28", borderColor: Colors.red },
  suggestionText: { color: Colors.textMuted, fontSize: 9, fontWeight: "700" as const },
  suggestionTextActive: { color: Colors.red },
  reasonInput: { backgroundColor: Colors.background, borderColor: Colors.borderStrong, borderRadius: 13, color: Colors.text, fontSize: 12, height: 86, marginTop: 13, padding: 12 },
  rejectConfirmButton: { alignItems: "center" as const, backgroundColor: Colors.red, borderRadius: 12, flex: 1.4, flexDirection: "row" as const, gap: 6, height: 49, justifyContent: "center" as const },
  rejectConfirmText: { color: Colors.white, fontSize: 12, fontWeight: "900" as const },
  auditDrawer: { backgroundColor: Colors.surfaceRaised, borderColor: Colors.borderStrong, borderTopLeftRadius: 27, borderTopRightRadius: 27, borderWidth: 1, maxHeight: "88%" as const, minHeight: "63%" as const, paddingHorizontal: 18, paddingTop: 10 },
  auditHeader: { alignItems: "center" as const, flexDirection: "row" as const, gap: 10 },
  auditHeaderIcon: { alignItems: "center" as const, backgroundColor: "#0C3137", borderRadius: 13, height: 42, justifyContent: "center" as const, width: 42 },
  auditHeaderCopy: { flex: 1 },
  auditEmail: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  auditSummary: { backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 15, flexDirection: "row" as const, justifyContent: "space-around" as const, marginTop: 18, paddingVertical: 13 },
  auditSummaryLabel: { color: Colors.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1, textAlign: "center" as const },
  auditSummaryValue: { color: Colors.text, fontSize: 17, fontWeight: "900" as const, marginTop: 4, textAlign: "center" as const },
  historyHeading: { alignItems: "center" as const, flexDirection: "row" as const, gap: 7, marginTop: 21 },
  historyTitle: { color: Colors.text, flex: 1, fontSize: 14, fontWeight: "900" as const },
  historyHint: { color: Colors.textDim, fontSize: 9, fontWeight: "800" as const },
  auditLoading: { alignItems: "center" as const, gap: 9, justifyContent: "center" as const, minHeight: 200 },
  auditLoadingText: { color: Colors.textMuted, fontSize: 11 },
  eventList: { paddingBottom: 12, paddingTop: 12 },
  eventRow: { alignItems: "flex-start" as const, borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row" as const, gap: 10, paddingVertical: 13 },
  eventIcon: { alignItems: "center" as const, borderRadius: 10, height: 34, justifyContent: "center" as const, width: 34 },
  eventCopy: { flex: 1 },
  eventTitle: { color: Colors.text, fontSize: 11, fontWeight: "900" as const },
  eventDescription: { color: Colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  eventTime: { color: Colors.textDim, fontSize: 9, marginTop: 4 },
  eventCoins: { fontFamily: "monospace", fontSize: 11, fontWeight: "900" as const, marginTop: 2 },
  auditEmpty: { alignItems: "center" as const, paddingVertical: 40 },
  auditEmptyTitle: { color: Colors.text, fontSize: 14, fontWeight: "900" as const, marginTop: 10 },
  auditEmptyText: { color: Colors.textMuted, fontSize: 10, marginTop: 5 },
  pressed: { opacity: 0.68 },
};
