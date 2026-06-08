import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Avatar } from "@/components/Avatar";
import { InterestChip } from "@/components/InterestChip";
import { useApp, INTERESTS } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const GENDERS = ["Man", "Vrouw", "Anders", "Zeg ik liever niet"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  multiline,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  maxLength?: number;
  multiline?: boolean;
}) {
  const colors = useColors();
  return (
    <TextInput
      style={[
        styles.input,
        {
          color: colors.foreground,
          backgroundColor: colors.muted,
          borderColor: colors.border,
          fontFamily: "Inter_400Regular",
          height: multiline ? 80 : 44,
          textAlignVertical: multiline ? "top" : "center",
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      keyboardType={keyboardType ?? "default"}
      maxLength={maxLength}
      multiline={multiline}
    />
  );
}

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useApp();
  const isWeb = Platform.OS === "web";

  const [name, setName] = useState(profile?.name ?? "");
  const [age, setAge] = useState(profile?.age?.toString() ?? "");
  const [gender, setGender] = useState(profile?.gender ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUri, setAvatarUri] = useState(profile?.avatarUri ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [instagram, setInstagram] = useState(profile?.instagram ?? "");
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Toegang nodig", "Geef toegang tot je fotobibliotheek om een profielfoto in te stellen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const removePhoto = () => {
    Alert.alert("Foto verwijderen", "Wil je je profielfoto verwijderen?", [
      { text: "Annuleer", style: "cancel" },
      { text: "Verwijder", style: "destructive", onPress: () => setAvatarUri("") },
    ]);
  };

  const toggleInterest = (interest: string) => {
    Haptics.selectionAsync();
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Naam vereist", "Vul je naam in.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({
      name: name.trim(),
      age: age ? parseInt(age, 10) : undefined,
      gender: gender || undefined,
      bio: bio.trim() || undefined,
      avatarUri: avatarUri || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      instagram: instagram.trim() || undefined,
      interests,
    });
    router.back();
  };

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
        <Text style={[styles.title, { color: colors.foreground }]}>Mijn profiel</Text>
        <Pressable onPress={handleSave}>
          <Text style={[styles.saveText, { color: colors.primary }]}>Opslaan</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 24 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={pickPhoto} style={styles.avatarWrap}>
            <Avatar
              name={name || "?"}
              size={80}
              seed={profile?.avatarSeed ?? name}
              uri={avatarUri || undefined}
            />
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>
          {avatarUri ? (
            <Pressable onPress={removePhoto}>
              <Text style={[styles.avatarHint, { color: "#ef4444" }]}>
                Foto verwijderen
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
              Tik om een foto te kiezen
            </Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Field label="Naam *">
            <Input value={name} onChangeText={setName} placeholder="Jouw naam" maxLength={40} />
          </Field>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Field label="Leeftijd">
            <Input value={age} onChangeText={setAge} placeholder="Jouw leeftijd" keyboardType="numeric" maxLength={3} />
          </Field>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Field label="Geslacht">
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g}
                  style={[
                    styles.genderPill,
                    {
                      backgroundColor: gender === g ? colors.primary : colors.muted,
                      borderColor: gender === g ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGender(gender === g ? "" : g);
                  }}
                >
                  <Text
                    style={[
                      styles.genderText,
                      { color: gender === g ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Field label="Bio">
            <Input
              value={bio}
              onChangeText={setBio}
              placeholder="Vertel iets over jezelf..."
              maxLength={200}
              multiline
            />
          </Field>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Interesses</Text>
        <View style={[styles.interestsWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chipGrid}>
            {INTERESTS.map((interest) => (
              <InterestChip
                key={interest}
                label={interest}
                selected={interests.includes(interest)}
                onPress={() => toggleInterest(interest)}
              />
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Contactinfo delen</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.contactHint, { color: colors.mutedForeground }]}>
            Alleen gedeeld als jij een contactkaart stuurt in een chat.
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Field label="Telefoonnummer">
            <Input value={phone} onChangeText={setPhone} placeholder="+31 6 12345678" keyboardType="phone-pad" />
          </Field>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Field label="E-mail">
            <Input value={email} onChangeText={setEmail} placeholder="jou@email.com" keyboardType="email-address" />
          </Field>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Field label="Instagram">
            <Input value={instagram} onChangeText={setInstagram} placeholder="@gebruikersnaam" />
          </Field>
        </View>
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
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold", minWidth: 70, textAlign: "right" },
  scroll: { padding: 16, gap: 0 },
  avatarSection: { alignItems: "center", paddingVertical: 20, gap: 8 },
  avatarHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  avatarWrap: { position: "relative" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  field: { padding: 14, gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genderPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  genderText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  interestsWrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  contactHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    lineHeight: 18,
  },
});
