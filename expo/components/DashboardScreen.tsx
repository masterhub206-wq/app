import { router } from "expo-router";
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, Clock3, RefreshCw, ShieldAlert, Sparkles, Users, WalletCards, X, Zap } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { AdminShell } from "@/components/AdminShell";
import { Avatar, SectionHeading, StatusPill } from "@/components/ui";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import {
  DashboardRange,
  DashboardSnapshot,
  DailyMetric,
  PendingWithdrawal,
  RealtimeStatus,
  SecurityAlert,
  fetchDashboardSnapshot,
  formatCurrency,
  formatCurrencyPrecise,
  isDashboardLiveConfigured,
  subscribeToDashboardRealtime,
  updateWithdrawalStatus,
} from "@/services/dashboardService";

type DashboardAction =
  | { type: "withdrawal"; item: PendingWithdrawal }
  | { type: "security"; item: SecurityAlert };

type DashboardHeaderProps = {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
  range: DashboardRange;
  realtimeStatus: RealtimeStatus;
  onRangeChange: (range: DashboardRange) => void;
};

type RevenueChartProps = {
  metrics: DailyMetric[];
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
};

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  totalUsers: 0,
  todaysSignups: 0,
  pendingCashoutsCount: 0,
  pendingCashoutsValue: 0,
  estimatedRevenue: 0,
  paidCashouts: 0,
  netProfit: 0,
  dailyMetrics: [],
  pendingWithdrawals: [],
  securityAlerts: [],
  updatedAt: "",
  source: "demo",
};

function initialsColor(name: string): string {
  const palette: string[] = [Colors.primarySoft, Colors.cyan, Colors.green, Colors.amber];
  const index: number = name.length % palette.length;
  return palette[index] ?? Colors.primarySoft;
}

function severityTone(severity: SecurityAlert["severity"]): "red" | "amber" | "cyan" {
  if (severity === "high") {
    return "red";
  }
  if (severity === "medium") {
    return "amber";
  }
  return "cyan";
}

function relativeDateLabel(value: string): string {
  const date: Date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function compactCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }
  return formatCurrency(value);
}

function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }): React.ReactElement {
  const opacity = useRef<Animated.Value>(new Animated.Value(0.42)).current;

  useEffect(() => {
    const animation: Animated.CompositeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { duration: 650, toValue: 0.8, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 650, toValue: 0.42, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeletonBlock, style, { opacity }]} />;
}

function StatCard({
  icon,
  label,
  value,
  detail,
  accent,
  detailColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  accent: string;
  detailColor?: string;
}): React.ReactElement {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}>{icon}</View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statDetail, { color: detailColor ?? accent }]}>{detail}</Text>
    </View>
  );
}

function SkeletonStatCard(): React.ReactElement {
  return (
    <View style={styles.statCard}>
      <SkeletonBlock style={styles.skeletonIcon} />
      <SkeletonBlock style={styles.skeletonLabel} />
      <SkeletonBlock style={styles.skeletonValue} />
      <SkeletonBlock style={styles.skeletonDetail} />
    </View>
  );
}

function DashboardHeader({ snapshot, isLoading, range, realtimeStatus, onRangeChange }: DashboardHeaderProps): React.ReactElement {
  const data: DashboardSnapshot = snapshot ?? EMPTY_SNAPSHOT;
  const sourceLabel: string = realtimeStatus === "connected" ? "REALTIME" : isDashboardLiveConfigured() ? "SYNCING" : "PREVIEW DATA";
  const sourceTone: "green" | "cyan" | "amber" = realtimeStatus === "connected" ? "green" : isDashboardLiveConfigured() ? "cyan" : "amber";

  return (
    <View>
      <View style={styles.signalRow}>
        <View style={styles.signalCopy}><View style={styles.signalDot} /><Text style={styles.signalText}>Dashboard pulse</Text></View>
        <StatusPill label={sourceLabel} tone={sourceTone} />
      </View>
      {data.source === "fallback" ? <View style={styles.fallbackNotice}><RefreshCw color={Colors.amber} size={14} /><Text style={styles.fallbackText}>Live tables need attention · showing the latest preview snapshot</Text></View> : null}

      <ScrollView contentContainerStyle={styles.statRow} horizontal showsHorizontalScrollIndicator={false}>
        {isLoading ? <><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></> : <>
          <StatCard accent={Colors.cyan} detail={`+${data.todaysSignups} today`} icon={<Users color={Colors.cyan} size={18} />} label="Total users" value={data.totalUsers.toLocaleString()} />
          <StatCard accent={Colors.primarySoft} detail={formatCurrencyPrecise(data.pendingCashoutsValue)} icon={<WalletCards color={Colors.primarySoft} size={18} />} label="Pending cashouts" value={data.pendingCashoutsCount.toString()} />
          <StatCard accent={data.netProfit >= 0 ? Colors.green : Colors.red} detail={`${formatCurrency(data.estimatedRevenue)} rev · ${formatCurrency(data.paidCashouts)} paid`} icon={data.netProfit >= 0 ? <ArrowUpRight color={Colors.green} size={18} /> : <ArrowDownRight color={Colors.red} size={18} />} label="Net profit" value={formatCurrency(data.netProfit)} detailColor={data.netProfit >= 0 ? Colors.green : Colors.red} />
        </>}
      </ScrollView>

      <RevenueChart metrics={data.dailyMetrics} range={range} onRangeChange={onRangeChange} />

      <View style={styles.urgentHeading}>
        <SectionHeading eyebrow="URGENT ACTION FEED" title="Needs your attention" />
        <View style={styles.feedHint}><Zap color={Colors.primarySoft} size={13} fill={Colors.primarySoft} /><Text style={styles.feedHintText}>Quick review</Text></View>
      </View>
    </View>
  );
}

function chartPath(values: number[], width: number, height: number, maxValue: number): string {
  const padding: number = 18;
  const plotWidth: number = Math.max(width - padding * 2, 1);
  const plotHeight: number = Math.max(height - 24, 1);
  return values.map((value: number, index: number) => {
    const x: number = padding + (index * plotWidth) / Math.max(values.length - 1, 1);
    const y: number = 10 + plotHeight - (value / Math.max(maxValue, 1)) * plotHeight;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function chartPoint(values: number[], index: number, width: number, height: number, maxValue: number): { x: number; y: number } {
  const padding: number = 18;
  const plotWidth: number = Math.max(width - padding * 2, 1);
  const plotHeight: number = Math.max(height - 24, 1);
  return {
    x: padding + (index * plotWidth) / Math.max(values.length - 1, 1),
    y: 10 + plotHeight - ((values[index] ?? 0) / Math.max(maxValue, 1)) * plotHeight,
  };
}

function RevenueChart({ metrics, range, onRangeChange }: RevenueChartProps): React.ReactElement {
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(Math.max(metrics.length - 1, 0));
  const chartHeight: number = 166;
  const revenueValues: number[] = metrics.map((item: DailyMetric) => item.revenue);
  const cashoutValues: number[] = metrics.map((item: DailyMetric) => item.cashouts);
  const maxValue: number = Math.max(...revenueValues, ...cashoutValues, 1);
  const selectedMetric: DailyMetric | undefined = metrics[selectedIndex];
  const selectedPoint: { x: number; y: number } = chartPoint(revenueValues, selectedIndex, chartWidth, chartHeight, maxValue);
  const tooltipLeft: number = Math.min(Math.max(selectedPoint.x - 63, 8), Math.max(chartWidth - 134, 8));

  useEffect(() => {
    setSelectedIndex(Math.max(metrics.length - 1, 0));
  }, [metrics.length, range]);

  const xAxisMetrics: DailyMetric[] = metrics.length > 3 ? [metrics[0] as DailyMetric, metrics[Math.floor(metrics.length / 2)] as DailyMetric, metrics[metrics.length - 1] as DailyMetric] : metrics;

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View><Text style={styles.chartEyebrow}>PERFORMANCE</Text><Text style={styles.chartTitle}>Revenue vs cashouts</Text></View>
        <View style={styles.rangeToggle}>
          {[7, 30].map((value: number) => {
            const nextRange: DashboardRange = value === 30 ? 30 : 7;
            return <Pressable key={value} onPress={() => onRangeChange(nextRange)} style={({ pressed }) => [styles.rangeButton, range === nextRange && styles.rangeButtonActive, pressed && styles.pressed]}><Text style={[styles.rangeText, range === nextRange && styles.rangeTextActive]}>{value}D</Text></Pressable>;
          })}
        </View>
      </View>
      <View style={styles.chartLegend}><View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: Colors.cyan }]} /><Text style={styles.legendText}>Revenue</Text></View><View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: Colors.primarySoft }]} /><Text style={styles.legendText}>Cashouts</Text></View></View>
      {metrics.length ? <View onLayout={({ nativeEvent }) => setChartWidth(nativeEvent.layout.width)} style={styles.chartArea}>
        {chartWidth > 0 ? <Svg height={chartHeight} width={chartWidth}>
          {[0.25, 0.5, 0.75].map((ratio: number) => <Line key={ratio} stroke={Colors.border} strokeDasharray="3 5" strokeWidth="1" x1="18" x2={chartWidth - 18} y1={10 + (chartHeight - 24) * ratio} y2={10 + (chartHeight - 24) * ratio} />)}
          <Path d={chartPath(revenueValues, chartWidth, chartHeight, maxValue)} fill="none" stroke={Colors.cyan} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          <Path d={chartPath(cashoutValues, chartWidth, chartHeight, maxValue)} fill="none" stroke={Colors.primarySoft} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          <Line opacity="0.7" stroke={Colors.textMuted} strokeDasharray="3 4" strokeWidth="1" x1={selectedPoint.x} x2={selectedPoint.x} y1="8" y2={chartHeight - 16} />
          <Circle cx={selectedPoint.x} cy={selectedPoint.y} fill={Colors.background} r="5" stroke={Colors.cyan} strokeWidth="2.5" />
          <Circle cx={selectedPoint.x} cy={chartPoint(cashoutValues, selectedIndex, chartWidth, chartHeight, maxValue).y} fill={Colors.background} r="5" stroke={Colors.primarySoft} strokeWidth="2.5" />
        </Svg> : null}
        <View style={styles.chartTouchGrid}>
          {metrics.map((item: DailyMetric, index: number) => <Pressable accessibilityLabel={`Show stats for ${item.label}`} key={item.date} onPress={() => setSelectedIndex(index)} style={styles.chartTouchTarget} />)}
        </View>
        {selectedMetric ? <View style={[styles.chartTooltip, { left: tooltipLeft }]}><Text style={styles.tooltipDate}>{relativeDateLabel(selectedMetric.date)}</Text><Text style={styles.tooltipValue}><Text style={{ color: Colors.cyan }}>REV </Text>{formatCurrency(selectedMetric.revenue)}</Text><Text style={styles.tooltipValue}><Text style={{ color: Colors.primarySoft }}>OUT </Text>{formatCurrency(selectedMetric.cashouts)}</Text></View> : null}
        <View style={styles.chartXAxis}>{xAxisMetrics.map((item: DailyMetric, index: number) => <Text key={`${item.date}-${index}`} style={styles.axisText}>{item.label}</Text>)}</View>
      </View> : <View style={styles.chartEmpty}><Text style={styles.chartEmptyText}>Loading performance history…</Text></View>}
    </View>
  );
}

function WithdrawalActionCard({ item, canAct, onAction }: { item: PendingWithdrawal; canAct: boolean; onAction: (item: PendingWithdrawal, status: "approved" | "rejected") => void }): React.ReactElement {
  const tone: "pink" | "amber" = item.riskScore >= 45 ? "amber" : "pink";
  return (
    <View style={styles.actionCard}>
      <View style={styles.actionTop}><Avatar color={initialsColor(item.userName)} name={item.userName} /><View style={styles.actionUser}><Text style={styles.actionName}>{item.userName}</Text><Text style={styles.actionMeta}>{item.id} · {item.requestedAt}</Text></View><View style={styles.amountBlock}><Text style={styles.actionAmount}>{formatCurrencyPrecise(item.amount)}</Text><Text style={styles.actionMethod}>{item.method}</Text></View></View>
      <View style={styles.actionMiddle}><StatusPill label={item.riskLabel} tone={tone} /><Text style={styles.actionType}>Withdrawal request</Text><ChevronRight color={Colors.textDim} size={16} /></View>
      <View style={styles.actionButtons}>
        <Pressable accessibilityLabel={`Reject ${item.userName}'s withdrawal`} onPress={() => onAction(item, "rejected")} style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}><X color={canAct ? Colors.red : Colors.textDim} size={15} /><Text style={[styles.rejectText, !canAct && styles.disabledText]}>Reject</Text></Pressable>
        <Pressable accessibilityLabel={`Approve ${item.userName}'s withdrawal`} onPress={() => onAction(item, "approved")} style={({ pressed }) => [styles.approveButton, pressed && styles.pressed, !canAct && styles.approveDisabled]}><Check color={canAct ? Colors.background : Colors.textDim} size={15} /><Text style={[styles.approveText, !canAct && styles.disabledText]}>Approve payout</Text></Pressable>
      </View>
    </View>
  );
}

function SecurityAlertCard({ item }: { item: SecurityAlert }): React.ReactElement {
  const tone: "red" | "amber" | "cyan" = severityTone(item.severity);
  const accent: string = item.severity === "high" ? Colors.red : item.severity === "medium" ? Colors.amber : Colors.cyan;
  return (
    <Pressable onPress={() => router.push("/(tabs)/users")} style={({ pressed }) => [styles.alertCard, pressed && styles.pressed]}>
      <View style={[styles.alertIcon, { backgroundColor: `${accent}18` }]}><ShieldAlert color={accent} size={19} /></View>
      <View style={styles.alertCopy}><View style={styles.alertTitleRow}><Text style={styles.alertName}>{item.userName}</Text><StatusPill label={`${item.riskScore} RISK`} tone={tone} /></View><Text style={styles.alertReason}>{item.reason}</Text><Text style={styles.alertTime}>{item.createdAt} · open security review</Text></View>
      <ChevronRight color={Colors.textDim} size={16} />
    </Pressable>
  );
}

function LoadingFeedSkeleton(): React.ReactElement {
  return <View style={styles.loadingFeed}>{[0, 1, 2].map((item: number) => <View key={item} style={styles.actionCard}><View style={styles.skeletonActionTop}><SkeletonBlock style={styles.skeletonAvatar} /><View style={styles.skeletonActionCopy}><SkeletonBlock style={styles.skeletonName} /><SkeletonBlock style={styles.skeletonMeta} /></View><View style={styles.skeletonAmount}><SkeletonBlock style={styles.skeletonAmountLine} /><SkeletonBlock style={styles.skeletonMethodLine} /></View></View><SkeletonBlock style={styles.skeletonPill} /><View style={styles.skeletonActionButtons}><SkeletonBlock style={styles.skeletonButton} /><SkeletonBlock style={styles.skeletonButton} /></View></View>)}</View>;
}

function EmptyFeed(): React.ReactElement {
  return <View style={styles.emptyFeed}><View style={styles.emptyIcon}><Sparkles color={Colors.green} size={22} /></View><Text style={styles.emptyTitle}>Clear runway</Text><Text style={styles.emptyText}>No urgent withdrawals or security alerts need a decision.</Text></View>;
}

export default function DashboardScreen(): React.ReactElement {
  const { admin } = useAuth();
  const [range, setRange] = useState<DashboardRange>(7);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(isDashboardLiveConfigured() ? "reconnecting" : "unavailable");
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const isSuperAdmin: boolean = admin?.role === "super_admin";

  const loadDashboard = useCallback(async (showSkeleton: boolean): Promise<void> => {
    if (showSkeleton) {
      setIsLoading(true);
    }
    const nextSnapshot: DashboardSnapshot = await fetchDashboardSnapshot(range);
    setSnapshot(nextSnapshot);
    setResolvedIds([]);
    setIsLoading(false);
  }, [range]);

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  useEffect(() => {
    const unsubscribe: () => void = subscribeToDashboardRealtime(() => {
      void loadDashboard(false);
    }, setRealtimeStatus);
    return unsubscribe;
  }, [loadDashboard]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadDashboard(false);
    setRefreshing(false);
  };

  const handleRangeChange = (nextRange: DashboardRange): void => {
    if (nextRange !== range) {
      setRange(nextRange);
      setIsLoading(true);
    }
  };

  const handleWithdrawalAction = async (item: PendingWithdrawal, status: "approved" | "rejected"): Promise<void> => {
    if (!isSuperAdmin) {
      Alert.alert("Super Admin approval needed", "Support Agents can review payout details but cannot approve or reject withdrawals.");
      return;
    }
    setResolvedIds((current: string[]) => [...current, item.id]);
    setSnapshot((current: DashboardSnapshot | null) => current ? {
      ...current,
      pendingCashoutsCount: Math.max(0, current.pendingCashoutsCount - 1),
      pendingCashoutsValue: Math.max(0, current.pendingCashoutsValue - item.amount),
      pendingWithdrawals: current.pendingWithdrawals.filter((withdrawal: PendingWithdrawal) => withdrawal.id !== item.id),
    } : current);
    try {
      await updateWithdrawalStatus(item.id, status);
    } catch (error) {
      setResolvedIds((current: string[]) => current.filter((id: string) => id !== item.id));
      setSnapshot((current: DashboardSnapshot | null) => current ? {
        ...current,
        pendingCashoutsCount: current.pendingCashoutsCount + 1,
        pendingCashoutsValue: current.pendingCashoutsValue + item.amount,
        pendingWithdrawals: [item, ...current.pendingWithdrawals],
      } : current);
      Alert.alert("Could not update payout", error instanceof Error ? error.message : "Please refresh and try again.");
    }
  };

  const actionFeed: DashboardAction[] = useMemo(() => {
    const data: DashboardSnapshot = snapshot ?? EMPTY_SNAPSHOT;
    const withdrawals: DashboardAction[] = data.pendingWithdrawals.filter((item: PendingWithdrawal) => !resolvedIds.includes(item.id)).map((item: PendingWithdrawal) => ({ type: "withdrawal", item }));
    const alerts: DashboardAction[] = data.securityAlerts.filter((item: SecurityAlert) => !resolvedIds.includes(item.id)).map((item: SecurityAlert) => ({ type: "security", item }));
    return [...withdrawals, ...alerts];
  }, [resolvedIds, snapshot]);

  const renderAction = ({ item }: ListRenderItemInfo<DashboardAction>): React.ReactElement => item.type === "withdrawal"
    ? <WithdrawalActionCard canAct={isSuperAdmin} item={item.item} onAction={(withdrawal: PendingWithdrawal, status: "approved" | "rejected") => void handleWithdrawalAction(withdrawal, status)} />
    : <SecurityAlertCard item={item.item} />;

  return (
    <AdminShell contentStyle={styles.shellContent} onRefresh={handleRefresh} refreshing={refreshing} scrollEnabled={false} subtitle="Live operations · rewards, cashouts, trust" title="Dashboard">
      <FlatList
        contentContainerStyle={styles.listContent}
        data={actionFeed}
        keyExtractor={(item: DashboardAction) => `${item.type}-${item.item.id}`}
        ListEmptyComponent={isLoading ? <LoadingFeedSkeleton /> : <EmptyFeed />}
        ListFooterComponent={<View style={styles.listFooter}><Clock3 color={Colors.textDim} size={13} /><Text style={styles.footerText}>{realtimeStatus === "connected" ? "Listening for Supabase changes" : "Pull down to refresh the latest snapshot"}</Text></View>}
        ListHeaderComponent={<DashboardHeader isLoading={isLoading} onRangeChange={handleRangeChange} range={range} realtimeStatus={realtimeStatus} snapshot={snapshot} />}
        refreshControl={<RefreshControl colors={[Colors.primary]} progressBackgroundColor={Colors.surfaceRaised} refreshing={refreshing} tintColor={Colors.primary} onRefresh={() => void handleRefresh()} />}
        renderItem={renderAction}
        showsVerticalScrollIndicator={false}
      />
    </AdminShell>
  );
}

const styles = {
  shellContent: { paddingHorizontal: 0, paddingTop: 0 } as const,
  listContent: { paddingBottom: 22, paddingHorizontal: 18, paddingTop: 22 } as const,
  signalRow: { alignItems: "center" as const, flexDirection: "row" as const, justifyContent: "space-between" as const },
  signalCopy: { alignItems: "center" as const, flexDirection: "row" as const, gap: 7 },
  signalDot: { backgroundColor: Colors.green, borderRadius: 4, height: 8, width: 8 },
  signalText: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" as const },
  fallbackNotice: { alignItems: "center" as const, backgroundColor: "#3C2E1A", borderRadius: 11, flexDirection: "row" as const, gap: 7, marginTop: 12, paddingHorizontal: 11, paddingVertical: 9 },
  fallbackText: { color: Colors.amber, flex: 1, fontSize: 10, fontWeight: "700" as const, lineHeight: 14 },
  statRow: { gap: 10, paddingBottom: 2, paddingRight: 18, paddingTop: 17 },
  statCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, minHeight: 145, padding: 14, width: 163 },
  statIcon: { alignItems: "center" as const, borderRadius: 10, height: 32, justifyContent: "center" as const, marginBottom: 12, width: 32 },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" as const },
  statValue: { color: Colors.text, fontSize: 23, fontWeight: "900" as const, letterSpacing: -0.8, marginTop: 5 },
  statDetail: { fontSize: 10, fontWeight: "800" as const, lineHeight: 14, marginTop: 6 },
  skeletonBlock: { backgroundColor: Colors.surfaceBright, borderRadius: 6 },
  skeletonIcon: { borderRadius: 10, height: 32, marginBottom: 12, width: 32 },
  skeletonLabel: { height: 10, width: 70 },
  skeletonValue: { height: 25, marginTop: 7, width: 88 },
  skeletonDetail: { height: 10, marginTop: 9, width: 104 },
  chartCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 20, borderWidth: 1, marginTop: 16, padding: 16 },
  chartHeader: { alignItems: "center" as const, flexDirection: "row" as const, justifyContent: "space-between" as const },
  chartEyebrow: { color: Colors.textDim, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.3, marginBottom: 4 },
  chartTitle: { color: Colors.text, fontSize: 16, fontWeight: "900" as const, letterSpacing: -0.4 },
  rangeToggle: { backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row" as const, padding: 3 },
  rangeButton: { alignItems: "center" as const, borderRadius: 7, justifyContent: "center" as const, minHeight: 34, minWidth: 40 },
  rangeButtonActive: { backgroundColor: Colors.primary },
  rangeText: { color: Colors.textDim, fontSize: 10, fontWeight: "900" as const },
  rangeTextActive: { color: Colors.white },
  chartLegend: { flexDirection: "row" as const, gap: 15, marginTop: 15 },
  legendItem: { alignItems: "center" as const, flexDirection: "row" as const, gap: 6 },
  legendLine: { borderRadius: 2, height: 3, width: 14 },
  legendText: { color: Colors.textMuted, fontSize: 10, fontWeight: "700" as const },
  chartArea: { height: 213, marginTop: 7, position: "relative" as const },
  chartTouchGrid: { bottom: 28, flexDirection: "row" as const, left: 0, position: "absolute" as const, right: 0, top: 0 },
  chartTouchTarget: { flex: 1 },
  chartTooltip: { backgroundColor: "#252532", borderColor: Colors.borderStrong, borderRadius: 10, borderWidth: 1, minHeight: 60, paddingHorizontal: 9, paddingVertical: 7, position: "absolute" as const, top: 4, width: 126 },
  tooltipDate: { color: Colors.text, fontSize: 10, fontWeight: "900" as const, marginBottom: 3 },
  tooltipValue: { color: Colors.textMuted, fontFamily: "monospace", fontSize: 9, fontWeight: "800" as const, lineHeight: 14 },
  chartXAxis: { bottom: 0, flexDirection: "row" as const, justifyContent: "space-between" as const, left: 10, position: "absolute" as const, right: 10 },
  axisText: { color: Colors.textDim, fontSize: 9, fontWeight: "700" as const },
  chartEmpty: { alignItems: "center" as const, height: 190, justifyContent: "center" as const },
  chartEmptyText: { color: Colors.textMuted, fontSize: 11 },
  urgentHeading: { alignItems: "flex-end" as const, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 29 },
  feedHint: { alignItems: "center" as const, flexDirection: "row" as const, gap: 4, marginBottom: 3 },
  feedHintText: { color: Colors.primarySoft, fontSize: 10, fontWeight: "800" as const },
  actionCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, marginTop: 12, padding: 14 },
  actionTop: { alignItems: "center" as const, flexDirection: "row" as const },
  actionUser: { flex: 1, marginLeft: 10 },
  actionName: { color: Colors.text, fontSize: 13, fontWeight: "800" as const },
  actionMeta: { color: Colors.textDim, fontFamily: "monospace", fontSize: 9, marginTop: 5 },
  amountBlock: { alignItems: "flex-end" as const, maxWidth: 145 },
  actionAmount: { color: Colors.text, fontSize: 17, fontWeight: "900" as const },
  actionMethod: { color: Colors.textMuted, fontSize: 9, marginTop: 4, textAlign: "right" as const },
  actionMiddle: { alignItems: "center" as const, borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, gap: 9, marginTop: 13, paddingTop: 12 },
  actionType: { color: Colors.textMuted, flex: 1, fontSize: 10, fontWeight: "700" as const },
  actionButtons: { borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, gap: 8, marginTop: 13, paddingTop: 12 },
  rejectButton: { alignItems: "center" as const, borderColor: Colors.borderStrong, borderRadius: 10, borderWidth: 1, flex: 0.82, flexDirection: "row" as const, gap: 5, height: 42, justifyContent: "center" as const },
  approveButton: { alignItems: "center" as const, backgroundColor: Colors.green, borderRadius: 10, flex: 1.38, flexDirection: "row" as const, gap: 5, height: 42, justifyContent: "center" as const },
  approveDisabled: { backgroundColor: Colors.surfaceBright },
  rejectText: { color: Colors.red, fontSize: 11, fontWeight: "900" as const },
  approveText: { color: Colors.background, fontSize: 11, fontWeight: "900" as const },
  disabledText: { color: Colors.textDim },
  alertCard: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row" as const, gap: 11, marginTop: 12, minHeight: 87, padding: 13 },
  alertIcon: { alignItems: "center" as const, borderRadius: 12, height: 40, justifyContent: "center" as const, width: 40 },
  alertCopy: { flex: 1 },
  alertTitleRow: { alignItems: "center" as const, flexDirection: "row" as const, gap: 7 },
  alertName: { color: Colors.text, flex: 1, fontSize: 13, fontWeight: "800" as const },
  alertReason: { color: Colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 6 },
  alertTime: { color: Colors.textDim, fontSize: 9, marginTop: 4 },
  loadingFeed: { gap: 0 },
  skeletonActionTop: { alignItems: "center" as const, flexDirection: "row" as const },
  skeletonAvatar: { borderRadius: 22, height: 44, width: 44 },
  skeletonActionCopy: { flex: 1, gap: 8, marginLeft: 10 },
  skeletonName: { height: 12, width: 102 },
  skeletonMeta: { height: 9, width: 85 },
  skeletonAmount: { alignItems: "flex-end" as const, gap: 8 },
  skeletonAmountLine: { height: 16, width: 64 },
  skeletonMethodLine: { height: 8, width: 91 },
  skeletonPill: { height: 24, marginTop: 14, width: 86 },
  skeletonActionButtons: { borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, gap: 8, marginTop: 13, paddingTop: 12 },
  skeletonButton: { flex: 1, height: 42 },
  emptyFeed: { alignItems: "center" as const, paddingHorizontal: 30, paddingVertical: 50 },
  emptyIcon: { alignItems: "center" as const, backgroundColor: "#103B2D", borderRadius: 18, height: 52, justifyContent: "center" as const, width: 52 },
  emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: "900" as const, marginTop: 13 },
  emptyText: { color: Colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 6, textAlign: "center" as const },
  listFooter: { alignItems: "center" as const, flexDirection: "row" as const, gap: 6, justifyContent: "center" as const, paddingBottom: 4, paddingTop: 20 },
  footerText: { color: Colors.textDim, fontSize: 10, fontWeight: "700" as const },
  pressed: { opacity: 0.68 },
};
