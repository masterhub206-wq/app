import { Tabs } from "expo-router";
import { ChartNoAxesCombined, CircleUserRound, CreditCard, Headset } from "lucide-react-native";
import React from "react";

import Colors from "@/constants/colors";

export default function TabLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primarySoft,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 78,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
        },
        tabBarBadgeStyle: {
          backgroundColor: Colors.primary,
          color: Colors.white,
          fontSize: 9,
          fontWeight: "900",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="withdrawals"
        options={{
          title: "Withdrawals",
          tabBarBadge: 18,
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: "Support",
          tabBarBadge: 4,
          tabBarIcon: ({ color, size }) => <Headset color={color} size={size} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users & Fraud",
          tabBarIcon: ({ color, size }) => <CircleUserRound color={color} size={size} strokeWidth={2.4} />,
        }}
      />
    </Tabs>
  );
}
