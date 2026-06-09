import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type GroupType = "flight" | "private" | "open" | null;

export default function NewGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buddies, createGroup, profile } = useApp();
  const [step, setStep] = useState<0 | 1>(0);
  const [groupType, setGroupType] = useState<GroupType>(null);
  const [flightNumber, setFlightNumber] = useState("");
  const [destination, setDestination] = useState("");
  const [groupName, setGroupName] = useState("");
  const [isPrivateFlight, setIsPrivateFlight] = useState(false);
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

  const selectType = (type: GroupType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGroupType(type);
    setStep(1);
  };

  const handleBack = () => {
    if (step === 1) { setStep(0); setGroupType(null); }
    else router.back();
  };

  const getEffectiveName = (): string => {
    if (groupType === "flight") {
      const fn = flightNumber.trim().toUpperCase();
      return destination.trim() ? `${fn} ✈ ${destination.trim()}` : fn;
    }
    return groupName.trim();
  };

  const canCreate = (): boolean => {
    if (groupType === "flight") return flightNumber.trim().length >= 3;
    return groupName.trim().length > 0;
  };

  const handleCreate = () => {
    if (!canCreate()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const name = getEffectiveName();
    const isPrivate = groupType === "private" || (groupType === "flight" && isPrivateFlight);
    const flightNum = groupType === "flight" ? flightNumber.trim().toUpperCase() : undefined;

    const newConv = createGroup(name, selectedIds, {
      isPrivate,
      flightNumber: flightNum,
    });

    router.replace(`/chat/${newConv.id}`);
  };

  const stepTitle = step === 0
    ? "Nieuwe groep"
    : groupType === "flight" ? "Vluchtgroep"
    : groupType === "private" ? "Privégroep"
    : "Open groep";

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
        <Pressable onPress={handleBack} style={styles.backBtn}>
          {step === 0
            ? <Text style={[styles.cancelText, { color: colors.primary }]}>Annuleer</Text>
            : <Ionicons name="chevron-back" size={24} color={colors.primary} />
          }
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{stepTitle}</Text>
        {step === 1 ? (
          <Pressable onPress={handleCreate} disabled={!canCreate()} testID="create-group-button">
            <Text style={[styles.createText, { color: canCreate() ? colors.primary : colors.mutedForeground }]}>
              Aanmaken
            </Text>
          </Pressable>
        ) : (
          <View style={{ minWidth: 70 }} />
        )}
      </View>

      {step === 0 && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.stepHint, { color: colors.mutedForeground }]}>
            Welk soort groep wil je aanmaken?
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.typeCard,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => selectType("flight")}
            testID="type-flight"
          >
            <View style={[styles.typeIcon, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="airplane" size={28} color={colors.primary} />
            </View>
            <View style={styles.typeInfo}>
              <Text style={[styles.typeTitle, { color: colors.foreground }]}>Vluchtgroep</Text>
              <Text style={[styles.typeDesc, { color: colors.mutedForeground }]}>
                Gebaseerd op vluchtnummer. Openbaar of privé.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.typeCard,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => selectType("private")}
            testID="type-private"
          >
            <View style={[styles.typeIcon, { backgroundColor: colors.nearby + "22" }]}>
              <Ionicons name="lock-closed" size={28} color={colors.nearby} />
            </View>
            <View style={styles.typeInfo}>
              <Text style={[styles.typeTitle, { color: colors.foreground }]}>Privégroep</Text>
              <Text style={[styles.typeDesc, { color: colors.mutedForeground }]}>
                Alleen voor uitgenodigde buddies. Zichtbaar met slotje.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.typeCard,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => selectType("open")}
            testID="type-open"
          >
            <View style={[styles.typeIcon, { backgroundColor: colors.success + "22" }]}>
              <Ionicons name="people" size={28} color={colors.success} />
            </View>
            <View style={styles.typeInfo}>
              <Text style={[styles.typeTitle, { color: colors.foreground }]}>Open groep</Text>
              <Text style={[styles.typeDesc, { color: colors.mutedForeground }]}>
                Iedereen in de buurt kan deelnemen.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>
        </ScrollView>
      )}

      {step === 1 && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 20 }]}
          keyboardShouldPersistTaps="handled"

          showsVerticalScrollIndicator={false}
        >
          {groupType === "flight" && (
            <>
              <View style={[styles.formSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.formRow}>
                  <Ionicons name="airplane-outline" size={20} color={colors.primary} />
                  <TextInput
                    style={[styles.formInput, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
                    placeholder="Vluchtnummer (bijv. KL1234)"
                    placeholderTextColor={colors.mutedForeground}
                    value={flightNumber}
                    onChangeText={(t) => setFlightNumber(t.toUpperCase())}
                    maxLength={8}
                    autoCapitalize="characters"
                    autoFocus
                    returnKeyType="next"
                    testID="flight-number-input"
                  />
                </View>
                <View style={[styles.formDivider, { backgroundColor: colors.border }]} />
                <View style={styles.formRow}>
                  <Ionicons name="location-outline" size={20} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.formInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                    placeholder="Bestemming (optioneel, bijv. Bangkok)"
                    placeholderTextColor={colors.mutedForeground}
                    value={destination}
                    onChangeText={setDestination}
                    maxLength={30}
                    returnKeyType="done"
                  />
                </View>
              </View>

              <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.toggleInfo}>
                  <Ionicons name={isPrivateFlight ? "lock-closed" : "earth"} size={20} color={isPrivateFlight ? colors.nearby : colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
                      {isPrivateFlight ? "Privégroep" : "Openbare groep"}
                    </Text>
                    <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>
                      {isPrivateFlight
                        ? "Alleen zichtbaar voor uitgenodigden"
                        : "Iedereen op vlucht kan deelnemen"}
                    </Text>
                  </View>
                  <Switch
                    value={isPrivateFlight}
                    onValueChange={(v) => {
                      Haptics.selectionAsync();
                      setIsPrivateFlight(v);
                    }}
                    trackColor={{ false: colors.muted, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>

              {flightNumber.trim().length >= 3 && (
                <View style={[styles.previewCard, { backgroundColor: colors.secondary, borderColor: colors.primary + "44" }]}>
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Groepsnaam wordt:</Text>
                  <Text style={[styles.previewName, { color: colors.primary }]}>{getEffectiveName()}</Text>
                </View>
              )}
            </>
          )}

          {(groupType === "private" || groupType === "open") && (
            <View style={[styles.formSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.formRow}>
                <Ionicons name={groupType === "private" ? "lock-closed-outline" : "people-outline"} size={20} color={colors.primary} />
                <TextInput
                  style={[styles.formInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  placeholder="Groepsnaam..."
                  placeholderTextColor={colors.mutedForeground}
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={50}
                  autoFocus
                  returnKeyType="done"
                />
              </View>
            </View>
          )}

          <Text style={[styles.membersLabel, { color: colors.mutedForeground }]}>
            {groupType === "flight" && !isPrivateFlight
              ? "Buddies uitnodigen (optioneel)"
              : `Buddies toevoegen (${selectedIds.length} geselecteerd)`}
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.buddyName, { color: colors.foreground }]}>{buddy.name}</Text>
                  {buddy.seatNumber && (
                    <Text style={[styles.buddySeat, { color: colors.mutedForeground }]}>
                      Stoel {buddy.seatNumber}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: selected ? colors.primary : "transparent",
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {selected && <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />}
                </View>
              </Pressable>
            );
          })}

          {buddies.length === 0 && (
            <View style={styles.noBuddies}>
              <Text style={[styles.noBuddiesText, { color: colors.mutedForeground }]}>
                Geen buddies beschikbaar
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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
  backBtn: { minWidth: 70 },
  cancelText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  createText: { fontSize: 16, fontFamily: "Inter_600SemiBold", minWidth: 70, textAlign: "right" },
  scroll: { padding: 16, gap: 12 },
  stepHint: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 8, lineHeight: 20 },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  typeIcon: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  typeInfo: { flex: 1, gap: 3 },
  typeTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  typeDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  formSection: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  formInput: { flex: 1, fontSize: 16 },
  formDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  toggleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  toggleInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  toggleDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  previewLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  previewName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  membersLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  buddyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  buddyName: { fontSize: 16, fontFamily: "Inter_500Medium" },
  buddySeat: { fontSize: 12, fontFamily: "Inter_400Regular" },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  noBuddies: { alignItems: "center", paddingTop: 40 },
  noBuddiesText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
