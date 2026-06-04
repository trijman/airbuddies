import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, iconColor, label, value, onPress, danger }: SettingRowProps) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        { backgroundColor: pressed ? colors.muted : colors.card },
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
          <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>
            {value}
          </Text>
        )}
        {onPress && (
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        )}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useApp();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.name ?? "");
  const isWeb = Platform.OS === "web";

  const topPad = isWeb ? 67 : insets.top;

  const saveName = () => {
    if (nameInput.trim()) {
      updateProfile(nameInput.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditing(false);
  };

  const fp = profile?.fingerprint ?? "";
  const fpDisplay = fp.slice(0, 11) + "..." + fp.slice(-5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        isWeb ? { paddingBottom: 34 } : undefined,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Instellingen</Text>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Avatar name={profile?.name ?? "Ik"} size={72} />
        <View style={styles.profileInfo}>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                style={[
                  styles.nameInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.primary,
                    backgroundColor: colors.muted,
                  },
                ]}
                autoFocus
                onSubmitEditing={saveName}
                returnKeyType="done"
              />
              <Pressable onPress={saveName}>
                <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.nameRow} onPress={() => setEditing(true)}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>
                {profile?.name ?? "Ik"}
              </Text>
              <Ionicons name="pencil" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
          <Text style={[styles.profileFp, { color: colors.mutedForeground }]}>
            {fpDisplay}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Privacy & Veiligheid</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="shield-checkmark-outline"
          iconColor={colors.primary}
          label="Fingerprint tonen"
          onPress={() =>
            Alert.alert("Jouw fingerprint", profile?.fingerprint ?? "", [
              { text: "Sluiten" },
            ])
          }
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
          iconColor={colors.accentForeground}
          label="Protocol"
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
        <SettingRow
          icon="information-circle-outline"
          iconColor={colors.primary}
          label="Versie"
          value="1.0.0"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="heart-outline"
          iconColor={colors.destructive}
          label="Gebaseerd op Bitchat protocol"
        />
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.primary + "33" }]}>
        <Ionicons name="radio-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.secondaryForeground }]}>
          Airbuddies werkt volledig zonder internet. Berichten gaan via Bluetooth van telefoon naar telefoon.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  profileInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  profileName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileFp: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  settingRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  settingValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
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
