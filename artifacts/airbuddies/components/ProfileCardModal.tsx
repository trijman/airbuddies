import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
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
import type { Buddy } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatLastSeen(ts?: number): string {
  if (!ts) return "Onbekend";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Zojuist actief";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min geleden`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} uur geleden`;
  return `${Math.floor(diff / 86400_000)} dag geleden`;
}

interface Props {
  buddy: Buddy | null;
  visible: boolean;
  onClose: () => void;
  myInterests?: string[];
}

export function ProfileCardModal({ buddy, visible, onClose, myInterests = [] }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { removeBuddy, toggleFavorite, startConversation, acceptBuddyRequest, declineBuddyRequest, sendBuddyRequest } = useApp();
  const isWeb = Platform.OS === "web";
  const bottomPad = isWeb ? 24 : insets.bottom;

  if (!buddy) return null;

  const sharedInterests = myInterests.filter((i) => buddy.interests?.includes(i));

  const statusColor =
    buddy.status === "online" ? colors.online
    : buddy.status === "nearby" ? colors.nearby
    : colors.mutedForeground;

  const statusLabel =
    buddy.status === "online" ? "Online"
    : buddy.status === "nearby" ? "In de buurt"
    : formatLastSeen(buddy.lastSeen);

  const handleMessage = () => {
    onClose();
    const conv = startConversation(buddy.id);
    router.push(`/chat/${conv.id}`);
  };

  const handleViewProfile = () => {
    onClose();
    router.push(`/profile/${buddy.id}`);
  };

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeBuddy(buddy.id);
    onClose();
  };

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptBuddyRequest(buddy.id);
    onClose();
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    declineBuddyRequest(buddy.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 16 }]}>
        <View style={[styles.handle, { backgroundColor: colors.muted }]} />

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.header}>
            <View style={styles.avatarWrap}>
              <Avatar
                name={buddy.name}
                size={76}
                showOnlineIndicator
                isOnline={buddy.status === "online"}
                isNearby={buddy.status === "nearby"}
              />
              {buddy.relation === "buddy" && buddy.isFavorite && (
                <View style={[styles.favBadge, { backgroundColor: "#f59e0b" }]}>
                  <Ionicons name="star" size={10} color="#fff" />
                </View>
              )}
            </View>

            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {buddy.name}
                </Text>
                {buddy.isVerified && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
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
                  <View style={[styles.seatPill, { backgroundColor: colors.primary + "18" }]}>
                    <Ionicons name="airplane-outline" size={10} color={colors.primary} />
                    <Text style={[styles.seatText, { color: colors.primary }]}>{buddy.seatNumber}</Text>
                  </View>
                )}
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.muted }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {buddy.bio ? (
            <Text style={[styles.bio, { color: colors.mutedForeground, borderTopColor: colors.border }]}>
              {buddy.bio}
            </Text>
          ) : null}

          {sharedInterests.length > 0 && (
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <View style={styles.sectionLabel}>
                <Ionicons name="sparkles" size={13} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                  {sharedInterests.length} gedeelde interesse{sharedInterests.length > 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.chips}>
                {sharedInterests.map((i) => (
                  <InterestChip key={i} label={i} selected small />
                ))}
              </View>
            </View>
          )}

          {(buddy.interests?.length ?? 0) > 0 && sharedInterests.length < (buddy.interests?.length ?? 0) && (
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Interesses</Text>
              <View style={styles.chips}>
                {buddy.interests!
                  .filter((i) => !sharedInterests.includes(i))
                  .map((i) => (
                    <InterestChip key={i} label={i} small />
                  ))}
              </View>
            </View>
          )}

          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            {buddy.relation === "buddy" && (
              <>
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={handleMessage}
                >
                  <Ionicons name="chatbubble" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Stuur bericht</Text>
                </Pressable>

                <View style={styles.secondaryRow}>
                  <Pressable
                    style={[styles.secondaryBtn, { backgroundColor: colors.muted, flex: 1 }]}
                    onPress={handleViewProfile}
                  >
                    <Ionicons name="person-outline" size={16} color={colors.foreground} />
                    <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Profiel</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.secondaryBtn, { backgroundColor: colors.muted, flex: 1 }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleFavorite(buddy.id);
                    }}
                  >
                    <Ionicons
                      name={buddy.isFavorite ? "star" : "star-outline"}
                      size={16}
                      color={buddy.isFavorite ? "#f59e0b" : colors.foreground}
                    />
                    <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                      {buddy.isFavorite ? "Favoriet" : "Favoriet"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.secondaryBtn, { backgroundColor: colors.muted, flex: 1 }]}
                    onPress={handleRemove}
                  >
                    <Ionicons name="person-remove-outline" size={16} color={colors.destructive} />
                    <Text style={[styles.secondaryBtnText, { color: colors.destructive }]}>Verwijder</Text>
                  </Pressable>
                </View>
              </>
            )}

            {buddy.relation === "pending_received" && (
              <>
                <View style={[styles.requestBanner, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" }]}>
                  <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                  <Text style={[styles.requestText, { color: colors.primary }]}>
                    Wil jou toevoegen als buddy
                  </Text>
                </View>
                <View style={styles.secondaryRow}>
                  <Pressable
                    style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={handleAccept}
                  >
                    <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
                    <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Accepteer</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryBtn, { backgroundColor: colors.muted, flex: 1 }]}
                    onPress={handleDecline}
                  >
                    <Ionicons name="close" size={16} color={colors.foreground} />
                    <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Weiger</Text>
                  </Pressable>
                </View>
              </>
            )}

            {buddy.relation === "pending_sent" && (
              <View style={[styles.requestBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.requestText, { color: colors.mutedForeground }]}>
                  Verzoek verzonden — wachten op reactie
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 4,
  },
  avatarWrap: { position: "relative" },
  favBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1, gap: 4, paddingTop: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3, flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  seatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  seatText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    color: "#888",
  },
  section: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  sectionLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  actions: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  secondaryRow: { flexDirection: "row", gap: 8 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  secondaryBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  requestBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  requestText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
});
