import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
import { InviteModal } from "@/components/InviteModal";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function GroupInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    conversations,
    buddies,
    profile,
    muteConversation,
    leaveGroup,
  } = useApp();
  const [showInvite, setShowInvite] = useState(false);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const conv = conversations.find((c) => c.id === id);

  if (!conv) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: topPad + 8, paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.notFound}>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>
            Groep niet gevonden
          </Text>
        </View>
      </View>
    );
  }

  const isFlight = !!conv.flightNumber;
  const isPrivate = conv.isPrivate && !isFlight;
  const isAdmin = conv.adminId === profile?.id;

  const members = conv.participantIds.map((pid) => {
    if (pid === profile?.id) {
      return {
        id: pid,
        name: profile.name,
        status: "online" as const,
        seatNumber: profile.seatNumber,
        avatarUri: profile.avatarUri,
        isMe: true,
      };
    }
    const buddy = buddies.find((b) => b.id === pid);
    return {
      id: pid,
      name: buddy?.name ?? "Onbekende passagier",
      status: buddy?.status ?? "offline",
      seatNumber: buddy?.seatNumber,
      avatarUri: buddy?.avatarUri,
      isMe: false,
      isBuddy: !!buddy && buddy.relation === "buddy",
    };
  });

  const onlineCount = members.filter((m) => m.status === "online" || m.status === "nearby").length;

  const handleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    muteConversation(conv.id, !conv.muted);
  };

  const handleLeave = () => {
    Alert.alert(
      "Verlaat groep",
      `Wil je "${conv.name}" verlaten? Je kunt later niet meer deelnemen.`,
      [
        { text: "Annuleer", style: "cancel" },
        {
          text: "Verlaten",
          style: "destructive",
          onPress: () => {
            leaveGroup(conv.id);
            router.dismissAll();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) }]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.topBar,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]}>Groepinfo</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Avatar name={conv.name ?? "Groep"} size={80} isGroup seed={conv.avatarSeed} />
        <View style={styles.heroTitleRow}>
          {isFlight && <Ionicons name="airplane" size={16} color={colors.primary} />}
          {isPrivate && <Ionicons name="lock-closed" size={14} color={colors.nearby} />}
          <Text style={[styles.heroName, { color: colors.foreground }]}>{conv.name}</Text>
        </View>
        {conv.flightNumber && (
          <View style={[styles.flightPill, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="airplane-outline" size={12} color={colors.primary} />
            <Text style={[styles.flightPillText, { color: colors.primary }]}>{conv.flightNumber}</Text>
          </View>
        )}
        {conv.description && (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{conv.description}</Text>
        )}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: colors.muted }]}>
            <Ionicons name="people-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>
              {conv.participantIds.length} deelnemers
            </Text>
          </View>
          {onlineCount > 0 && (
            <View style={[styles.statPill, { backgroundColor: colors.online + "18" }]}>
              <View style={[styles.onlineDot, { backgroundColor: colors.online }]} />
              <Text style={[styles.statText, { color: colors.online }]}>{onlineCount} online</Text>
            </View>
          )}
          {conv.muted && (
            <View style={[styles.statPill, { backgroundColor: colors.muted }]}>
              <Ionicons name="notifications-off-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>Gedempt</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowInvite(true)}
        >
          <Ionicons name="person-add-outline" size={22} color={colors.primary} />
          <Text style={[styles.actionTileLabel, { color: colors.foreground }]}>Uitnodigen</Text>
        </Pressable>
        <Pressable
          style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleMute}
        >
          <Ionicons
            name={conv.muted ? "notifications-outline" : "notifications-off-outline"}
            size={22}
            color={conv.muted ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.actionTileLabel, { color: conv.muted ? colors.primary : colors.foreground }]}>
            {conv.muted ? "Dempen uit" : "Dempen"}
          </Text>
        </Pressable>
        {!isFlight && (
          <Pressable
            style={[styles.actionTile, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleLeave}
          >
            <Ionicons name="exit-outline" size={22} color={colors.destructive} />
            <Text style={[styles.actionTileLabel, { color: colors.destructive }]}>Verlaten</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          DEELNEMERS — {conv.participantIds.length}
        </Text>
        {members.map((member, idx) => {
          const statusColor =
            member.status === "online" ? colors.online
            : member.status === "nearby" ? colors.nearby
            : colors.mutedForeground;
          const statusLabel =
            member.status === "online" ? "Online"
            : member.status === "nearby" ? "In de buurt"
            : "Offline";
          const isLast = idx === members.length - 1;

          return (
            <Pressable
              key={member.id}
              style={({ pressed }) => [
                styles.memberRow,
                !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                pressed && !member.isMe && { backgroundColor: colors.muted + "88" },
              ]}
              onPress={() => {
                if (!member.isMe) router.push(`/profile/${member.id}`);
              }}
              disabled={member.isMe}
            >
              <Avatar
                name={member.name}
                size={44}
                uri={member.avatarUri}
                showOnlineIndicator
                isOnline={member.status === "online"}
                isNearby={member.status === "nearby"}
              />
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
                    {member.name}
                  </Text>
                  {member.isMe && (
                    <View style={[styles.meBadge, { backgroundColor: colors.primary + "18" }]}>
                      <Text style={[styles.meBadgeText, { color: colors.primary }]}>Jij</Text>
                    </View>
                  )}
                  {conv.adminId === member.id && (
                    <View style={[styles.adminBadge, { backgroundColor: colors.nearby + "22" }]}>
                      <Ionicons name="shield-checkmark" size={10} color={colors.nearby} />
                      <Text style={[styles.adminBadgeText, { color: colors.nearby }]}>Beheerder</Text>
                    </View>
                  )}
                </View>
                <View style={styles.memberMeta}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.memberStatus, { color: statusColor }]}>{statusLabel}</Text>
                  {member.seatNumber && (
                    <>
                      <Text style={[styles.memberSep, { color: colors.border }]}>·</Text>
                      <Ionicons name="airplane-outline" size={10} color={colors.primary} />
                      <Text style={[styles.memberSeat, { color: colors.primary }]}>{member.seatNumber}</Text>
                    </>
                  )}
                </View>
              </View>
              {!member.isMe && (
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
              )}
            </Pressable>
          );
        })}
      </View>

      {conv.createdAt && (
        <Text style={[styles.createdAt, { color: colors.mutedForeground }]}>
          Aangemaakt op {new Date(conv.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
        </Text>
      )}

      {isPrivate && (
        <Pressable
          style={[styles.leaveBtn, { borderColor: colors.destructive + "44" }]}
          onPress={handleLeave}
        >
          <Ionicons name="exit-outline" size={18} color={colors.destructive} />
          <Text style={[styles.leaveBtnText, { color: colors.destructive }]}>Verlaat groep</Text>
        </Pressable>
      )}

      <InviteModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        conversationId={conv.id}
        currentParticipantIds={conv.participantIds}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 34, alignItems: "flex-start" },
  topBarTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  heroCard: {
    alignItems: "center",
    padding: 24,
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  heroTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroName: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  flightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flightPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actionsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  actionTile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionTileLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  memberInfo: { flex: 1, gap: 3 },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  memberName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  meBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  meBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  adminBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  memberMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  memberStatus: { fontSize: 12, fontFamily: "Inter_400Regular" },
  memberSep: { fontSize: 12 },
  memberSeat: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  createdAt: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 16,
  },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  leaveBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
