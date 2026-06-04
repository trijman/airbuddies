import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { buddies, removeBuddy, toggleFavorite, startConversation } = useApp();
  const isWeb = Platform.OS === "web";

  const buddy = buddies.find((b) => b.id === id);
  const topPad = isWeb ? 67 : insets.top;

  if (!buddy) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: topPad + 8, paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.notFound}>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>
            Buddy niet gevonden
          </Text>
        </View>
      </View>
    );
  }

  const statusColor =
    buddy.status === "online"
      ? colors.online
      : buddy.status === "nearby"
      ? colors.nearby
      : colors.mutedForeground;

  const statusLabel =
    buddy.status === "online"
      ? "Online"
      : buddy.status === "nearby"
      ? "In de buurt"
      : buddy.lastSeen
      ? `Gezien ${new Date(buddy.lastSeen).toLocaleDateString("nl-NL")}`
      : "Offline";

  const handleMessage = () => {
    const conv = startConversation(buddy.id);
    router.replace(`/chat/${conv.id}`);
  };

  const handleRemove = () => {
    Alert.alert("Verwijder buddy", `Wil je ${buddy.name} verwijderen?`, [
      { text: "Annuleer", style: "cancel" },
      {
        text: "Verwijder",
        style: "destructive",
        onPress: () => {
          removeBuddy(buddy.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[isWeb ? { paddingBottom: 34 } : undefined]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.profileHeader,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleFavorite(buddy.id);
          }}
        >
          <Ionicons
            name={buddy.isFavorite ? "star" : "star-outline"}
            size={24}
            color={buddy.isFavorite ? colors.nearby : colors.mutedForeground}
          />
        </Pressable>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Avatar name={buddy.name} size={88} showOnlineIndicator isOnline={buddy.status === "online"} isNearby={buddy.status === "nearby"} />
        <Text style={[styles.name, { color: colors.foreground }]}>{buddy.name}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {buddy.isVerified && (
          <View style={[styles.verifiedBadge, { backgroundColor: colors.primary + "22" }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={[styles.verifiedText, { color: colors.primary }]}>Geverifieerd</Text>
          </View>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Fingerprint</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>
            {buddy.fingerprint}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Verificatie</Text>
          <Text style={[styles.infoValue, { color: buddy.isVerified ? colors.success : colors.nearby }]}>
            {buddy.isVerified ? "Geverifieerd" : "Niet geverifieerd"}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={handleMessage}
        >
          <Ionicons name="chatbubble" size={20} color={colors.primaryForeground} />
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Stuur bericht</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.dangerBtn, { borderColor: colors.border }]}
        onPress={handleRemove}
      >
        <Text style={[styles.dangerText, { color: colors.destructive }]}>Verwijder buddy</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  profileCard: {
    alignItems: "center",
    padding: 28,
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  name: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  verifiedText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: { padding: 14, gap: 4 },
  infoLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  actions: { paddingHorizontal: 16, marginBottom: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  actionText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  dangerBtn: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  dangerText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
});
