import React from "react";
import { StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";

import Colors from "@/constants/colors";

export function SectionHeading({
  eyebrow,
  title,
  action,
  style,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }, style]}>
      <View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "pink" | "cyan" | "green" | "red" | "amber";
}): React.ReactElement {
  const toneStyles: Record<"neutral" | "pink" | "cyan" | "green" | "red" | "amber", { backgroundColor: string; color: string }> = {
    neutral: { backgroundColor: Colors.surfaceBright, color: Colors.textMuted },
    pink: { backgroundColor: "#3A1029", color: Colors.primarySoft },
    cyan: { backgroundColor: "#0C3137", color: Colors.cyan },
    green: { backgroundColor: "#103B2D", color: Colors.green },
    red: { backgroundColor: "#421C28", color: Colors.red },
    amber: { backgroundColor: "#3C2E1A", color: Colors.amber },
  };
  const palette = toneStyles[tone];
  return (
    <View style={[styles.statusPill, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.statusText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

export function MetricTile({
  label,
  value,
  detail,
  icon,
  accent = Colors.cyan,
  style,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  return (
    <View style={[styles.metricTile, style]}>
      <View style={[styles.metricIcon, { backgroundColor: `${accent}18` }]}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={[styles.metricDetail, { color: accent }]}>{detail}</Text>
    </View>
  );
}

export function Avatar({
  name,
  size = 40,
  color = Colors.primary,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const initials: string = name
    .split(" ")
    .map((part: string) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}24` }, style]}>
      <Text style={[styles.avatarText, { color, fontSize: size * 0.3 }]}>{initials}</Text>
    </View>
  );
}

export function MonoLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }): React.ReactElement {
  return <Text style={[styles.monoLabel, style]}>{children}</Text>;
}

const styles = {
  eyebrow: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800" as const,
    letterSpacing: -0.4,
  },
  sectionAction: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: "800" as const,
    marginBottom: 2,
  },
  statusPill: {
    alignSelf: "flex-start" as const,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  metricTile: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 154,
    padding: 16,
    width: "48%" as const,
  },
  metricIcon: {
    alignItems: "center" as const,
    borderRadius: 10,
    height: 32,
    justifyContent: "center" as const,
    marginBottom: 12,
    width: 32,
  },
  metricLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  metricValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "900" as const,
    letterSpacing: -1,
    marginTop: 5,
  },
  metricDetail: {
    fontSize: 11,
    fontWeight: "800" as const,
    marginTop: 6,
  },
  avatar: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: {
    fontWeight: "900" as const,
  },
  monoLabel: {
    color: Colors.textDim,
    fontFamily: "monospace",
    fontSize: 10,
    letterSpacing: 0.3,
  },
};
