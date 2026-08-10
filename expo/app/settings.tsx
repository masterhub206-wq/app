import { Bell, Check, ChevronRight, ClipboardList, Coins, LockKeyhole, Save, ShieldCheck, SlidersHorizontal } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, Text, TextInput, View } from "react-native";

import { AdminShell } from "@/components/AdminShell";
import { MonoLabel, SectionHeading, StatusPill } from "@/components/ui";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { AuditEntry, DEFAULT_REWARD_SETTINGS, fetchSystemSettings, isSettingsLiveConfigured, RewardSettings, saveRewardSettings } from "@/services/settingsService";

function SettingsField({ label, hint, value, onChangeText, suffix, keyboardType = "number-pad", disabled = false }: { label: string; hint: string; value: string; onChangeText: (value: string) => void; suffix: string; keyboardType?: "number-pad" | "decimal-pad"; disabled?: boolean }): React.ReactElement {
  return <View style={styles.field}><View style={styles.fieldCopy}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.fieldHint}>{hint}</Text></View><View style={[styles.fieldInputWrap, disabled && styles.disabledInput]}><TextInput editable={!disabled} keyboardType={keyboardType} onChangeText={onChangeText} selectTextOnFocus style={styles.fieldInput} value={value} /><Text style={styles.fieldSuffix}>{suffix}</Text></View></View>;
}

export default function SettingsScreen(): React.ReactElement {
  const { admin } = useAuth();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [digestEnabled, setDigestEnabled] = useState<boolean>(false);
  const [dailyStreakCoins, setDailyStreakCoins] = useState<string>(String(DEFAULT_REWARD_SETTINGS.dailyStreakCoins));
  const [conversionRate, setConversionRate] = useState<string>(String(DEFAULT_REWARD_SETTINGS.conversionRate));
  const [minWithdrawalLimit, setMinWithdrawalLimit] = useState<string>(String(DEFAULT_REWARD_SETTINGS.minWithdrawalLimit));
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [source, setSource] = useState<"live" | "demo" | "fallback">("demo");
  const isSuperAdmin: boolean = admin?.role === "super_admin";

  const loadSettings = async (): Promise<void> => {
    setLoading(true);
    const result = await fetchSystemSettings();
    setDailyStreakCoins(String(result.settings.dailyStreakCoins));
    setConversionRate(String(result.settings.conversionRate));
    setMinWithdrawalLimit(String(result.settings.minWithdrawalLimit));
    setAuditEntries(result.audit);
    setSource(result.source);
    setLoading(false);
  };

  useEffect(() => { void loadSettings(); }, []);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const handleSave = async (): Promise<void> => {
    if (!isSuperAdmin) {
      Alert.alert("Super Admin approval needed", "Support Agents can review settings but cannot change reward values.");
      return;
    }
    const settings: RewardSettings = { dailyStreakCoins: Number(dailyStreakCoins), conversionRate: Number(conversionRate), minWithdrawalLimit: Number(minWithdrawalLimit) };
    if (![settings.dailyStreakCoins, settings.conversionRate, settings.minWithdrawalLimit].every((value: number) => Number.isFinite(value) && value >= 0)) {
      Alert.alert("Check reward values", "Enter valid positive numbers for each reward setting.");
      return;
    }
    setSaving(true);
    try {
      await saveRewardSettings(settings);
      const newEntry: AuditEntry = { id: `audit-local-${Date.now()}`, action: "Reward values updated", detail: `Streak ${Math.round(settings.dailyStreakCoins)} · ${Math.round(settings.conversionRate)} coins/USD`, time: "Just now", tone: "cyan" };
      setAuditEntries((current: AuditEntry[]) => [newEntry, ...current]);
      Alert.alert("Settings saved", "Reward values are ready for the next earning cycle.");
    } catch (error) {
      Alert.alert("Could not save settings", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell onRefresh={handleRefresh} refreshing={refreshing} subtitle="Control rewards, access, and a clean trail" title="Settings & audit">
      <View style={styles.roleCard}><View style={styles.roleIcon}><ShieldCheck color={Colors.green} size={21} /></View><View style={styles.roleCopy}><Text style={styles.roleTitle}>{admin?.displayName ?? "Admin"}</Text><Text style={styles.roleEmail}>{admin?.email ?? "admin@flashearn.com"}</Text></View><StatusPill label={isSuperAdmin ? "Super Admin" : "Support Agent"} tone={isSuperAdmin ? "green" : "amber"} /></View>

      <View style={styles.sectionTop}><SectionHeading eyebrow="REWARD ECONOMY" title="Core values" /><View style={styles.syncPill}><View style={[styles.syncDot, { backgroundColor: source === "live" ? Colors.green : Colors.amber }]} /><Text style={styles.syncText}>{source === "live" && isSettingsLiveConfigured() ? "LIVE" : "PREVIEW"}</Text></View></View>
      {loading ? <View style={styles.loadingState}><ActivityIndicator color={Colors.primarySoft} /><Text style={styles.loadingText}>Loading reward settings…</Text></View> : <View style={styles.rewardCard}><SettingsField disabled={!isSuperAdmin} hint="Coins awarded for a completed daily streak" label="Daily streak" onChangeText={setDailyStreakCoins} suffix="coins" value={dailyStreakCoins} /><View style={styles.fieldDivider} /><SettingsField disabled={!isSuperAdmin} hint="Coins required for one US dollar" label="Conversion rate" onChangeText={setConversionRate} suffix="coins / $1" value={conversionRate} /><View style={styles.fieldDivider} /><SettingsField disabled={!isSuperAdmin} hint="Smallest balance eligible for cash out" label="Minimum withdrawal" onChangeText={setMinWithdrawalLimit} suffix="coins" value={minWithdrawalLimit} keyboardType="number-pad" /><Pressable disabled={saving || !isSuperAdmin} onPress={() => void handleSave()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, (saving || !isSuperAdmin) && styles.disabledButton]}>{saving ? <ActivityIndicator color={Colors.background} size="small" /> : <><Save color={Colors.background} size={15} /><Text style={styles.saveButtonText}>Save reward values</Text></>}</Pressable></View>}

      <SectionHeading eyebrow="PREFERENCES" title="Command center" style={{ marginTop: 29 }} />
      <View style={styles.settingsCard}><View style={styles.settingRow}><View style={styles.settingIcon}><Bell color={Colors.cyan} size={17} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>Critical alerts</Text><Text style={styles.settingDetail}>Payout and fraud escalations</Text></View><Switch onValueChange={setAlertsEnabled} thumbColor={alertsEnabled ? Colors.white : Colors.textDim} trackColor={{ false: Colors.borderStrong, true: Colors.primary }} value={alertsEnabled} /></View><View style={styles.settingDivider} /><View style={styles.settingRow}><View style={styles.settingIcon}><ClipboardList color={Colors.primarySoft} size={17} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>Daily digest</Text><Text style={styles.settingDetail}>A 9:00 AM operations summary</Text></View><Switch onValueChange={setDigestEnabled} thumbColor={digestEnabled ? Colors.white : Colors.textDim} trackColor={{ false: Colors.borderStrong, true: Colors.primary }} value={digestEnabled} /></View><View style={styles.settingDivider} /><Pressable onPress={() => Alert.alert("Review thresholds", "Risk scoring controls are managed by the backend policy service.")} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}><View style={styles.settingIcon}><SlidersHorizontal color={Colors.amber} size={17} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>Risk thresholds</Text><Text style={styles.settingDetail}>High risk at 80+ signal score</Text></View><ChevronRight color={Colors.textDim} size={17} /></Pressable></View>

      <View style={styles.sectionTop}><SectionHeading eyebrow="SECURITY" title="Role permissions" /><LockKeyhole color={Colors.textDim} size={16} /></View><View style={styles.permissionsCard}><PermissionRow label="View dashboard & analytics" enabled /><PermissionRow label="Review support conversations" enabled /><PermissionRow label="Approve or reject payouts" enabled={isSuperAdmin} /><PermissionRow label="Pause or ban users" enabled={isSuperAdmin} /><PermissionRow label="Adjust member balances" enabled={isSuperAdmin} /></View>{!isSuperAdmin ? <View style={styles.notice}><LockKeyhole color={Colors.amber} size={15} /><Text style={styles.noticeText}>Support Agents have review-only access. Reward changes and destructive actions require a Super Admin.</Text></View> : null}

      <SectionHeading eyebrow="AUDIT TRAIL" title="Recent activity" style={{ marginTop: 29 }} /><View style={styles.auditCard}>{auditEntries.map((entry: AuditEntry, index: number) => <View key={entry.id} style={[styles.auditRow, index < auditEntries.length - 1 && styles.auditBorder]}><View style={[styles.auditDot, { backgroundColor: entry.tone === "green" ? Colors.green : entry.tone === "pink" ? Colors.primarySoft : entry.tone === "amber" ? Colors.amber : Colors.cyan }]} /><View style={styles.auditCopy}><Text style={styles.auditAction}>{entry.action}</Text><Text style={styles.auditDetail}>{entry.detail}</Text><MonoLabel>{entry.time}</MonoLabel></View><Check color={Colors.green} size={15} /></View>)}</View><Text style={styles.footer}>Audit logs are retained for 90 days · {source === "live" ? "Live sync enabled" : "Preview log data"}</Text>
    </AdminShell>
  );
}

function PermissionRow({ label, enabled }: { label: string; enabled: boolean }): React.ReactElement {
  return <View style={styles.permissionRow}><Text style={[styles.permissionLabel, !enabled && styles.permissionDisabled]}>{label}</Text><View style={[styles.permissionIcon, !enabled && styles.permissionIconDisabled]}>{enabled ? <Check color={Colors.green} size={13} /> : <LockKeyhole color={Colors.textDim} size={12} />}</View></View>;
}

const styles = {
  roleCard: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row" as const, padding: 14 },
  roleIcon: { alignItems: "center" as const, backgroundColor: "#103B2D", borderRadius: 12, height: 43, justifyContent: "center" as const, width: 43 },
  roleCopy: { flex: 1, marginLeft: 11 },
  roleTitle: { color: Colors.text, fontSize: 13, fontWeight: "900" as const },
  roleEmail: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  sectionTop: { alignItems: "flex-end" as const, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 29 },
  syncPill: { alignItems: "center" as const, flexDirection: "row" as const, gap: 5, marginBottom: 2 },
  syncDot: { borderRadius: 4, height: 7, width: 7 },
  syncText: { color: Colors.textDim, fontSize: 9, fontWeight: "900" as const, letterSpacing: 0.7 },
  rewardCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, marginTop: 14, padding: 14 },
  field: { alignItems: "center" as const, flexDirection: "row" as const, minHeight: 69 },
  fieldCopy: { flex: 1, paddingRight: 8 },
  fieldLabel: { color: Colors.text, fontSize: 12, fontWeight: "900" as const },
  fieldHint: { color: Colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  fieldInputWrap: { alignItems: "center" as const, backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row" as const, minWidth: 117, paddingHorizontal: 9 },
  fieldInput: { color: Colors.text, fontSize: 15, fontWeight: "900" as const, minHeight: 39, paddingHorizontal: 2, textAlign: "right" as const, width: 67 },
  fieldSuffix: { color: Colors.cyan, fontSize: 8, fontWeight: "900" as const, marginLeft: 4, maxWidth: 42, textAlign: "right" as const },
  disabledInput: { opacity: 0.58 },
  fieldDivider: { backgroundColor: Colors.border, height: 1 },
  saveButton: { alignItems: "center" as const, backgroundColor: Colors.cyan, borderRadius: 11, flexDirection: "row" as const, gap: 6, justifyContent: "center" as const, marginTop: 13, minHeight: 44 },
  saveButtonText: { color: Colors.background, fontSize: 11, fontWeight: "900" as const },
  loadingState: { alignItems: "center" as const, gap: 9, paddingVertical: 45 },
  loadingText: { color: Colors.textMuted, fontSize: 11 },
  settingsCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, marginTop: 14, paddingHorizontal: 14 },
  settingRow: { alignItems: "center" as const, flexDirection: "row" as const, minHeight: 68 },
  settingIcon: { alignItems: "center" as const, backgroundColor: Colors.surfaceRaised, borderRadius: 10, height: 34, justifyContent: "center" as const, width: 34 },
  settingCopy: { flex: 1, marginLeft: 11 },
  settingTitle: { color: Colors.text, fontSize: 12, fontWeight: "800" as const },
  settingDetail: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  settingDivider: { backgroundColor: Colors.border, height: 1 },
  permissionsCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, marginTop: 14, paddingHorizontal: 14 },
  permissionRow: { alignItems: "center" as const, borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row" as const, justifyContent: "space-between" as const, minHeight: 52 },
  permissionLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" as const },
  permissionDisabled: { color: Colors.textDim },
  permissionIcon: { alignItems: "center" as const, backgroundColor: "#103B2D", borderRadius: 9, height: 23, justifyContent: "center" as const, width: 23 },
  permissionIconDisabled: { backgroundColor: Colors.surfaceRaised },
  notice: { alignItems: "center" as const, backgroundColor: "#3C2E1A", borderColor: "#6E5122", borderRadius: 12, flexDirection: "row" as const, gap: 8, marginTop: 11, padding: 11 },
  noticeText: { color: Colors.amber, flex: 1, fontSize: 10, lineHeight: 15 },
  auditCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, marginTop: 14, paddingHorizontal: 14 },
  auditRow: { alignItems: "center" as const, flexDirection: "row" as const, gap: 11, minHeight: 70 },
  auditBorder: { borderBottomColor: Colors.border, borderBottomWidth: 1 },
  auditDot: { borderRadius: 5, height: 9, width: 9 },
  auditCopy: { flex: 1, gap: 3 },
  auditAction: { color: Colors.text, fontSize: 12, fontWeight: "800" as const },
  auditDetail: { color: Colors.textMuted, fontSize: 10 },
  footer: { color: Colors.textDim, fontSize: 10, marginTop: 18, textAlign: "center" as const },
  disabledButton: { opacity: 0.48 },
  pressed: { opacity: 0.68 },
};
