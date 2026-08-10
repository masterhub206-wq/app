import * as Clipboard from "expo-clipboard";
import { Copy, Plus, Ticket, TrendingUp, Users2, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";

import { AdminShell } from "@/components/AdminShell";
import { SectionHeading, StatusPill } from "@/components/ui";
import Colors from "@/constants/colors";
import { createPromoCode, fetchPromoCodes, isPromoLiveConfigured, PromoCode } from "@/services/promoService";

function formatCoins(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function expiryLabel(value: string | null): string {
  if (!value) return "No expiry";
  const date: Date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isFinite(date.getTime()) ? `Ends ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : value;
}

function CreatePromoModal({ onClose, onCreated }: { onClose: () => void; onCreated: (promo: PromoCode) => Promise<void> }): React.ReactElement {
  const [code, setCode] = useState<string>("");
  const [coins, setCoins] = useState<string>("1000");
  const [expiry, setExpiry] = useState<string>("");
  const [maxUses, setMaxUses] = useState<string>("1000");
  const [saving, setSaving] = useState<boolean>(false);

  const submit = async (): Promise<void> => {
    setSaving(true);
    try {
      const parsedCoins: number = Number(coins);
      const parsedMaxUses: number = Number(maxUses || 0);
      if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry.trim())) {
        throw new Error("Use expiry format YYYY-MM-DD.");
      }
      const created: PromoCode = await createPromoCode({ code, coins: parsedCoins, expiresAt: expiry.trim() || null, maxUses: parsedMaxUses });
      await onCreated(created);
      onClose();
    } catch (error) {
      Alert.alert("Could not create code", error instanceof Error ? error.message : "Please check the form and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
        <Pressable accessibilityLabel="Close promo form" onPress={onClose} style={styles.backdrop} />
        <View style={styles.modalCard}><View style={styles.modalHandle} /><View style={styles.modalHeader}><View style={styles.modalIcon}><Ticket color={Colors.primarySoft} size={18} /></View><View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>New promo code</Text><Text style={styles.modalSubtitle}>Launch a targeted coin reward</Text></View><Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><X color={Colors.textMuted} size={19} /></Pressable></View>
          <Text style={styles.inputLabel}>CODE</Text><TextInput autoCapitalize="characters" autoFocus onChangeText={setCode} placeholder="FLASH100" placeholderTextColor={Colors.textDim} style={styles.textInput} value={code} />
          <View style={styles.twoCol}><View style={styles.col}><Text style={styles.inputLabel}>COINS</Text><TextInput keyboardType="number-pad" onChangeText={setCoins} placeholder="1000" placeholderTextColor={Colors.textDim} style={styles.textInput} value={coins} /></View><View style={styles.col}><Text style={styles.inputLabel}>MAX USES</Text><TextInput keyboardType="number-pad" onChangeText={setMaxUses} placeholder="1000" placeholderTextColor={Colors.textDim} style={styles.textInput} value={maxUses} /></View></View>
          <Text style={styles.inputLabel}>EXPIRY DATE (OPTIONAL)</Text><TextInput autoCapitalize="none" onChangeText={setExpiry} placeholder="2026-08-31" placeholderTextColor={Colors.textDim} style={styles.textInput} value={expiry} />
          <View style={styles.previewCard}><Text style={styles.previewEyebrow}>REWARD PREVIEW</Text><Text style={styles.previewTitle}>{formatCoins(Number(coins) || 0)} coins per redemption</Text><Text style={styles.previewText}>{maxUses ? `${maxUses} total redemptions` : "Unlimited redemptions"}{expiry ? ` · ends ${expiry}` : " · no expiry"}</Text></View>
          <Pressable disabled={saving} onPress={() => void submit()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.disabledButton]}>{saving ? <ActivityIndicator color={Colors.white} size="small" /> : <><Plus color={Colors.white} size={16} /><Text style={styles.saveButtonText}>Create promo code</Text></>}</Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function PromoScreen(): React.ReactElement {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [source, setSource] = useState<"live" | "demo" | "fallback">("demo");

  const loadPromos = async (): Promise<void> => {
    setLoading(true);
    const result = await fetchPromoCodes();
    setPromos(result.items);
    setSource(result.source);
    setLoading(false);
  };

  useEffect(() => { void loadPromos(); }, []);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadPromos();
    setRefreshing(false);
  };

  const copyCode = async (promo: PromoCode): Promise<void> => {
    await Clipboard.setStringAsync(promo.code);
    Alert.alert("Promo code copied", promo.code);
  };

  const activePromos: PromoCode[] = promos.filter((promo: PromoCode) => promo.status !== "Expired");
  const visiblePromos: PromoCode[] = showAll ? promos : promos.slice(0, 3);
  const totalUses: number = promos.reduce((total: number, promo: PromoCode) => total + promo.used, 0);

  return (
    <AdminShell onRefresh={handleRefresh} refreshing={refreshing} subtitle="Create momentum without losing the signal" title="Promo codes">
      <View style={styles.promoHero}><View style={styles.promoHeroIcon}><Ticket color={Colors.primarySoft} size={23} /></View><View style={styles.promoHeroCopy}><Text style={styles.promoHeroValue}>{(totalUses / 1000).toFixed(1)}K</Text><Text style={styles.promoHeroLabel}>redemptions across active campaigns</Text></View><View style={styles.trend}><TrendingUp color={Colors.green} size={14} /><Text style={styles.trendText}>{activePromos.length} LIVE</Text></View></View>
      <View style={styles.sectionTop}><SectionHeading eyebrow="CAMPAIGNS" title="Live promo codes" /><Pressable accessibilityLabel="Create promo code" onPress={() => setShowCreate(true)} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}><Plus color={Colors.white} size={15} /><Text style={styles.createText}>New code</Text></Pressable></View>
      {loading ? <View style={styles.loadingState}><ActivityIndicator color={Colors.primarySoft} /><Text style={styles.loadingText}>Loading promo codes…</Text></View> : <View style={styles.list}>{visiblePromos.map((promo: PromoCode) => <View key={promo.id} style={styles.promoCard}><View style={styles.promoTop}><View style={styles.codeBadge}><Text style={styles.codeText}>{promo.code}</Text></View><StatusPill label={promo.status} tone={promo.status === "Active" ? "green" : promo.status === "Ending soon" ? "amber" : "red"} /><Pressable accessibilityLabel={`Copy ${promo.code}`} onPress={() => void copyCode(promo)} style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}><Copy color={Colors.textMuted} size={16} /></Pressable></View><Text style={styles.offer}>{formatCoins(promo.coins)} coins per redemption</Text><View style={styles.promoMeta}><View style={styles.metaItem}><Users2 color={Colors.textDim} size={13} /><Text style={styles.metaText}>{promo.maxUses > 0 ? `${Math.max(0, promo.maxUses - promo.used).toLocaleString()} remaining` : "Unlimited uses"}</Text></View><Text style={styles.metaText}>{expiryLabel(promo.expiresAt)}</Text></View><View style={styles.usageTrack}><View style={[styles.usageFill, { width: `${promo.maxUses > 0 ? Math.min(100, (promo.used / promo.maxUses) * 100) : 28}%`, backgroundColor: promo.status === "Ending soon" ? Colors.amber : Colors.cyan }]} /></View></View>)}</View>}
      {!loading && !promos.length ? <View style={styles.emptyState}><Ticket color={Colors.textDim} size={22} /><Text style={styles.emptyTitle}>No promo codes yet</Text><Text style={styles.emptyText}>Create your first campaign with the button above.</Text></View> : null}
      {!loading && promos.length > 3 ? <Pressable onPress={() => setShowAll((current: boolean) => !current)} style={({ pressed }) => [styles.showAllButton, pressed && styles.pressed]}><Text style={styles.showAllText}>{showAll ? "Show less" : "View all campaigns"}</Text></Pressable> : null}
      <View style={styles.tipCard}><Text style={styles.tipEyebrow}>CAMPAIGN TIP</Text><Text style={styles.tipTitle}>Keep your strongest code visible</Text><Text style={styles.tipText}>Promos with a clear first-cashout reward convert 1.8× better in the first 48 hours.</Text><Text style={styles.sourceText}>{source === "live" && isPromoLiveConfigured() ? "Live campaign data" : "Preview campaign data"}</Text></View>
      <Pressable accessibilityLabel="Add promo code" onPress={() => setShowCreate(true)} style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}><Plus color={Colors.white} size={24} strokeWidth={2.6} /></Pressable>
      {showCreate ? <CreatePromoModal onClose={() => setShowCreate(false)} onCreated={async (promo: PromoCode) => { setPromos((current: PromoCode[]) => [promo, ...current]); }} /> : null}
    </AdminShell>
  );
}

const styles = {
  promoHero: { alignItems: "center" as const, backgroundColor: "#291425", borderColor: "#59233E", borderRadius: 18, borderWidth: 1, flexDirection: "row" as const, minHeight: 91, paddingHorizontal: 15 },
  promoHeroIcon: { alignItems: "center" as const, backgroundColor: "#3A1029", borderRadius: 13, height: 45, justifyContent: "center" as const, width: 45 },
  promoHeroCopy: { flex: 1, marginLeft: 12 },
  promoHeroValue: { color: Colors.primarySoft, fontSize: 28, fontWeight: "900" as const, letterSpacing: -1 },
  promoHeroLabel: { color: "#DFABC5", fontSize: 11, marginTop: 2 },
  trend: { alignItems: "center" as const, backgroundColor: "#103B2D", borderRadius: 9, flexDirection: "row" as const, gap: 5, paddingHorizontal: 8, paddingVertical: 7 },
  trendText: { color: Colors.green, fontSize: 10, fontWeight: "900" as const },
  sectionTop: { alignItems: "flex-end" as const, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 29 },
  createButton: { alignItems: "center" as const, backgroundColor: Colors.primary, borderRadius: 10, flexDirection: "row" as const, gap: 5, minHeight: 34, paddingHorizontal: 10 },
  createText: { color: Colors.white, fontSize: 10, fontWeight: "900" as const },
  list: { gap: 11, marginTop: 14 },
  promoCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 18, borderWidth: 1, padding: 15 },
  promoTop: { alignItems: "center" as const, flexDirection: "row" as const, gap: 8 },
  codeBadge: { backgroundColor: "#0C3137", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  codeText: { color: Colors.cyan, fontFamily: "monospace", fontSize: 12, fontWeight: "900" as const, letterSpacing: 0.5 },
  copyButton: { alignItems: "center" as const, borderColor: Colors.border, borderRadius: 8, borderWidth: 1, height: 30, justifyContent: "center" as const, marginLeft: "auto" as const, width: 30 },
  offer: { color: Colors.text, fontSize: 14, fontWeight: "800" as const, marginTop: 15 },
  promoMeta: { alignItems: "center" as const, borderTopColor: Colors.border, borderTopWidth: 1, flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 13, paddingTop: 12 },
  metaItem: { alignItems: "center" as const, flexDirection: "row" as const, gap: 5 },
  metaText: { color: Colors.textMuted, fontSize: 10, fontWeight: "700" as const },
  usageTrack: { backgroundColor: Colors.background, borderRadius: 3, height: 4, marginTop: 13, overflow: "hidden" as const },
  usageFill: { borderRadius: 3, height: 4 },
  showAllButton: { alignItems: "center" as const, borderColor: Colors.border, borderRadius: 11, borderWidth: 1, justifyContent: "center" as const, marginTop: 14, minHeight: 42 },
  showAllText: { color: Colors.cyan, fontSize: 11, fontWeight: "900" as const },
  tipCard: { backgroundColor: Colors.surfaceRaised, borderColor: Colors.border, borderRadius: 18, marginTop: 29, padding: 16 },
  tipEyebrow: { color: Colors.amber, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  tipTitle: { color: Colors.text, fontSize: 14, fontWeight: "900" as const, marginTop: 9 },
  tipText: { color: Colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  sourceText: { color: Colors.textDim, fontSize: 9, marginTop: 11 },
  loadingState: { alignItems: "center" as const, gap: 9, paddingVertical: 54 },
  loadingText: { color: Colors.textMuted, fontSize: 11 },
  emptyState: { alignItems: "center" as const, backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 17, borderWidth: 1, marginTop: 14, paddingVertical: 32 },
  emptyTitle: { color: Colors.text, fontSize: 14, fontWeight: "900" as const, marginTop: 9 },
  emptyText: { color: Colors.textMuted, fontSize: 10, marginTop: 5 },
  fab: { alignItems: "center" as const, backgroundColor: Colors.primary, borderColor: Colors.primarySoft, borderRadius: 30, borderWidth: 1, bottom: 22, elevation: 8, height: 58, justifyContent: "center" as const, position: "absolute" as const, right: 18, shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 12, width: 58 },
  fabPressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  modalRoot: { flex: 1, justifyContent: "flex-end" as const },
  backdrop: { backgroundColor: "#000000B8", bottom: 0, left: 0, position: "absolute" as const, right: 0, top: 0 },
  modalCard: { backgroundColor: Colors.surfaceRaised, borderColor: Colors.borderStrong, borderTopLeftRadius: 27, borderTopRightRadius: 27, borderWidth: 1, paddingBottom: 28, paddingHorizontal: 18, paddingTop: 10 },
  modalHandle: { alignSelf: "center" as const, backgroundColor: Colors.borderStrong, borderRadius: 3, height: 5, marginBottom: 17, width: 42 },
  modalHeader: { alignItems: "center" as const, flexDirection: "row" as const, gap: 10, marginBottom: 20 },
  modalIcon: { alignItems: "center" as const, backgroundColor: "#3A1029", borderRadius: 12, height: 40, justifyContent: "center" as const, width: 40 },
  modalHeaderCopy: { flex: 1 },
  modalTitle: { color: Colors.text, fontSize: 17, fontWeight: "900" as const },
  modalSubtitle: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  closeButton: { alignItems: "center" as const, borderColor: Colors.border, borderRadius: 11, borderWidth: 1, height: 38, justifyContent: "center" as const, width: 38 },
  inputLabel: { color: Colors.textDim, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1, marginBottom: 6, marginTop: 3 },
  textInput: { backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 11, borderWidth: 1, color: Colors.text, fontSize: 12, minHeight: 44, paddingHorizontal: 12 },
  twoCol: { flexDirection: "row" as const, gap: 10, marginTop: 13 },
  col: { flex: 1 },
  previewCard: { backgroundColor: "#0C3137", borderColor: "#174B52", borderRadius: 13, marginTop: 16, padding: 12 },
  previewEyebrow: { color: Colors.cyan, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1 },
  previewTitle: { color: Colors.text, fontSize: 12, fontWeight: "900" as const, marginTop: 6 },
  previewText: { color: "#9BDDE1", fontSize: 9, marginTop: 4 },
  saveButton: { alignItems: "center" as const, backgroundColor: Colors.primary, borderRadius: 12, flexDirection: "row" as const, gap: 7, justifyContent: "center" as const, marginTop: 14, minHeight: 46 },
  saveButtonText: { color: Colors.white, fontSize: 11, fontWeight: "900" as const },
  disabledButton: { opacity: 0.48 },
  pressed: { opacity: 0.68 },
};
