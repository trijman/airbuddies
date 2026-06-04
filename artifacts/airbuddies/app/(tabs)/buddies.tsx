import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Avatar } from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Buddy } from "@/context/AppContext";

function formatLastSeen(ts?: number): string {
  if (!ts) return "Onbekend";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Zojuist actief";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min geleden`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} uur geleden`;
  return `${Math.floor(diff / 86400_000)} dag geleden`;
}

function BuddyRow({ buddy, index }: { buddy: Buddy; index: number }) {
  const colors = useColors();
  const { toggleFavorite, removeBuddy, startConversation } = useApp();
  const isWeb = Platform.OS === "web";

  const statusLabel =
    buddy.status === "online"
      ? "Online"
      : buddy.status === "nearby"
      ? "In de buurt"
      : formatLastSeen(buddy.lastSeen);

  const statusColor =
    buddy.status === "online"
      ? colors.online
      : buddy.status === "nearby"
      ? colors.nearby
      : colors.mutedForeground;

  const handleMessage = () => {
    const conv = startConversation(buddy.id);
    router.push(`/chat/${conv.id}`);
  };

  const handleHold = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(buddy.name, "Wat wil je doen?", [
      {
        text: buddy.isFavorite ? "Verwijder uit favorieten" : "Toevoegen aan favorieten",
        onPress: () => toggleFavorite(buddy.id),
      },
      { text: "Bekijk profiel", onPress: () => router.push(`/profile/${buddy.id}`) },
      {
        text: "Verwijder buddy",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            "Verwijder buddy",
            `Wil je ${buddy.name} verwijderen?`,
            [
              { text: "Annuleer", style: "cancel" },
              { text: "Verwijder", style: "destructive", onPress: () => removeBuddy(buddy.id) },
            ]
          ),
      },
      { text: "Annuleer", style: "cancel" },
    ]);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        style={({ pressed }) => [
          styles.buddyRow,
          { backgroundColor: pressed ? colors.muted : colors.card },
        ]}
        onPress={handleMessage}
        onLongPress={handleHold}
        testID={`buddy-row-${buddy.id}`}
      >
        <Avatar
          name={buddy.name}
          size={50}
          showOnlineIndicator
          isOnline={buddy.status === "online"}
          isNearby={buddy.status === "nearby"}
        />
        <View style={styles.buddyInfo}>
          <View style={styles.buddyNameRow}>
            <Text style={[styles.buddyName, { color: colors.foreground }]}>
              {buddy.name}
            </Text>
            {buddy.isVerified && (
              <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
            )}
            {buddy.isFavorite && (
              <Ionicons name="star" size={13} color={colors.nearby} />
            )}
          </View>
          <Text style={[styles.buddyStatus, { color: statusColor }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
        <Pressable
          style={[styles.msgBtn, { backgroundColor: colors.secondary }]}
          onPress={handleMessage}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default function BuddiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buddies } = useApp();
  const [search, setSearch] = useState("");
  const isWeb = Platform.OS === "web";

  const topPad = isWeb ? 67 : insets.top;

  const favorites = buddies.filter(
    (b) => b.isFavorite && b.name.toLowerCase().includes(search.toLowerCase())
  );
  const others = buddies.filter(
    (b) => !b.isFavorite && b.name.toLowerCase().includes(search.toLowerCase())
  );
  const sections = [
    ...(favorites.length > 0
      ? [{ type: "header" as const, label: "Favorieten" }, ...favorites.map((b) => ({ type: "buddy" as const, buddy: b }))]
      : []),
    ...(others.length > 0
      ? [{ type: "header" as const, label: "Alle buddies" }, ...others.map((b) => ({ type: "buddy" as const, buddy: b }))]
      : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Buddies</Text>
        <Pressable
          onPress={() => router.push("/discover")}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          testID="discover-button"
        >
          <Ionicons name="add" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.muted }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Zoek buddies..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => {
          if (item.type === "header") {
            return (
              <Text style={[styles.sectionHeader, { color: colors.mutedForeground, backgroundColor: colors.background }]}>
                {item.label}
              </Text>
            );
          }
          return <BuddyRow buddy={item.buddy} index={index} />;
        }}
        contentContainerStyle={[styles.list, isWeb ? { paddingBottom: 34 } : undefined]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!sections.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={56} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "Geen resultaten" : "Geen buddies"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              {search ? "Probeer een andere naam" : "Gebruik Discover om buddies te vinden"}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 78 }]} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { flexGrow: 1 },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buddyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  buddyInfo: { flex: 1, gap: 3 },
  buddyNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  buddyName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  buddyStatus: { fontSize: 13, fontFamily: "Inter_400Regular" },
  msgBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  sep: { height: StyleSheet.hairlineWidth },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
