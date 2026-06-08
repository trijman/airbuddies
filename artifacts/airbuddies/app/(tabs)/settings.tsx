import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { InterestChip } from "@/components/InterestChip";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface RegisteredFlight {
  flightNumber: string;
  flightDate: string;
  seatNumber?: string;
  flightInfo?: { iataCode?: string; origin?: string; destination?: string };
}

interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}

function SettingRow({ icon, iconColor, label, value, onPress, danger, right }: SettingRowProps) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        { backgroundColor: pressed && onPress ? colors.muted : colors.card },
      ]}
      onPress={onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconColor + "22" }]}>
        <Ionicons name={icon as never} size={20} color={iconColor} />
      </View>
      <Text
        style={[
          styles.settingLabel,
          { color: danger ? colors.destructive : colors.foreground },
        ]}
      >
        {label}
      </Text>
      <View style={styles.settingRight}>
        {value && (
          <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>
        )}
        {right}
        {onPress && !right && (
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        )}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, toggleVisibility, deleteAllConversations } = useApp();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const [flights, setFlights] = useState<RegisteredFlight[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Auto-cleanup setting: { enabled, hours: 0=direct,1,4,10 }
  const [autoClean, setAutoClean] = useState(false);
  const [autoCleanHours, setAutoCleanHours] = useState<0 | 1 | 4 | 10>(1);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("my_flights_v1").then((raw) => {
        if (raw) setFlights(JSON.parse(raw));
        else setFlights([]);
      });
      AsyncStorage.getItem("chat_cleanup_v1").then((raw) => {
        if (raw) {
          const s = JSON.parse(raw);
          setAutoClean(s.enabled ?? false);
          setAutoCleanHours(s.hours ?? 1);
        }
      });
    }, [])
  );

  const saveAutoClean = async (enabled: boolean, hours: 0 | 1 | 4 | 10) => {
    await AsyncStorage.setItem("chat_cleanup_v1", JSON.stringify({ enabled, hours }));
  };

  const handleClearAllChats = () => {
    Alert.alert(
      "Wis alle chats",
      "Wil je echt alle chatgeschiedenis nu wissen? Dit kan niet ongedaan worden gemaakt.",
      [
        { text: "Annuleer", style: "cancel" },
        {
          text: "Wis alles",
          style: "destructive",
          onPress: () => {
            deleteAllConversations();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const flightKey = (f: RegisteredFlight) => `${f.flightNumber}_${f.flightDate}`;

  const startEdit = (f: RegisteredFlight) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingKey(flightKey(f));
    setEditValue(f.seatNumber ?? "");
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveEdit = async (f: RegisteredFlight) => {
    const seat = editValue.trim().toUpperCase();
    const updated = flights.map((fl) =>
      flightKey(fl) === flightKey(f) ? { ...fl, seatNumber: seat || undefined } : fl
    );
    await AsyncStorage.setItem("my_flights_v1", JSON.stringify(updated));
    setFlights(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditingKey(null);
    setEditValue("");
  };

  const fp = profile?.fingerprint ?? "";
  const fpDisplay = fp.slice(0, 11) + "..." + fp.slice(-5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, isWeb ? { paddingBottom: 34 } : undefined]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Instellingen</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.profileCard,
          { backgroundColor: pressed ? colors.muted : colors.card, borderColor: colors.border },
        ]}
        onPress={() => router.push("/edit-profile")}
        testID="profile-edit-button"
      >
        <Avatar name={profile?.name ?? "Ik"} size={64} seed={profile?.avatarSeed ?? profile?.name} />
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>
            {profile?.name ?? "Mijn profiel"}
          </Text>
          {profile?.bio ? (
            <Text style={[styles.profileBio, { color: colors.mutedForeground }]} numberOfLines={2}>
              {profile.bio}
            </Text>
          ) : (
            <Text style={[styles.profileBio, { color: colors.primary }]}>
              Profiel aanvullen →
            </Text>
          )}
          {(profile?.interests?.length ?? 0) > 0 && (
            <View style={styles.interestRow}>
              {profile!.interests.slice(0, 3).map((i) => (
                <InterestChip key={i} label={i} selected small />
              ))}
              {profile!.interests.length > 3 && (
                <Text style={[styles.moreInterests, { color: colors.mutedForeground }]}>
                  +{profile!.interests.length - 3}
                </Text>
              )}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </Pressable>

      {flights.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Stoelnummers</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {flights.map((f, i) => {
              const key = flightKey(f);
              const isEditing = editingKey === key;
              const dest = f.flightInfo?.destination ?? f.flightNumber.slice(2);
              return (
                <View key={key}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <Pressable
                    style={({ pressed }) => [
                      styles.settingRow,
                      { backgroundColor: pressed && !isEditing ? colors.muted : colors.card },
                    ]}
                    onPress={() => !isEditing && startEdit(f)}
                  >
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + "22" }]}>
                      <Ionicons name="airplane-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingLabel, { color: colors.foreground, flex: 0 }]}>
                        {f.flightNumber}
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                        {dest} · {f.flightDate}
                      </Text>
                    </View>
                    {!isEditing && (
                      <View style={styles.settingRight}>
                        <Text style={[styles.settingValue, { color: f.seatNumber ? colors.primary : colors.mutedForeground }]}>
                          {f.seatNumber ?? "Niet ingesteld"}
                        </Text>
                        <Ionicons name="pencil-outline" size={15} color={colors.mutedForeground} />
                      </View>
                    )}
                  </Pressable>
                  {isEditing && (
                    <View style={[styles.seatEditRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <TextInput
                        style={[styles.seatEditInput, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.card }]}
                        value={editValue}
                        onChangeText={(t) => setEditValue(t.toUpperCase())}
                        placeholder="bijv. 14A"
                        placeholderTextColor={colors.mutedForeground}
                        autoCapitalize="characters"
                        maxLength={5}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => saveEdit(f)}
                      />
                      <Pressable
                        style={[styles.seatEditBtn, { backgroundColor: colors.primary, opacity: editValue.trim() ? 1 : 0.4 }]}
                        onPress={() => saveEdit(f)}
                        disabled={!editValue.trim()}
                      >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </Pressable>
                      <Pressable style={[styles.seatEditBtn, { backgroundColor: colors.muted }]} onPress={cancelEdit}>
                        <Ionicons name="close" size={18} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Zichtbaarheid</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon={profile?.isVisible ? "eye-outline" : "eye-off-outline"}
          iconColor={profile?.isVisible ? colors.success : colors.mutedForeground}
          label={profile?.isVisible ? "Profiel zichtbaar" : "Onzichtbaar"}
          right={
            <Switch
              value={profile?.isVisible ?? true}
              onValueChange={() => {
                Haptics.selectionAsync();
                toggleVisibility();
              }}
              trackColor={{ false: colors.muted, true: colors.success }}
              thumbColor="#ffffff"
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.visHint}>
          <Text style={[styles.visHintText, { color: colors.mutedForeground }]}>
            {profile?.isVisible
              ? "Anderen kunnen jou zien in Discover en in groepschats."
              : "Je bent onzichtbaar. Je kunt niet deelnemen aan openbare chats."}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Vlucht</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="airplane-outline"
          iconColor={colors.primary}
          label="Mijn Vluchten"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/my-flights");
          }}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Chats</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="timer-outline"
          iconColor={colors.primary}
          label="Wis chats na landing"
          right={
            <Switch
              value={autoClean}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                setAutoClean(val);
                saveAutoClean(val, autoCleanHours);
              }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#ffffff"
            />
          }
        />
        {autoClean && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + "22" }]}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Na hoeveel uur?</Text>
              <View style={styles.hourPicker}>
                {([0, 1, 4, 10] as const).map((h) => (
                  <Pressable
                    key={h}
                    style={[
                      styles.hourChip,
                      {
                        backgroundColor: autoCleanHours === h ? colors.primary : colors.muted,
                        borderColor: autoCleanHours === h ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAutoCleanHours(h);
                      saveAutoClean(autoClean, h);
                    }}
                  >
                    <Text style={[styles.hourChipText, { color: autoCleanHours === h ? "#fff" : colors.mutedForeground }]}>
                      {h === 0 ? "Direct" : `${h}u`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="trash-outline"
          iconColor={colors.destructive}
          label="Wis alle chats"
          danger
          onPress={handleClearAllChats}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Privacy & Veiligheid</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="shield-checkmark-outline"
          iconColor={colors.primary}
          label="Fingerprint"
          value={fpDisplay}
          onPress={() => Alert.alert("Jouw fingerprint", profile?.fingerprint ?? "")}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="lock-closed-outline"
          iconColor={colors.success}
          label="Encryptie"
          value="Noise XX"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="eye-off-outline"
          iconColor={colors.accent}
          label="Algoritme"
          value="ChaCha20-Poly1305"
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Netwerk</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="bluetooth-outline"
          iconColor={colors.primary}
          label="Bereik"
          value="~100m direct"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="git-network-outline"
          iconColor={colors.nearby}
          label="Mesh routing"
          value="Max 7 hops"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="server-outline"
          iconColor={colors.success}
          label="Modus"
          value="Geen server"
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Over</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="information-circle-outline" iconColor={colors.primary} label="Versie" value="1.0.0" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="heart-outline" iconColor={colors.destructive} label="Gebaseerd op Bitchat protocol" />
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.primary + "33" }]}>
        <Ionicons name="radio-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.secondaryForeground }]}>
          Airbuddies werkt volledig zonder internet. Berichten gaan via Bluetooth van telefoon naar telefoon — ook in het vliegtuig.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profileBio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  interestRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  moreInterests: { fontSize: 12, fontFamily: "Inter_400Regular", alignSelf: "center" },
  hourPicker: {
    flexDirection: "row",
    gap: 6,
  },
  hourChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  hourChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  seatEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  seatEditInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textAlign: "center",
  },
  seatEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginHorizontal: 20,
    marginBottom: 6,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  settingLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  visHint: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
  visHintText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 30,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
});
