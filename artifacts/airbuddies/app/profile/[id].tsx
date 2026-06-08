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
import { InterestChip } from "@/components/InterestChip";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { buddies, profile, removeBuddy, toggleFavorite, startConversation, acceptBuddyRequest, declineBuddyRequest } = useApp();
  const isWeb = Platform.OS === "web";

  const buddy = buddies.find((b) => b.id === id);
  const topPad = isWeb ? 67 : insets.top;

  if (!buddy) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: topPad + 8, paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.back()}>
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

  const myInterests = profile?.interests ?? [];
  const sharedInterests = myInterests.filter((i) => buddy.interests?.includes(i));
  const otherInterests = buddy.interests?.filter((i) => !myInterests.includes(i)) ?? [];

  const statusColor =
    buddy.status === "online" ? colors.online
    : buddy.status === "nearby" ? colors.nearby
    : colors.mutedForeground;

  const statusLabel =
    buddy.status === "online" ? "Online"
    : buddy.status === "nearby" ? "In de buurt"
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
        onPress: () => { removeBuddy(buddy.id); router.back(); },
      },
    ]);
  };

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptBuddyRequest(buddy.id);
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Verzoek weigeren", `Wil je het verzoek van ${buddy.name} weigeren?`, [
      { text: "Annuleer", style: "cancel" },
      {
        text: "Weiger",
        style: "destructive",
        onPress: () => { declineBuddyRequest(buddy.id); router.back(); },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, isWeb ? { paddingBottom: 34 } : undefined]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.topBar,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>

        {buddy.relation === "buddy" && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFavorite(buddy.id);
            }}
          >
            <Ionicons
              name={buddy.isFavorite ? "star" : "star-outline"}
              size={24}
              color={buddy.isFavorite ? "#f59e0b" : colors.mutedForeground}
            />
          </Pressable>
        )}
      </View>

      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Avatar
          name={buddy.name}
          size={88}
          uri={buddy.avatarUri}
          showOnlineIndicator
          isOnline={buddy.status === "online"}
          isNearby={buddy.status === "nearby"}
        />
        <Text style={[styles.name, { color: colors.foreground }]}>{buddy.name}</Text>

        <View style={styles.metaRow}>
          {buddy.gender && (
            <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{buddy.gender}</Text>
            </View>
          )}
          {buddy.age && (
            <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{buddy.age} jaar</Text>
            </View>
          )}
          {buddy.seatNumber && (
            <View style={[styles.metaPill, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="airplane-outline" size={12} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>Stoel {buddy.seatNumber}</Text>
            </View>
          )}
        </View>

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

        {buddy.relation === "pending_sent" && (
          <View style={[styles.relationBadge, { backgroundColor: colors.muted }]}>
            <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.relationText, { color: colors.mutedForeground }]}>
              Verzoek verzonden
            </Text>
          </View>
        )}
      </View>

      {buddy.bio && (
        <View style={[styles.bioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bioTitle, { color: colors.mutedForeground }]}>Over</Text>
          <Text style={[styles.bioText, { color: colors.foreground }]}>{buddy.bio}</Text>
        </View>
      )}

      {sharedInterests.length > 0 && (
        <View style={[styles.interestsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.interestsTitleRow}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={[styles.bioTitle, { color: colors.primary }]}>
              {sharedInterests.length} Gedeelde interesse{sharedInterests.length > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.chipGrid}>
            {sharedInterests.map((i) => (
              <InterestChip key={i} label={i} selected />
            ))}
          </View>
          {otherInterests.length > 0 && (
            <>
              <Text style={[styles.bioTitle, { color: colors.mutedForeground, marginTop: 10 }]}>
                Overige interesses
              </Text>
              <View style={styles.chipGrid}>
                {otherInterests.map((i) => (
                  <InterestChip key={i} label={i} />
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {sharedInterests.length === 0 && (buddy.interests?.length ?? 0) > 0 && (
        <View style={[styles.interestsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bioTitle, { color: colors.mutedForeground }]}>Interesses</Text>
          <View style={styles.chipGrid}>
            {buddy.interests!.map((i) => (
              <InterestChip key={i} label={i} selected />
            ))}
          </View>
        </View>
      )}

      <View style={styles.actions}>
        {buddy.relation === "buddy" && (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleMessage}
          >
            <Ionicons name="chatbubble" size={20} color={colors.primaryForeground} />
            <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Stuur bericht</Text>
          </Pressable>
        )}

        {buddy.relation === "pending_received" && (
          <View style={styles.requestRow}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1 }]}
              onPress={handleAccept}
            >
              <Ionicons name="checkmark" size={20} color={colors.primaryForeground} />
              <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Accepteer buddy</Text>
            </Pressable>
            <Pressable
              style={[styles.declineBtn, { borderColor: colors.border }]}
              onPress={handleDecline}
            >
              <Text style={[styles.declineText, { color: colors.destructive }]}>Weiger</Text>
            </Pressable>
          </View>
        )}

        {buddy.relation === "pending_sent" && (
          <View style={[styles.pendingBanner, { backgroundColor: colors.muted }]}>
            <Ionicons name="time-outline" size={18} color={colors.mutedForeground} />
            <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>
              Wachten op reactie van {buddy.name}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.fpCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.fpRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={[styles.fpLabel, { color: colors.mutedForeground }]}>Fingerprint</Text>
        </View>
        <Text style={[styles.fpValue, { color: colors.foreground }]}>{buddy.fingerprint}</Text>
      </View>

      {buddy.relation === "buddy" && (
        <Pressable
          style={[styles.dangerBtn, { borderColor: colors.border }]}
          onPress={handleRemove}
        >
          <Text style={[styles.dangerText, { color: colors.destructive }]}>Verwijder buddy</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heroCard: {
    alignItems: "center",
    padding: 28,
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  name: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  metaText: { fontSize: 13, fontFamily: "Inter_500Medium" },
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
  },
  verifiedText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  relationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  relationText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bioCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  bioTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  bioText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  interestsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  interestsTitleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: { paddingHorizontal: 16, marginBottom: 12, gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  actionText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  requestRow: { flexDirection: "row", gap: 10 },
  declineBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  declineText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  pendingText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  fpCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  fpRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fpLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fpValue: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
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
