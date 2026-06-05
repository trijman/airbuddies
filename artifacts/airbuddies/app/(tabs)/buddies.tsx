import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
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
import { InterestChip } from "@/components/InterestChip";
import { useApp, INTERESTS } from "@/context/AppContext";
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

function getSharedInterests(myInterests: string[], buddyInterests?: string[]): string[] {
  if (!buddyInterests?.length || !myInterests.length) return [];
  return myInterests.filter((i) => buddyInterests.includes(i));
}

function BuddyCard({ buddy, index, myInterests }: { buddy: Buddy; index: number; myInterests: string[] }) {
  const colors = useColors();
  const { toggleFavorite, removeBuddy, startConversation } = useApp();

  const shared = useMemo(() => getSharedInterests(myInterests, buddy.interests), [myInterests, buddy.interests]);

  const statusColor =
    buddy.status === "online" ? colors.online
    : buddy.status === "nearby" ? colors.nearby
    : colors.mutedForeground;

  const statusLabel =
    buddy.status === "online" ? "Online"
    : buddy.status === "nearby" ? "In de buurt"
    : formatLastSeen(buddy.lastSeen);

  const handleMessage = () => {
    const conv = startConversation(buddy.id);
    router.push(`/chat/${conv.id}`);
  };

  const handleHold = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(buddy.name, undefined, [
      {
        text: buddy.isFavorite ? "Verwijder uit favorieten" : "Toevoegen aan favorieten",
        onPress: () => toggleFavorite(buddy.id),
      },
      { text: "Bekijk profiel", onPress: () => router.push(`/profile/${buddy.id}`) },
      {
        text: "Verwijder buddy",
        style: "destructive",
        onPress: () =>
          Alert.alert("Verwijder buddy", `Wil je ${buddy.name} verwijderen?`, [
            { text: "Annuleer", style: "cancel" },
            { text: "Verwijder", style: "destructive", onPress: () => removeBuddy(buddy.id) },
          ]),
      },
      { text: "Annuleer", style: "cancel" },
    ]);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: pressed ? colors.muted : colors.card, borderColor: colors.border },
        ]}
        onPress={() => router.push(`/profile/${buddy.id}`)}
        onLongPress={handleHold}
        testID={`buddy-row-${buddy.id}`}
      >
        <View style={styles.cardTop}>
          <Avatar
            name={buddy.name}
            size={52}
            showOnlineIndicator
            isOnline={buddy.status === "online"}
            isNearby={buddy.status === "nearby"}
          />
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.buddyName, { color: colors.foreground }]} numberOfLines={1}>
                {buddy.name}
              </Text>
              {buddy.isVerified && (
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
              )}
              {buddy.isFavorite && (
                <Ionicons name="star" size={13} color="#f59e0b" />
              )}
            </View>

            <View style={styles.metaRow}>
              {buddy.gender && (
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{buddy.gender}</Text>
              )}
              {buddy.age && (
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>• {buddy.age} jr</Text>
              )}
              {buddy.seatNumber && (
                <View style={styles.seatTag}>
                  <Ionicons name="airplane-outline" size={10} color={colors.primary} />
                  <Text style={[styles.seatText, { color: colors.primary }]}>{buddy.seatNumber}</Text>
                </View>
              )}
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            {shared.length > 0 && (
              <View style={[styles.matchBadge, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.matchCount, { color: colors.primary }]}>{shared.length}</Text>
                <Ionicons name="heart" size={10} color={colors.primary} />
              </View>
            )}
            <Pressable
              style={[styles.msgBtn, { backgroundColor: colors.secondary }]}
              onPress={handleMessage}
              testID={`msg-btn-${buddy.id}`}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {buddy.bio && (
          <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>
            {buddy.bio}
          </Text>
        )}

        {shared.length > 0 && (
          <View style={styles.sharedRow}>
            <Ionicons name="sparkles" size={12} color={colors.primary} />
            <Text style={[styles.sharedLabel, { color: colors.primary }]}>
              Gedeelde interesses:
            </Text>
            {shared.slice(0, 3).map((i) => (
              <InterestChip key={i} label={i} selected small />
            ))}
            {shared.length > 3 && (
              <Text style={[styles.moreText, { color: colors.mutedForeground }]}>+{shared.length - 3}</Text>
            )}
          </View>
        )}

        {!buddy.bio && !shared.length && (buddy.interests?.length ?? 0) > 0 && (
          <View style={styles.sharedRow}>
            {buddy.interests!.slice(0, 3).map((i) => (
              <InterestChip key={i} label={i} small />
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function BuddiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buddies, profile } = useApp();
  const [search, setSearch] = useState("");
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const myInterests = profile?.interests ?? [];

  const filtered = useMemo(
    () => buddies.filter((b) => b.name.toLowerCase().includes(search.toLowerCase())),
    [buddies, search]
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aShared = getSharedInterests(myInterests, a.interests).length;
      const bShared = getSharedInterests(myInterests, b.interests).length;
      if (b.isFavorite !== a.isFavorite) return a.isFavorite ? -1 : 1;
      if (bShared !== aShared) return bShared - aShared;
      const order = { online: 0, nearby: 1, offline: 2 };
      return order[a.status] - order[b.status];
    });
  }, [filtered, myInterests]);

  const totalMatches = useMemo(
    () => buddies.filter((b) => getSharedInterests(myInterests, b.interests).length > 0).length,
    [buddies, myInterests]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Buddies</Text>
          {totalMatches > 0 && myInterests.length > 0 && (
            <Text style={[styles.matchHint, { color: colors.primary }]}>
              {totalMatches} interesse-match{totalMatches > 1 ? "es" : ""}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/discover")}
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

      {myInterests.length === 0 && buddies.length > 0 && (
        <Pressable
          style={[styles.noInterestsBanner, { backgroundColor: colors.secondary, borderColor: colors.primary + "33" }]}
          onPress={() => router.push("/edit-profile")}
        >
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
          <Text style={[styles.noInterestsText, { color: colors.primary }]}>
            Voeg interesses toe voor matches
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      )}

      <FlatList
        data={sorted}
        keyExtractor={(b) => b.id}
        renderItem={({ item, index }) => (
          <BuddyCard buddy={item} index={index} myInterests={myInterests} />
        )}
        contentContainerStyle={[styles.list, isWeb ? { paddingBottom: 34 } : undefined]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!sorted.length}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  matchHint: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginTop: 4 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  noInterestsBanner: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 8,
  },
  noInterestsText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { flexGrow: 1, padding: 12, gap: 10 },
  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 8,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  buddyName: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  seatTag: {
    flexDirection: "row", alignItems: "center", gap: 2,
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
  },
  seatText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardActions: { alignItems: "center", gap: 6 },
  matchBadge: {
    flexDirection: "row", alignItems: "center", gap: 2,
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  matchCount: { fontSize: 12, fontFamily: "Inter_700Bold" },
  msgBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sharedRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  sharedLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  moreText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
