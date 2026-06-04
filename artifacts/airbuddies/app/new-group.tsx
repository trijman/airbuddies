import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Avatar } from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function NewGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buddies, createGroup } = useApp();
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isWeb = Platform.OS === "web";

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const toggleSelect = (id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createGroup(groupName.trim(), selectedIds);
    router.back();
  };

  const canCreate = groupName.trim().length > 0 && selectedIds.length > 0;

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
        <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.primary }]}>Annuleer</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Nieuwe groep</Text>
        <Pressable
          onPress={handleCreate}
          disabled={!canCreate}
          testID="create-group-button"
        >
          <Text
            style={[
              styles.createText,
              { color: canCreate ? colors.primary : colors.mutedForeground },
            ]}
          >
            Maak aan
          </Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 16 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
      >
        <View style={[styles.nameSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="people" size={20} color={colors.primary} />
          <TextInput
            style={[styles.nameInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Groepsnaam..."
            placeholderTextColor={colors.mutedForeground}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
            autoFocus
            returnKeyType="done"
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Voeg buddies toe ({selectedIds.length} geselecteerd)
        </Text>

        {buddies.map((buddy) => {
          const selected = selectedIds.includes(buddy.id);
          return (
            <Pressable
              key={buddy.id}
              style={({ pressed }) => [
                styles.buddyRow,
                {
                  backgroundColor: pressed ? colors.muted : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                  borderWidth: selected ? 1.5 : 1,
                },
              ]}
              onPress={() => toggleSelect(buddy.id)}
            >
              <Avatar name={buddy.name} size={44} showOnlineIndicator isOnline={buddy.status === "online"} isNearby={buddy.status === "nearby"} />
              <Text style={[styles.buddyName, { color: colors.foreground }]}>{buddy.name}</Text>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: selected ? colors.primary : "transparent",
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                {selected && (
                  <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
                )}
              </View>
            </Pressable>
          );
        })}

        {buddies.length === 0 && (
          <View style={styles.noBuddies}>
            <Text style={[styles.noBuddiesText, { color: colors.mutedForeground }]}>
              Voeg eerst buddies toe via Discover
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: { minWidth: 70 },
  cancelText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  createText: { fontSize: 16, fontFamily: "Inter_600SemiBold", minWidth: 70, textAlign: "right" },
  scroll: { padding: 16, gap: 10 },
  nameSection: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 6,
  },
  nameInput: { flex: 1, fontSize: 16 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginVertical: 6,
  },
  buddyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  buddyName: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium" },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  noBuddies: { alignItems: "center", paddingTop: 40 },
  noBuddiesText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
