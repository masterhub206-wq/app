import { Href, router } from "expo-router";
import { Menu, Settings2, Ticket, X, LogOut, ShieldCheck } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

export type AdminScreenProps = {
  title: string;
  subtitle: string;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
};

type DrawerRoute = "/promos" | "/settings";

export function AdminShell({
  title,
  subtitle,
  refreshing,
  onRefresh,
  children,
  contentStyle,
  scrollEnabled = true,
}: AdminScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { admin, signOut } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const drawerX = useRef<Animated.Value>(new Animated.Value(-330)).current;
  const roleLabel: string = admin?.role === "super_admin" ? "Super Admin" : "Support Agent";

  useEffect(() => {
    Animated.timing(drawerX, {
      toValue: drawerOpen ? 0 : -330,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerX]);

  const openDrawer = (): void => {
    setDrawerVisible(true);
    setDrawerOpen(true);
  };

  const closeDrawer = (): void => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerVisible(false), 220);
  };

  const navigateFromDrawer = (route: DrawerRoute): void => {
    closeDrawer();
    setTimeout(() => router.push(route as Href), 120);
  };

  const handleLogout = async (): Promise<void> => {
    closeDrawer();
    await signOut();
    router.replace("/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityLabel="Open navigation menu" onPress={openDrawer} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <Menu color={Colors.text} size={22} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.headerStatus}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      {scrollEnabled ? <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }, contentStyle]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} progressBackgroundColor={Colors.surfaceRaised} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView> : <View style={[styles.contentView, { paddingBottom: insets.bottom + 112 }, contentStyle]}>{children}</View>}

      <Modal animationType="none" transparent visible={drawerVisible} onRequestClose={closeDrawer} statusBarTranslucent>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="Close navigation menu" onPress={closeDrawer} style={styles.backdrop} />
          <Animated.View style={[styles.drawer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 18, transform: [{ translateX: drawerX }] }]}>
            <View style={styles.drawerTop}>
              <View style={styles.brandMark}><ShieldCheck color={Colors.background} size={19} strokeWidth={2.8} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerBrand}>FLASH EARN</Text>
                <Text style={styles.drawerCaption}>Operations console</Text>
              </View>
              <Pressable accessibilityLabel="Close menu" onPress={closeDrawer} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <X color={Colors.textMuted} size={20} />
              </Pressable>
            </View>

            <View style={styles.adminCard}>
              <View style={styles.avatarLarge}><Text style={styles.avatarInitials}>{admin?.displayName.slice(0, 1).toUpperCase() ?? "A"}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminName}>{admin?.displayName ?? "Admin"}</Text>
                <Text style={styles.adminRole}>{roleLabel}</Text>
              </View>
              <View style={styles.onlineBadge}><View style={styles.onlineDot} /></View>
            </View>

            <Text style={styles.drawerSectionLabel}>WORKSPACE</Text>
            <Pressable onPress={() => navigateFromDrawer("/promos")} style={({ pressed }) => [styles.drawerItem, pressed && styles.pressed]}>
              <Ticket color={Colors.cyan} size={19} />
              <Text style={styles.drawerItemText}>Promo Codes</Text>
              <Text style={styles.drawerChevron}>›</Text>
            </Pressable>
            <Pressable onPress={() => navigateFromDrawer("/settings")} style={({ pressed }) => [styles.drawerItem, pressed && styles.pressed]}>
              <Settings2 color={Colors.textMuted} size={19} />
              <Text style={styles.drawerItemText}>Settings & Audit</Text>
              <Text style={styles.drawerChevron}>›</Text>
            </Pressable>

            <View style={styles.drawerDivider} />
            <Pressable onPress={() => void handleLogout()} style={({ pressed }) => [styles.logoutItem, pressed && styles.pressed]}>
              <LogOut color={Colors.red} size={19} />
              <Text style={styles.logoutText}>Log out securely</Text>
            </Pressable>
            <Text style={styles.drawerFooter}>Flash Earn Admin · v1.0.0</Text>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = {
  header: {
    alignItems: "center" as const,
    backgroundColor: Colors.background,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row" as const,
    gap: 12,
    paddingBottom: 15,
    paddingHorizontal: 18,
  },
  headerButton: {
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 13,
    borderWidth: 1,
    height: 44,
    justifyContent: "center" as const,
    width: 44,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "900" as const,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600" as const,
    marginTop: 3,
  },
  headerStatus: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    gap: 5,
  },
  liveDot: {
    backgroundColor: Colors.green,
    borderRadius: 5,
    height: 7,
    width: 7,
  },
  liveText: {
    color: Colors.green,
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 0.8,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  contentView: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  pressed: {
    opacity: 0.68,
  },
  modalRoot: {
    backgroundColor: "transparent",
    flex: 1,
  },
  backdrop: {
    backgroundColor: "#000000A8",
    bottom: 0,
    left: 0,
    position: "absolute" as const,
    right: 0,
    top: 0,
  },
  drawer: {
    backgroundColor: Colors.surface,
    borderRightColor: Colors.borderStrong,
    borderRightWidth: 1,
    bottom: 0,
    elevation: 16,
    left: 0,
    paddingHorizontal: 18,
    position: "absolute" as const,
    shadowColor: Colors.black,
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    top: 0,
    width: "84%" as const,
  },
  drawerTop: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    gap: 11,
    marginBottom: 28,
  },
  brandMark: {
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 38,
    justifyContent: "center" as const,
    width: 38,
  },
  drawerBrand: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "900" as const,
    letterSpacing: 1.6,
  },
  drawerCaption: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: "600" as const,
    marginTop: 3,
  },
  closeButton: {
    alignItems: "center" as const,
    borderColor: Colors.border,
    borderRadius: 11,
    borderWidth: 1,
    height: 38,
    justifyContent: "center" as const,
    width: 38,
  },
  adminCard: {
    alignItems: "center" as const,
    backgroundColor: Colors.surfaceRaised,
    borderColor: Colors.border,
    borderRadius: 16,
    flexDirection: "row" as const,
    gap: 11,
    marginBottom: 29,
    padding: 12,
  },
  avatarLarge: {
    alignItems: "center" as const,
    backgroundColor: "#3A1029",
    borderRadius: 18,
    height: 36,
    justifyContent: "center" as const,
    width: 36,
  },
  avatarInitials: {
    color: Colors.primarySoft,
    fontSize: 15,
    fontWeight: "900" as const,
  },
  adminName: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800" as const,
  },
  adminRole: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  onlineBadge: {
    alignItems: "center" as const,
    backgroundColor: "#103B2D",
    borderRadius: 10,
    height: 20,
    justifyContent: "center" as const,
    width: 20,
  },
  onlineDot: {
    backgroundColor: Colors.green,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  drawerSectionLabel: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  drawerItem: {
    alignItems: "center" as const,
    borderRadius: 14,
    flexDirection: "row" as const,
    gap: 13,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  drawerItemText: {
    color: Colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  drawerChevron: {
    color: Colors.textDim,
    fontSize: 24,
    fontWeight: "300" as const,
  },
  drawerDivider: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: 20,
  },
  logoutItem: {
    alignItems: "center" as const,
    borderRadius: 14,
    flexDirection: "row" as const,
    gap: 13,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: Colors.red,
    fontSize: 14,
    fontWeight: "800" as const,
  },
  drawerFooter: {
    bottom: 20,
    color: Colors.textDim,
    fontSize: 10,
    left: 18,
    position: "absolute" as const,
  },
};
