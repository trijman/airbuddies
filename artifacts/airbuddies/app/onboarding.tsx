import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
} from "react-native-reanimated";

import { Avatar } from "@/components/Avatar";
import { InterestChip } from "@/components/InterestChip";
import { useApp, INTERESTS } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOTAL_STEPS = 3;

const SEAT_REGEX = /^[1-9][0-9]?[A-Fa-f]$/;

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 24 : insets.top;
  const bottomPad = isWeb ? 24 : insets.bottom;

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [seatNumber, setSeatNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef<TextInput>(null);
  const seatInputRef = useRef<TextInput>(null);

  const progress = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: withSpring(`${(step / TOTAL_STEPS) * 100}%` as unknown as number, {
      damping: 20,
      stiffness: 120,
    }),
  }));

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s - 1);
  };

  const toggleInterest = (interest: string) => {
    Haptics.selectionAsync();
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeOnboarding({
      name: name.trim(),
      interests: selectedInterests,
      seatNumber: seatNumber.trim().toUpperCase() || undefined,
      avatarSeed: name.trim(),
    });
    router.replace("/(tabs)");
  };

  const nameValid = name.trim().length >= 2;
  const interestsValid = selectedInterests.length >= 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {step === 0 ? (
        <WelcomeStep
          topPad={topPad}
          bottomPad={bottomPad}
          colors={colors}
          onStart={goNext}
        />
      ) : (
        <View style={styles.stepContainer}>
          <View style={[styles.progressBar, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
            {step > 1 && (
              <Pressable onPress={goBack} style={styles.backBtn} hitSlop={16}>
                <Ionicons name="chevron-back" size={24} color={colors.foreground} />
              </Pressable>
            )}
            <View style={[styles.progressTrack, { backgroundColor: colors.muted, flex: 1 }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary },
                  useAnimatedStyle(() => ({
                    width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`,
                  })),
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              {step}/{TOTAL_STEPS}
            </Text>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[styles.stepContent, { paddingBottom: bottomPad + 32 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {step === 1 && (
                <Animated.View key="step1" entering={FadeInRight.duration(300).springify()} style={styles.stepInner}>
                  <View style={[styles.stepIconWrap, { backgroundColor: colors.primary + "18" }]}>
                    <Ionicons name="person-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                    Hoe heet je?
                  </Text>
                  <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
                    Je naam is alleen zichtbaar voor mensen in jouw buurt, niet online.
                  </Text>

                  <View style={styles.avatarPreviewRow}>
                    <Avatar name={name.trim() || "?"} size={72} seed={name.trim() || "preview"} />
                    <View style={styles.avatarPreviewText}>
                      <Text style={[styles.avatarName, { color: colors.foreground }]}>
                        {name.trim() || "Jouw naam"}
                      </Text>
                      <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
                        {name.trim().length >= 2 ? "Ziet er goed uit! 👋" : "Typ je naam hieronder"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.inputWrap,
                      {
                        backgroundColor: colors.card,
                        borderColor: name.length > 0 ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <TextInput
                      ref={nameInputRef}
                      style={[styles.textInput, { color: colors.foreground }]}
                      placeholder="Bijv. Alex of Sophie"
                      placeholderTextColor={colors.mutedForeground}
                      value={name}
                      onChangeText={setName}
                      autoFocus
                      maxLength={30}
                      returnKeyType="next"
                      onSubmitEditing={() => nameValid && goNext()}
                      testID="onboarding-name-input"
                    />
                    {name.length > 0 && (
                      <Pressable onPress={() => setName("")} hitSlop={12}>
                        <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                      </Pressable>
                    )}
                  </View>

                  <Pressable
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: nameValid ? colors.primary : colors.muted },
                    ]}
                    onPress={() => nameValid && goNext()}
                    disabled={!nameValid}
                    testID="onboarding-next-name"
                  >
                    <Text
                      style={[
                        styles.primaryBtnText,
                        { color: nameValid ? colors.primaryForeground : colors.mutedForeground },
                      ]}
                    >
                      Volgende
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={nameValid ? colors.primaryForeground : colors.mutedForeground}
                    />
                  </Pressable>
                </Animated.View>
              )}

              {step === 2 && (
                <Animated.View key="step2" entering={FadeInRight.duration(300).springify()} style={styles.stepInner}>
                  <View style={[styles.stepIconWrap, { backgroundColor: colors.primary + "18" }]}>
                    <Ionicons name="heart-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                    Wat zijn jouw interesses?
                  </Text>
                  <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
                    Kies minstens één interesse. Airbuddies matcht je met mensen die dezelfde dingen leuk vinden.
                  </Text>

                  {selectedInterests.length > 0 && (
                    <Animated.View entering={FadeIn.duration(200)}>
                      <View style={[styles.selectedBadge, { backgroundColor: colors.primary + "18" }]}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        <Text style={[styles.selectedBadgeText, { color: colors.primary }]}>
                          {selectedInterests.length} geselecteerd
                        </Text>
                      </View>
                    </Animated.View>
                  )}

                  <View style={styles.interestsGrid}>
                    {INTERESTS.map((interest, i) => (
                      <Animated.View key={interest} entering={FadeInDown.delay(i * 30).duration(250)}>
                        <InterestChip
                          label={interest}
                          selected={selectedInterests.includes(interest)}
                          onPress={() => toggleInterest(interest)}
                        />
                      </Animated.View>
                    ))}
                  </View>

                  <Pressable
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: interestsValid ? colors.primary : colors.muted },
                    ]}
                    onPress={() => interestsValid && goNext()}
                    disabled={!interestsValid}
                    testID="onboarding-next-interests"
                  >
                    <Text
                      style={[
                        styles.primaryBtnText,
                        { color: interestsValid ? colors.primaryForeground : colors.mutedForeground },
                      ]}
                    >
                      Volgende
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={interestsValid ? colors.primaryForeground : colors.mutedForeground}
                    />
                  </Pressable>
                </Animated.View>
              )}

              {step === 3 && (
                <Animated.View key="step3" entering={FadeInRight.duration(300).springify()} style={styles.stepInner}>
                  <View style={[styles.stepIconWrap, { backgroundColor: colors.primary + "18" }]}>
                    <Ionicons name="airplane-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                    Jouw stoelnummer
                  </Text>
                  <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
                    Optioneel — anderen zien jouw stoel in de cabinekaart. Je kunt dit later ook instellen.
                  </Text>

                  <View
                    style={[
                      styles.inputWrap,
                      {
                        backgroundColor: colors.card,
                        borderColor: seatNumber.length > 0 ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons name="locate-outline" size={20} color={colors.primary} />
                    <TextInput
                      ref={seatInputRef}
                      style={[styles.textInput, { color: colors.foreground, fontFamily: "Inter_600SemiBold", letterSpacing: 1 }]}
                      placeholder="Bijv. 14A of 22C"
                      placeholderTextColor={colors.mutedForeground}
                      value={seatNumber}
                      onChangeText={(t) => setSeatNumber(t.toUpperCase())}
                      autoFocus
                      autoCapitalize="characters"
                      maxLength={4}
                      returnKeyType="done"
                      testID="onboarding-seat-input"
                    />
                  </View>

                  <View style={[styles.seatHint, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.seatHintText, { color: colors.mutedForeground }]}>
                      Formaat: rijnummer + letter, zoals <Text style={{ fontFamily: "Inter_600SemiBold" }}>14A</Text> of <Text style={{ fontFamily: "Inter_600SemiBold" }}>3B</Text>
                    </Text>
                  </View>

                  <View style={styles.summaryCard}>
                    <View style={[styles.summaryCardInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.summaryTitle, { color: colors.mutedForeground }]}>Jouw profiel</Text>
                      <View style={styles.summaryRow}>
                        <Avatar name={name} size={52} seed={name} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.summaryName, { color: colors.foreground }]}>{name}</Text>
                          <View style={styles.summaryChips}>
                            {selectedInterests.slice(0, 3).map((i) => (
                              <View key={i} style={[styles.summaryChip, { backgroundColor: colors.primary + "22" }]}>
                                <Text style={[styles.summaryChipText, { color: colors.primary }]}>{i}</Text>
                              </View>
                            ))}
                            {selectedInterests.length > 3 && (
                              <Text style={[styles.summaryMore, { color: colors.mutedForeground }]}>
                                +{selectedInterests.length - 3}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleFinish}
                    disabled={submitting}
                    testID="onboarding-finish"
                  >
                    <Ionicons name="airplane" size={20} color={colors.primaryForeground} />
                    <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                      Begin met vliegen!
                    </Text>
                  </Pressable>

                  <Pressable onPress={handleFinish} style={styles.skipBtn}>
                    <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                      Stoelnummer overslaan
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

function WelcomeStep({
  topPad,
  bottomPad,
  colors,
  onStart,
}: {
  topPad: number;
  bottomPad: number;
  colors: ReturnType<typeof useColors>;
  onStart: () => void;
}) {
  return (
    <View style={[styles.welcome, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.welcomeContent}>
        <View style={[styles.welcomeIconBg, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Text style={styles.welcomeEmoji}>✈️</Text>
        </View>

        <Text style={styles.welcomeTitle}>Airbuddies</Text>

        <Text style={styles.welcomeTagline}>
          Chat met je medereiziger{"\n"}via Bluetooth. Zonder internet.
        </Text>

        <View style={styles.welcomeFeatures}>
          {[
            { icon: "bluetooth", label: "Geen internet nodig" },
            { icon: "people-outline", label: "Vind mensen met dezelfde interesses" },
            { icon: "lock-closed-outline", label: "Privé & versleuteld" },
          ].map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Ionicons name={f.icon as never} size={18} color="#fff" />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={styles.welcomeFooter}>
        <Pressable
          style={[styles.welcomeBtn, { backgroundColor: "#ffffff" }]}
          onPress={onStart}
          testID="onboarding-start"
        >
          <Text style={[styles.welcomeBtnText, { color: colors.primary }]}>Begin</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </Pressable>
        <Text style={styles.welcomeDisclaimer}>
          Je gegevens verlaten nooit jouw toestel
        </Text>
      </View>

      <View style={[StyleSheet.absoluteFillObject, styles.welcomeBg, { zIndex: -1 }]}>
        <View style={[styles.welcomeCircle1, { backgroundColor: "rgba(255,255,255,0.06)" }]} />
        <View style={[styles.welcomeCircle2, { backgroundColor: "rgba(255,255,255,0.04)" }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  welcome: {
    flex: 1,
    backgroundColor: "#0ea5e9",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    overflow: "hidden",
  },
  welcomeBg: { overflow: "hidden" },
  welcomeCircle1: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -80,
    right: -100,
  },
  welcomeCircle2: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: -60,
    left: -80,
  },
  welcomeContent: { flex: 1, justifyContent: "center", gap: 28 },
  welcomeIconBg: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  welcomeEmoji: { fontSize: 52 },
  welcomeTitle: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: -1,
  },
  welcomeTagline: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 30,
  },
  welcomeFeatures: { gap: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  welcomeFooter: { paddingBottom: 16, gap: 14 },
  welcomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    padding: 18,
  },
  welcomeBtnText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  welcomeDisclaimer: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },

  stepContainer: { flex: 1 },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    minWidth: 28,
    textAlign: "right",
  },
  stepContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 0,
  },
  stepInner: { gap: 22 },
  stepIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  stepSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginTop: -10 },

  avatarPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
  },
  avatarPreviewText: { flex: 1, gap: 4 },
  avatarName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  avatarHint: { fontSize: 14, fontFamily: "Inter_400Regular" },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    padding: 0,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    padding: 17,
  },
  primaryBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },

  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  seatHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -8,
  },
  seatHintText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  summaryCard: { marginTop: -4 },
  summaryCardInner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  summaryTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  summaryChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  summaryChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  summaryMore: { fontSize: 12, fontFamily: "Inter_400Regular", alignSelf: "center" },

  skipBtn: { alignItems: "center", padding: 8 },
  skipText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
