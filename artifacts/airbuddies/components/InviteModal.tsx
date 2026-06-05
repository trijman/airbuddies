import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
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
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Buddy } from "@/context/AppContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  currentParticipantIds: string[];
}

export function InviteModal({ visible, onClose, conversationId, currentParticipantIds }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buddies, inviteToGroup } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const isWeb = Platform.OS === "web";
  const bottomPad = isWeb ? 24 : insets.bottom;

  const available: Buddy[] = useMemo(
    () => buddies.filter(
      (b) => b.relation === "buddy" && !currentParticipantIds.includes(b.id)
    ),
    [buddies, currentParticipantIds]
  );

  const toggle = (id: string) => {
    Haptics.selectionAsync();
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleInvite = () => {
    if (!selected.length) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    inviteToGroup(conversationId, selected);
    setSelected([]);
    onClose();
  };

  const handleClose = () => {
    setSelected([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, paddingBottom: bottomPad + 16 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.muted }]} />

        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Uitnodigen</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Kies buddies om toe te voegen
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={[styles.closeBtn, { backgroundColor: colors.muted }]}
          >
            <Ionicons name="close" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {available.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Niemand meer toe te voegen
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Al je buddies zitten al in deze groep
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {available.map((buddy) => {
                const isSelected = selected.includes(buddy.id);
                return (
                  <Pressable
                    key={buddy.id}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: pressed
                          ? colors.muted
                          : isSelected
                          ? colors.primary + "10"
                          : colors.background,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => toggle(buddy.id)}
                  >
                    <Avatar
                      name={buddy.name}
                      size={44}
                      showOnlineIndicator
                      isOnline={buddy.status === "online"}
                      isNearby={buddy.status === "nearby"}
                    />
                    <View style={styles.rowInfo}>
                      <Text
                        style={[styles.rowName, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {buddy.name}
                      </Text>
                      <View style={styles.rowMeta}>
                        {buddy.seatNumber && (
                          <View style={styles.seatRow}>
                            <Ionicons
                              name="airplane-outline"
                              size={10}
                              color={colors.primary}
                            />
                            <Text style={[styles.seatText, { color: colors.primary }]}>
                              {buddy.seatNumber}
                            </Text>
                          </View>
                        )}
                        {buddy.status === "online" && (
                          <Text style={[styles.statusText, { color: colors.online }]}>
                            Online
                          </Text>
                        )}
                        {buddy.status === "nearby" && (
                          <Text style={[styles.statusText, { color: colors.nearby }]}>
                            In de buurt
                          </Text>
                        )}
                      </View>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: isSelected ? colors.primary : "transparent",
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={[
                styles.inviteBtn,
                {
                  backgroundColor: selected.length > 0 ? colors.primary : colors.muted,
                },
              ]}
              onPress={handleInvite}
              disabled={selected.length === 0}
            >
              <Ionicons
                name="person-add"
                size={18}
                color={selected.length > 0 ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.inviteBtnText,
                  {
                    color:
                      selected.length > 0 ? colors.primaryForeground : colors.mutedForeground,
                  },
                ]}
              >
                {selected.length > 0
                  ? `Voeg ${selected.length} ${selected.length === 1 ? "persoon" : "personen"} toe`
                  : "Selecteer buddies"}
              </Text>
            </Pressable>
          </>
        )}
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
    maxHeight: "80%",
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
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flex: 1, marginBottom: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  rowInfo: { flex: 1, gap: 3 },
  rowName: { fontSize: 16, fontFamily: "Inter_500Medium" },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  seatRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  seatText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 14,
    gap: 8,
  },
  inviteBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
