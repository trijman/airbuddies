import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

function getBadgeCount(conversations: ReturnType<typeof useApp>["conversations"]) {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

// ─── Airline IATA → short name & color ────────────────────────────────────────
const AIRLINE_TAB: Record<string, { label: string; color: string }> = {
  KL: { label: "KLM", color: "#00a1de" },
  HV: { label: "Transavia", color: "#00c800" },
  TO: { label: "Transavia", color: "#00c800" },
  OR: { label: "TUI", color: "#e2001a" },
  LH: { label: "Lufthansa", color: "#05164d" },
  BA: { label: "BA", color: "#075aaa" },
  AF: { label: "Air France", color: "#002157" },
  EK: { label: "Emirates", color: "#c8102e" },
  QR: { label: "Qatar", color: "#5c0632" },
  LX: { label: "SWISS", color: "#e30613" },
  SK: { label: "SAS", color: "#005daa" },
  AY: { label: "Finnair", color: "#1d6bae" },
  TK: { label: "Turkish", color: "#c8102e" },
  FR: { label: "Ryanair", color: "#073590" },
  U2: { label: "easyJet", color: "#ff6600" },
  W6: { label: "Wizz Air", color: "#c6007e" },
  PC: { label: "Pegasus", color: "#f0780a" },
  SN: { label: "Brussels", color: "#003087" },
  VY: { label: "Vueling", color: "#f9c005" },
  IB: { label: "Iberia", color: "#c8102e" },
  TP: { label: "TAP", color: "#007749" },
  SQ: { label: "Singapore", color: "#1a1a2e" },
  EY: { label: "Etihad", color: "#bd8b13" },
  CX: { label: "Cathay", color: "#006564" },
  AA: { label: "American", color: "#0078d2" },
  UA: { label: "United", color: "#002244" },
  DL: { label: "Delta", color: "#003366" },
  VS: { label: "Virgin", color: "#c8102e" },
  QF: { label: "Qantas", color: "#c8102e" },
  ET: { label: "Ethiopian", color: "#006940" },
  BY: { label: "TUI", color: "#e2001a" },
  X3: { label: "TUI", color: "#e2001a" },
};

function useActiveAirline() {
  const { activeAirlineIata } = useApp();
  if (!activeAirlineIata) return null;
  return AIRLINE_TAB[activeAirlineIata] ?? null;
}

function AirlineTabIcon({ color, focused, airlineColor }: { color: string; focused: boolean; airlineColor: string }) {
  const activeColor = airlineColor;
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Ionicons
        name={focused ? "airplane" : "airplane-outline"}
        size={24}
        color={focused ? activeColor : color}
      />
    </View>
  );
}

function NativeTabLayout() {
  const airline = useActiveAirline();
  const label = airline?.label ?? "Airline";

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Chats</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="buddies">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Buddies</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover">
        <Icon sf={{ default: "antenna.radiowaves.left.and.right", selected: "antenna.radiowaves.left.and.right" }} />
        <Label>Discover</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="airline">
        <Icon sf={{ default: "airplane.circle", selected: "airplane.circle.fill" }} />
        <Label>{label}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Instellingen</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const airline = useActiveAirline();

  const airlineLabel = airline?.label ?? "Airline";
  const airlineColor = airline?.color ?? colors.primary;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "message.fill" : "message"} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="buddies"
        options={{
          title: "Buddies",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "person.2.fill" : "person.2"} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="antenna.radiowaves.left.and.right" tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "radio" : "radio-outline"} size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="airline"
        options={{
          title: airlineLabel,
          tabBarActiveTintColor: airlineColor,
          tabBarIcon: ({ color, focused }) => (
            <AirlineTabIcon color={color} focused={focused} airlineColor={airlineColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Instellingen",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "gearshape.fill" : "gearshape"} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
