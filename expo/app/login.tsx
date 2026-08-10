import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { demoCredentials } from "@/services/authService";

export default function LoginScreen(): React.ReactElement {
  const { admin, isLoading, isSubmitting, signIn } = useAuth();
  const [email, setEmail] = useState<string>(demoCredentials.email);
  const [password, setPassword] = useState<string>(demoCredentials.password);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isLoading && admin) {
      router.replace("/(tabs)");
    }
  }, [admin, isLoading]);

  const handleSubmit = async (): Promise<void> => {
    setError("");
    try {
      await signIn(email, password);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sign in right now.");
    }
  };

  const handleDemoAccess = (): void => {
    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);
    setError("");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <LinearGradient colors={["#17111D", Colors.background, Colors.background]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}><ShieldCheck color={Colors.background} size={22} strokeWidth={2.8} /></View>
              <View><Text style={styles.brandName}>FLASH EARN</Text><Text style={styles.brandCaption}>ADMIN COMMAND CENTER</Text></View>
            </View>
            <View style={styles.heroCopy}>
              <View style={styles.eyebrowRow}><Sparkles color={Colors.cyan} size={14} /><Text style={styles.eyebrow}>SECURE OPERATIONS</Text></View>
              <Text style={styles.title}>Move money.{"\n"}<Text style={styles.titleAccent}>Stay in control.</Text></Text>
              <Text style={styles.description}>Your high-signal view of rewards, withdrawals, and trust.</Text>
            </View>
            <View style={styles.formCard}>
              <View style={styles.formHeader}><View><Text style={styles.formTitle}>Welcome back</Text><Text style={styles.formSubtitle}>Sign in with your admin account</Text></View><View style={styles.lockBadge}><LockKeyhole color={Colors.cyan} size={16} /></View></View>
              <Text style={styles.inputLabel}>WORK EMAIL</Text>
              <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" onChangeText={setEmail} placeholder="you@flashearn.com" placeholderTextColor={Colors.textDim} style={styles.input} value={email} />
              <Text style={[styles.inputLabel, { marginTop: 17 }]}>PASSWORD</Text>
              <View style={styles.passwordWrap}><TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor={Colors.textDim} secureTextEntry={!showPassword} style={[styles.input, styles.passwordInput]} value={password} /><Pressable accessibilityLabel={showPassword ? "Hide password" : "Show password"} onPress={() => setShowPassword((current: boolean) => !current)} style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}>{showPassword ? <EyeOff color={Colors.textMuted} size={19} /> : <Eye color={Colors.textMuted} size={19} />}</Pressable></View>
              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
              <Pressable disabled={isSubmitting} onPress={() => void handleSubmit()} style={({ pressed }) => [styles.signInButton, pressed && styles.pressed, isSubmitting && styles.disabledButton]}>{isSubmitting ? <ActivityIndicator color={Colors.white} /> : <><Text style={styles.signInText}>Enter console</Text><ArrowRight color={Colors.white} size={19} strokeWidth={2.5} /></>}</Pressable>
            </View>
            <View style={styles.demoCard}><View style={styles.demoIcon}><Sparkles color={Colors.primarySoft} size={16} /></View><View style={styles.demoCopy}><Text style={styles.demoTitle}>Preview workspace ready</Text><Text style={styles.demoText}>Use demo access to explore the admin flow.</Text></View><Pressable onPress={handleDemoAccess} style={({ pressed }) => [styles.demoButton, pressed && styles.pressed]}><Text style={styles.demoButtonText}>Fill</Text></Pressable></View>
            <Text style={styles.footnote}>Supabase Auth + admin_users role gate · Protected session</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, gradient: { flex: 1 }, safeArea: { flex: 1 }, loadingScreen: { alignItems: "center", backgroundColor: Colors.background, flex: 1, justifyContent: "center" }, scrollContent: { paddingBottom: 30, paddingHorizontal: 20, paddingTop: 20 }, brandRow: { alignItems: "center", flexDirection: "row", gap: 11 }, brandIcon: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: 13, height: 43, justifyContent: "center", width: 43 }, brandName: { color: Colors.text, fontSize: 14, fontWeight: "900", letterSpacing: 2.3 }, brandCaption: { color: Colors.textDim, fontSize: 9, fontWeight: "800", letterSpacing: 1.3, marginTop: 4 }, heroCopy: { marginBottom: 27, marginTop: 61 }, eyebrowRow: { alignItems: "center", flexDirection: "row", gap: 6, marginBottom: 15 }, eyebrow: { color: Colors.cyan, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }, title: { color: Colors.text, fontSize: 42, fontWeight: "900", letterSpacing: -2.4, lineHeight: 43 }, titleAccent: { color: Colors.primarySoft }, description: { color: Colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 16, maxWidth: 290 }, formCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderRadius: 24, borderWidth: 1, padding: 19 }, formHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 24 }, formTitle: { color: Colors.text, fontSize: 19, fontWeight: "900" }, formSubtitle: { color: Colors.textMuted, fontSize: 11, marginTop: 4 }, lockBadge: { alignItems: "center", backgroundColor: "#0C3137", borderRadius: 12, height: 35, justifyContent: "center", width: 35 }, inputLabel: { color: Colors.textDim, fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginBottom: 8 }, input: { backgroundColor: Colors.background, borderColor: Colors.border, borderRadius: 13, borderWidth: 1, color: Colors.text, fontSize: 14, height: 51, paddingHorizontal: 14 }, passwordWrap: { position: "relative" }, passwordInput: { paddingRight: 50 }, eyeButton: { alignItems: "center", height: 51, justifyContent: "center", position: "absolute", right: 2, top: 0, width: 48 }, errorBox: { backgroundColor: "#421C28", borderColor: "#6A2B3D", borderRadius: 11, borderWidth: 1, marginTop: 15, padding: 11 }, errorText: { color: Colors.red, fontSize: 12, lineHeight: 17 }, signInButton: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: 14, flexDirection: "row", height: 54, justifyContent: "center", marginTop: 19, gap: 9 }, signInText: { color: Colors.white, fontSize: 14, fontWeight: "900" }, disabledButton: { opacity: 0.65 }, demoCard: { alignItems: "center", backgroundColor: "#211523", borderColor: "#48243D", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 16, padding: 12 }, demoIcon: { alignItems: "center", backgroundColor: "#3A1029", borderRadius: 10, height: 32, justifyContent: "center", width: 32 }, demoCopy: { flex: 1 }, demoTitle: { color: Colors.text, fontSize: 12, fontWeight: "800" }, demoText: { color: Colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 }, demoButton: { alignItems: "center", backgroundColor: Colors.surfaceBright, borderRadius: 9, justifyContent: "center", minHeight: 36, paddingHorizontal: 14 }, demoButtonText: { color: Colors.primarySoft, fontSize: 12, fontWeight: "900" }, footnote: { color: Colors.textDim, fontSize: 10, lineHeight: 16, marginTop: 24, textAlign: "center" }, pressed: { opacity: 0.68 },
});
