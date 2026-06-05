import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

interface RegisteredFlight {
  flightNumber: string;
  flightDate: string;
  passengerName?: string;
  registeredAt: string;
}

interface PassengerInfo {
  count: number;
  names: string[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" });
}

function isToday(dateStr: string): boolean {
  return new Date().toISOString().slice(0, 10) === dateStr;
}

function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10) === dateStr;
}

function getDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return "Vandaag";
  if (isTomorrow(dateStr)) return "Morgen";
  return formatDate(dateStr);
}

function generateDateOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label =
      i === 0 ? "Vandaag" : i === 1 ? "Morgen" : d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
    options.push({ label, value });
  }
  return options;
}

const DATE_OPTIONS = generateDateOptions();

export default function MyFlightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, createGroup } = useApp();
  const isWeb = Platform.OS === "web";

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const [flightNumber, setFlightNumber] = useState("");
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0].value);
  const [registering, setRegistering] = useState(false);

  const [registeredFlights, setRegisteredFlights] = useState<RegisteredFlight[]>([]);
  const [passengerCounts, setPassengerCounts] = useState<Record<string, PassengerInfo>>({});
  const [refreshing, setRefreshing] = useState(false);

  const deviceId = profile?.id ?? "me_static_001";

  useEffect(() => {
    loadRegisteredFlights();
  }, []);

  const loadRegisteredFlights = async () => {
    const stored = await AsyncStorage.getItem("my_flights_v1");
    if (stored) {
      const flights: RegisteredFlight[] = JSON.parse(stored);
      setRegisteredFlights(flights);
      fetchAllCounts(flights);
    }
  };

  const saveRegisteredFlights = async (flights: RegisteredFlight[]) => {
    await AsyncStorage.setItem("my_flights_v1", JSON.stringify(flights));
    setRegisteredFlights(flights);
  };

  const fetchPassengerCount = async (flightNumber: string, date: string): Promise<PassengerInfo> => {
    try {
      const res = await fetch(
        `${API_BASE}/flights/${encodeURIComponent(flightNumber)}/passengers?date=${date}`
      );
      if (!res.ok) return { count: 0, names: [] };
      return await res.json();
    } catch {
      return { count: 0, names: [] };
    }
  };

  const fetchAllCounts = async (flights: RegisteredFlight[]) => {
    const updates: Record<string, PassengerInfo> = {};
    await Promise.all(
      flights.map(async (f) => {
        const key = `${f.flightNumber}_${f.flightDate}`;
        updates[key] = await fetchPassengerCount(f.flightNumber, f.flightDate);
      })
    );
    setPassengerCounts(updates);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllCounts(registeredFlights);
    setRefreshing(false);
  };

  const handleRegister = async () => {
    const fn = flightNumber.trim().toUpperCase();
    if (fn.length < 2) {
      Alert.alert("Vul een vluchtnummer in", "Bijv. KL1234 of EK142.");
      return;
    }

    const alreadyRegistered = registeredFlights.some(
      (f) => f.flightNumber === fn && f.flightDate === selectedDate
    );
    if (alreadyRegistered) {
      Alert.alert("Al aangemeld", `Je bent al aangemeld voor ${fn} op ${getDateLabel(selectedDate)}.`);
      return;
    }

    setRegistering(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await fetch(`${API_BASE}/flights/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          flightNumber: fn,
          flightDate: selectedDate,
          passengerName: profile?.name,
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const newFlight: RegisteredFlight = {
        flightNumber: fn,
        flightDate: selectedDate,
        passengerName: profile?.name,
        registeredAt: new Date().toISOString(),
      };

      const updated = [...registeredFlights, newFlight];
      await saveRegisteredFlights(updated);

      const key = `${fn}_${selectedDate}`;
      const count = await fetchPassengerCount(fn, selectedDate);
      setPassengerCounts((prev) => ({ ...prev, [key]: count }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFlightNumber("");

      if (count.count > 1) {
        Alert.alert(
          "Aangemeld! 🎉",
          `${count.count} mensen hebben zich aangemeld voor ${fn}. Je kunt straks met ze chatten via de app!`
        );
      } else {
        Alert.alert("Aangemeld!", `We laten je weten als anderen ${fn} ook aanmelden.`);
      }
    } catch {
      Alert.alert("Verbindingsfout", "Kon niet verbinden met de server. Controleer je internetverbinding.");
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = (flight: RegisteredFlight) => {
    Alert.alert(
      `Afmelden voor ${flight.flightNumber}`,
      `Wil je je afmelden voor vlucht ${flight.flightNumber} op ${getDateLabel(flight.flightDate)}?`,
      [
        { text: "Annuleer", style: "cancel" },
        {
          text: "Afmelden",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${API_BASE}/flights/unregister`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  deviceId,
                  flightNumber: flight.flightNumber,
                  flightDate: flight.flightDate,
                }),
              });
            } catch {}
            const updated = registeredFlights.filter(
              (f) => !(f.flightNumber === flight.flightNumber && f.flightDate === flight.flightDate)
            );
            await saveRegisteredFlights(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleOpenGroup = (flight: RegisteredFlight) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const conv = createGroup(`${flight.flightNumber} ✈`, [], {
      isPrivate: false,
      flightNumber: flight.flightNumber,
    });
    router.push(`/chat/${conv.id}`);
  };

  const flightsByDate = registeredFlights.reduce<Record<string, RegisteredFlight[]>>((acc, f) => {
    if (!acc[f.flightDate]) acc[f.flightDate] = [];
    acc[f.flightDate].push(f);
    return acc;
  }, {});

  const sortedDates = Object.keys(flightsByDate).sort();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Mijn Vluchten</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.primary + "44" }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.secondaryForeground }]}>
            Meld je thuis aan voor je vlucht. Zodra anderen dezelfde vlucht aanmelden, krijg je een melding. In de lucht chat je via Airbuddies via Bluetooth.
          </Text>
        </View>

        <View style={[styles.registerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Vlucht registreren</Text>
          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
            Vul je vluchtnummer en datum in
          </Text>

          <View style={[styles.flightInput, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="airplane-outline" size={20} color={colors.primary} />
            <TextInput
              style={[styles.flightInputText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
              placeholder="Vluchtnummer (bijv. KL1234)"
              placeholderTextColor={colors.mutedForeground}
              value={flightNumber}
              onChangeText={(t) => setFlightNumber(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              returnKeyType="done"
              testID="flight-number-input"
            />
          </View>

          <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Vluchtdatum</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datePills}
          >
            {DATE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.datePill,
                  {
                    backgroundColor: selectedDate === opt.value ? colors.primary : colors.muted,
                    borderColor: selectedDate === opt.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDate(opt.value);
                }}
              >
                <Text
                  style={[
                    styles.datePillText,
                    {
                      color: selectedDate === opt.value ? colors.primaryForeground : colors.mutedForeground,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={[
              styles.registerBtn,
              { backgroundColor: flightNumber.trim().length >= 2 ? colors.primary : colors.muted },
            ]}
            onPress={handleRegister}
            disabled={flightNumber.trim().length < 2 || registering}
            testID="register-flight-button"
          >
            {registering ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={flightNumber.trim().length >= 2 ? colors.primaryForeground : colors.mutedForeground} />
                <Text
                  style={[
                    styles.registerBtnText,
                    { color: flightNumber.trim().length >= 2 ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  Aanmelden
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {registeredFlights.length === 0 ? (
          <View style={styles.emptyFlights}>
            <Ionicons name="airplane-outline" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Geen vluchten</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Meld je aan voor je volgende vlucht om te zien wie je medereiziger is
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Aangemelde vluchten
            </Text>
            {sortedDates.map((date) =>
              flightsByDate[date].map((flight, i) => {
                const key = `${flight.flightNumber}_${flight.flightDate}`;
                const info = passengerCounts[key];
                const isFlightToday = isToday(flight.flightDate);

                return (
                  <Animated.View key={key} entering={FadeInDown.delay(i * 80).springify()}>
                    <View style={[styles.flightCard, { backgroundColor: colors.card, borderColor: isFlightToday ? colors.primary : colors.border }]}>
                      {isFlightToday && (
                        <View style={[styles.todayBadge, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.todayText, { color: colors.primaryForeground }]}>Vandaag</Text>
                        </View>
                      )}

                      <View style={styles.flightCardTop}>
                        <View style={[styles.flightIconWrap, { backgroundColor: colors.primary + "18" }]}>
                          <Ionicons name="airplane" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.flightCardInfo}>
                          <Text style={[styles.flightCardNumber, { color: colors.foreground }]}>
                            {flight.flightNumber}
                          </Text>
                          <Text style={[styles.flightCardDate, { color: colors.mutedForeground }]}>
                            {getDateLabel(flight.flightDate)}
                          </Text>
                        </View>
                        {info !== undefined ? (
                          <View style={[
                            styles.passengerBadge,
                            { backgroundColor: info.count > 1 ? colors.primary : colors.muted }
                          ]}>
                            <Text style={[
                              styles.passengerCount,
                              { color: info.count > 1 ? colors.primaryForeground : colors.mutedForeground }
                            ]}>
                              {info.count}
                            </Text>
                            <Ionicons
                              name="people"
                              size={13}
                              color={info.count > 1 ? colors.primaryForeground : colors.mutedForeground}
                            />
                          </View>
                        ) : (
                          <ActivityIndicator size="small" color={colors.primary} />
                        )}
                      </View>

                      {info && info.count > 0 && (
                        <View style={[styles.passengerInfo, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                          {info.count === 1 ? (
                            <Text style={[styles.passengerInfoText, { color: colors.mutedForeground }]}>
                              Jij bent de eerste! Anderen kunnen zich nog aanmelden.
                            </Text>
                          ) : (
                            <Text style={[styles.passengerInfoText, { color: info.count >= 5 ? colors.primary : colors.mutedForeground }]}>
                              🎉 {info.count} mensen aangemeld voor {flight.flightNumber}!
                              {info.names.length > 0 ? ` Waaronder ${info.names.slice(0, 2).join(" en ")}.` : ""}
                            </Text>
                          )}
                        </View>
                      )}

                      <View style={styles.flightCardActions}>
                        {isFlightToday && (
                          <Pressable
                            style={[styles.openGroupBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleOpenGroup(flight)}
                          >
                            <Ionicons name="chatbubbles" size={16} color={colors.primaryForeground} />
                            <Text style={[styles.openGroupText, { color: colors.primaryForeground }]}>
                              Open groep
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          style={[styles.unregisterBtn, { borderColor: colors.border }]}
                          onPress={() => handleUnregister(flight)}
                        >
                          <Text style={[styles.unregisterText, { color: colors.mutedForeground }]}>
                            Afmelden
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  scroll: { padding: 16, gap: 14 },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  registerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  flightInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  flightInputText: { flex: 1, fontSize: 18, letterSpacing: 1 },
  dateLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  datePills: { gap: 8, paddingVertical: 2 },
  datePill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  datePillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 14,
  },
  registerBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyFlights: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  flightCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    overflow: "hidden",
  },
  todayBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: -4,
  },
  todayText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  flightCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  flightIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  flightCardInfo: { flex: 1 },
  flightCardNumber: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  flightCardDate: { fontSize: 13, fontFamily: "Inter_400Regular" },
  passengerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  passengerCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  passengerInfo: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  passengerInfoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  flightCardActions: { flexDirection: "row", gap: 8 },
  openGroupBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    padding: 10,
  },
  openGroupText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  unregisterBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unregisterText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
