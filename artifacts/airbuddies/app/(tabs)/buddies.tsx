import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
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
import { ProfileCardModal } from "@/components/ProfileCardModal";
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

function BuddyCard({
  buddy,
  index,
  myInterests,
  onOpenCard,
}: {
  buddy: Buddy;
  index: number;
  myInterests: string[];
  onOpenCard: (buddy: Buddy) => void;
}) {
  const colors = useColors();
  const { startConversation } = useApp();

  const shared = useMemo(
    () => getSharedInterests(myInterests, buddy.interests),
    [myInterests, buddy.interests]
  );

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

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: pressed ? colors.muted : colors.card, borderColor: colors.border },
        ]}
        onPress={() => onOpenCard(buddy)}
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

function RequestCard({
  buddy,
  index,
  myInterests,
  onOpenCard,
}: {
  buddy: Buddy;
  index: number;
  myInterests: string[];
  onOpenCard: (buddy: Buddy) => void;
}) {
  const colors = useColors();
  const { acceptBuddyRequest, declineBuddyRequest } = useApp();

  const shared = useMemo(
    () => getSharedInterests(myInterests, buddy.interests),
    [myInterests, buddy.interests]
  );

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptBuddyRequest(buddy.id);
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    declineBuddyRequest(buddy.id);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}
        onPress={() => onOpenCard(buddy)}
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
            {shared.length > 0 && (
              <View style={[styles.matchPill, { backgroundColor: colors.primary + "14" }]}>
                <Ionicons name="sparkles" size={11} color={colors.primary} />
                <Text style={[styles.matchPillText, { color: colors.primary }]}>
                  {shared.length} gedeelde interesse{shared.length > 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        {buddy.bio && (
          <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>
            {buddy.bio}
          </Text>
        )}

        <View style={styles.requestActions}>
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
            onPress={handleAccept}
          >
            <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
            <Text style={[styles.acceptText, { color: colors.primaryForeground }]}>Accepteer</Text>
          </Pressable>
          <Pressable
            style={[styles.declineBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={handleDecline}
          >
            <Text style={[styles.declineText, { color: colors.mutedForeground }]}>Weiger</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function BuddiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buddies, profile } = useApp();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"buddies" | "requests">("buddies");
  const [selectedBuddy, setSelectedBuddy] = useState<Buddy | null>(null);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const myInterests = profile?.interests ?? [];

  const confirmedBuddies = useMemo(
    () => buddies.filter((b) => b.relation === "buddy"),
    [buddies]
  );

  const pendingRequests = useMemo(
    () => buddies.filter((b) => b.relation === "pending_received"),
    [buddies]
  );

  const sentRequests = useMemo(
    () => buddies.filter((b) => b.relation === "pending_sent"),
    [buddies]
  );

  const filtered = useMemo(
    () =>
      confirmedBuddies.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase())
      ),
    [confirmedBuddies, search]
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
    () => confirmedBuddies.filter((b) => getSharedInterests(myInterests, b.interests).length > 0).length,
    [confirmedBuddies, myInterests]
  );

  const requestCount = pendingRequests.length;

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
          {activeTab === "buddies" && totalMatches > 0 && myInterests.length > 0 && (
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

      <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === "buddies" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("buddies")}
        >
          <Text style={[styles.tabText, { color: activeTab === "buddies" ? colors.primary : colors.mutedForeground }]}>
            Buddies {confirmedBuddies.length > 0 ? `(${confirmedBuddies.length})` : ""}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "requests" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("requests")}
        >
          <View style={styles.tabInner}>
            <Text style={[styles.tabText, { color: activeTab === "requests" ? colors.primary : colors.mutedForeground }]}>
              Verzoeken
            </Text>
            {requestCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>{requestCount}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {activeTab === "buddies" && (
        <>
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

          {myInterests.length === 0 && confirmedBuddies.length > 0 && (
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
              <BuddyCard
                buddy={item}
                index={index}
                myInterests={myInterests}
                onOpenCard={setSelectedBuddy}
              />
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
        </>
      )}

      {activeTab === "requests" && (
        <FlatList
          data={[...pendingRequests, ...sentRequests]}
          keyExtractor={(b) => b.id}
          renderItem={({ item, index }) =>
            item.relation === "pending_received" ? (
              <RequestCard
                buddy={item}
                index={index}
                myInterests={myInterests}
                onOpenCard={setSelectedBuddy}
              />
            ) : (
              <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <Pressable
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelectedBuddy(item)}
                >
                  <View style={styles.cardTop}>
                    <Avatar name={item.name} size={48} />
                    <View style={styles.cardInfo}>
                      <Text style={[styles.buddyName, { color: colors.foreground }]}>{item.name}</Text>
                      {item.seatNumber && (
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          Stoel {item.seatNumber}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.sentBadge, { backgroundColor: colors.muted }]}>
                      <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.sentText, { color: colors.mutedForeground }]}>Verzonden</Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            )
          }
          contentContainerStyle={[styles.list, isWeb ? { paddingBottom: 34 } : undefined]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Geen verzoeken</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Verzoeken die je ontvangt verschijnen hier
              </Text>
            </View>
          }
        />
      )}

      <ProfileCardModal
        buddy={selectedBuddy}
        visible={!!selectedBuddy}
        onClose={() => setSelectedBuddy(null)}
        myInterests={myInterests}
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 20,
  },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
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
  matchPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, alignSelf: "flex-start",
  },
  matchPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  requestActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  acceptBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 10, borderRadius: 10, gap: 6,
  },
  acceptText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  declineBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 10, borderRadius: 10, borderWidth: 1,
  },
  declineText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  sentBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  sentText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
