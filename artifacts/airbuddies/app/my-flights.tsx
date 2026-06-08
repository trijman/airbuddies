import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

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
  flightInfo?: FlightInfo;
}

interface FlightInfo {
  flightNumber: string;
  flightDate: string;
  airline: string | null;
  iataCode: string;
  origin: string | null;
  originCity: string | null;
  destination: string | null;
  destinationCity: string | null;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  actualDeparture: string | null;
  actualArrival: string | null;
  status: string;
  delayMinutes: number | null;
  aircraftType: string | null;
  aircraftName: string | null;
  terminal: string | null;
  gate: string | null;
  source: "aviationstack" | "airlabs" | "inferred";
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

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
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

function StatusPill({ status, delay }: { status: string; delay: number | null }) {
  const colors = useColors();
  const isDelayed = (delay ?? 0) > 5 || status === "delayed";
  const isCancelled = status === "cancelled";
  const isActive = status === "active" || status === "en-route";

  const bg = isCancelled
    ? "#ef4444"
    : isDelayed
    ? "#f97316"
    : isActive
    ? "#22c55e"
    : colors.primary + "22";
  const text = isCancelled
    ? "#fff"
    : isDelayed
    ? "#fff"
    : isActive
    ? "#fff"
    : colors.primary;
  const label = isCancelled
    ? "Geannuleerd"
    : isActive
    ? "Onderweg"
    : isDelayed
    ? `+${delay ?? "?"} min`
    : "Op tijd";

  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <Text style={[styles.statusPillText, { color: text }]}>{label}</Text>
    </View>
  );
}

function FlightInfoCard({ info, onConfirm, onCancel }: {
  info: FlightInfo;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const depTime = formatTime(info.scheduledDeparture);
  const arrTime = formatTime(info.scheduledArrival);
  const isLive = info.source !== "inferred";

  return (
    <Animated.View entering={FadeInUp.duration(280).springify()} style={[styles.flightInfoCard, { backgroundColor: colors.card, borderColor: colors.primary + "55" }]}>
      <View style={styles.flightInfoHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.flightInfoNumber, { color: colors.foreground }]}>{info.flightNumber}</Text>
          {info.airline && (
            <Text style={[styles.flightInfoAirline, { color: colors.mutedForeground }]}>{info.airline}</Text>
          )}
        </View>
        {isLive && <StatusPill status={info.status} delay={info.delayMinutes} />}
        {!isLive && (
          <View style={[styles.inferred, { backgroundColor: colors.muted }]}>
            <Ionicons name="information-circle-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.inferredText, { color: colors.mutedForeground }]}>Geschat</Text>
          </View>
        )}
      </View>

      {(info.origin || info.destination) && (
        <View style={styles.routeRow}>
          <View style={styles.routeAirport}>
            <Text style={[styles.routeIata, { color: colors.foreground }]}>{info.origin ?? "—"}</Text>
            {info.originCity && (
              <Text style={[styles.routeCity, { color: colors.mutedForeground }]} numberOfLines={1}>
                {info.originCity}
              </Text>
            )}
            {depTime && <Text style={[styles.routeTime, { color: colors.primary }]}>{depTime}</Text>}
          </View>
          <View style={styles.routeMid}>
            <Ionicons name="airplane" size={20} color={colors.primary} />
            <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.routeAirport, { alignItems: "flex-end" }]}>
            <Text style={[styles.routeIata, { color: colors.foreground }]}>{info.destination ?? "—"}</Text>
            {info.destinationCity && (
              <Text style={[styles.routeCity, { color: colors.mutedForeground }]} numberOfLines={1}>
                {info.destinationCity}
              </Text>
            )}
            {arrTime && <Text style={[styles.routeTime, { color: colors.primary }]}>{arrTime}</Text>}
          </View>
        </View>
      )}

      <View style={styles.flightMetaRow}>
        {info.aircraftName && (
          <View style={[styles.metaChip, { backgroundColor: colors.muted }]}>
            <Ionicons name="airplane-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaChipText, { color: colors.mutedForeground }]}>{info.aircraftName}</Text>
          </View>
        )}
        {info.terminal && (
          <View style={[styles.metaChip, { backgroundColor: colors.muted }]}>
            <Ionicons name="business-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaChipText, { color: colors.mutedForeground }]}>Terminal {info.terminal}</Text>
          </View>
        )}
        {info.gate && (
          <View style={[styles.metaChip, { backgroundColor: colors.muted }]}>
            <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaChipText, { color: colors.mutedForeground }]}>Gate {info.gate}</Text>
          </View>
        )}
      </View>

      {!isLive && (
        <Text style={[styles.noLiveNote, { color: colors.mutedForeground }]}>
          Geen live data beschikbaar. Basisinfo is afgeleid van het vluchtnummer.
        </Text>
      )}

      <View style={styles.flightInfoActions}>
        <Pressable
          style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          onPress={onConfirm}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.primaryForeground} />
          <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>Dit is mijn vlucht</Text>
        </Pressable>
        <Pressable
          style={[styles.cancelSearchBtn, { borderColor: colors.border }]}
          onPress={onCancel}
        >
          <Text style={[styles.cancelSearchText, { color: colors.mutedForeground }]}>Annuleer</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function MyFlightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, createGroup, setActiveAirlineIata } = useApp();
  const isWeb = Platform.OS === "web";

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const [flightNumber, setFlightNumber] = useState("");
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0].value);
  const [registering, setRegistering] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<FlightInfo | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [registeredFlights, setRegisteredFlights] = useState<RegisteredFlight[]>([]);
  const [passengerCounts, setPassengerCounts] = useState<Record<string, PassengerInfo>>({});
  const [refreshing, setRefreshing] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const searchFlight = useCallback(async (fn: string, date: string) => {
    const trimmed = fn.trim().toUpperCase();
    if (trimmed.length < 2) {
      setSearchResult(null);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`${API_BASE}/flights/search?flight=${encodeURIComponent(trimmed)}&date=${date}`);
      if (!res.ok) throw new Error("server error");
      const data: FlightInfo = await res.json();
      setSearchResult(data);
    } catch {
      setSearchError("Kon vluchtstatus niet ophalen");
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleFlightNumberChange = (text: string) => {
    setFlightNumber(text.toUpperCase());
    setSearchResult(null);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchFlight(text, selectedDate);
      }, 700);
    }
  };

  const handleDateChange = (date: string) => {
    Haptics.selectionAsync();
    setSelectedDate(date);
    setSearchResult(null);
    if (flightNumber.trim().length >= 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        searchFlight(flightNumber, date);
      }, 200);
    }
  };

  const handleConfirmFlight = async () => {
    const fn = (searchResult?.flightNumber ?? flightNumber).trim().toUpperCase();
    const date = searchResult?.flightDate ?? selectedDate;

    if (fn.length < 2) return;

    const alreadyRegistered = registeredFlights.some(
      (f) => f.flightNumber === fn && f.flightDate === date
    );
    if (alreadyRegistered) {
      Alert.alert("Al aangemeld", `Je bent al aangemeld voor ${fn} op ${getDateLabel(date)}.`);
      setSearchResult(null);
      setFlightNumber("");
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
          flightDate: date,
          passengerName: profile?.name,
        }),
      });
      if (!res.ok) throw new Error("Server error");

      const newFlight: RegisteredFlight = {
        flightNumber: fn,
        flightDate: date,
        passengerName: profile?.name,
        registeredAt: new Date().toISOString(),
        flightInfo: searchResult ?? undefined,
      };
      const updated = [...registeredFlights, newFlight];
      await saveRegisteredFlights(updated);

      // Update reactive airline context so tab label changes instantly
      const iata = searchResult?.iataCode ?? fn.slice(0, 2).toUpperCase();
      setActiveAirlineIata(iata);

      const key = `${fn}_${date}`;
      const count = await fetchPassengerCount(fn, date);
      setPassengerCounts((prev) => ({ ...prev, [key]: count }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();
      setFlightNumber("");
      setSearchResult(null);

      if (count.count > 1) {
        Alert.alert("Aangemeld! 🎉", `${count.count} mensen hebben zich aangemeld voor ${fn}. Je kunt straks met ze chatten via de app!`);
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
                body: JSON.stringify({ deviceId, flightNumber: flight.flightNumber, flightDate: flight.flightDate }),
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
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Mijn Vluchten</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.primary + "44" }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.secondaryForeground }]}>
            Meld je thuis aan voor je vlucht. Zodra anderen dezelfde vlucht aanmelden, krijg je een melding. In de lucht chat je via Airbuddies via Bluetooth.
          </Text>
        </View>

        <View style={[styles.registerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Vlucht zoeken & registreren</Text>
          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
            Typ je vluchtnummer — we zoeken automatisch de details op
          </Text>

          <View style={[styles.flightInput, { backgroundColor: colors.muted, borderColor: searching ? colors.primary : colors.border }]}>
            <Ionicons name="airplane-outline" size={20} color={colors.primary} />
            <TextInput
              style={[styles.flightInputText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
              placeholder="Bijv. KL1234 of EK142"
              placeholderTextColor={colors.mutedForeground}
              value={flightNumber}
              onChangeText={handleFlightNumberChange}
              autoCapitalize="characters"
              maxLength={8}
              returnKeyType="search"
              onSubmitEditing={() => searchFlight(flightNumber, selectedDate)}
              testID="flight-number-input"
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} />}
            {!searching && flightNumber.length > 0 && !searchResult && (
              <Pressable onPress={() => { setFlightNumber(""); setSearchResult(null); setSearchError(null); }}>
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {searchError && (
            <View style={[styles.searchError, { backgroundColor: "#ef444422", borderColor: "#ef444455" }]}>
              <Ionicons name="warning-outline" size={14} color="#ef4444" />
              <Text style={[styles.searchErrorText, { color: "#ef4444" }]}>{searchError}</Text>
            </View>
          )}

          {!searchResult && (
            <>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Vluchtdatum</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datePills}>
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
                    onPress={() => handleDateChange(opt.value)}
                  >
                    <Text style={[styles.datePillText, { color: selectedDate === opt.value ? colors.primaryForeground : colors.mutedForeground }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {flightNumber.trim().length >= 2 && !searching && (
                <Pressable
                  style={[styles.searchBtn, { backgroundColor: colors.primary }]}
                  onPress={() => searchFlight(flightNumber, selectedDate)}
                >
                  <Ionicons name="search" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.searchBtnText, { color: colors.primaryForeground }]}>Vlucht opzoeken</Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {searchResult && (
          <FlightInfoCard
            info={searchResult}
            onConfirm={handleConfirmFlight}
            onCancel={() => { setSearchResult(null); setFlightNumber(""); }}
          />
        )}

        {registering && (
          <View style={[styles.registeringOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.registeringText, { color: colors.mutedForeground }]}>Aanmelden...</Text>
          </View>
        )}

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
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Aangemelde vluchten</Text>
            {sortedDates.map((date) =>
              flightsByDate[date].map((flight, i) => {
                const key = `${flight.flightNumber}_${flight.flightDate}`;
                const info = passengerCounts[key];
                const isFlightToday = isToday(flight.flightDate);
                const fi = flight.flightInfo;

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
                            {fi?.destinationCity ? ` · ${fi.destinationCity}` : ""}
                          </Text>
                          {fi?.aircraftName && (
                            <Text style={[styles.flightCardAircraft, { color: colors.mutedForeground }]}>
                              {fi.aircraftName}
                            </Text>
                          )}
                        </View>
                        {info !== undefined ? (
                          <View style={[styles.passengerBadge, { backgroundColor: info.count > 1 ? colors.primary : colors.muted }]}>
                            <Text style={[styles.passengerCount, { color: info.count > 1 ? colors.primaryForeground : colors.mutedForeground }]}>
                              {info.count}
                            </Text>
                            <Ionicons name="people" size={13} color={info.count > 1 ? colors.primaryForeground : colors.mutedForeground} />
                          </View>
                        ) : (
                          <ActivityIndicator size="small" color={colors.primary} />
                        )}
                      </View>

                      {fi && (fi.origin || fi.destination) && (
                        <View style={[styles.cardRouteRow, { borderTopColor: colors.border }]}>
                          <View style={styles.cardRouteItem}>
                            <Text style={[styles.cardRouteIata, { color: colors.foreground }]}>{fi.origin ?? "—"}</Text>
                            {formatTime(fi.scheduledDeparture) && (
                              <Text style={[styles.cardRouteTime, { color: colors.primary }]}>{formatTime(fi.scheduledDeparture)}</Text>
                            )}
                          </View>
                          <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
                          <View style={[styles.cardRouteItem, { alignItems: "flex-end" }]}>
                            <Text style={[styles.cardRouteIata, { color: colors.foreground }]}>{fi.destination ?? "—"}</Text>
                            {formatTime(fi.scheduledArrival) && (
                              <Text style={[styles.cardRouteTime, { color: colors.primary }]}>{formatTime(fi.scheduledArrival)}</Text>
                            )}
                          </View>
                          {(fi.delayMinutes ?? 0) > 5 && (
                            <View style={[styles.delayBadge, { backgroundColor: "#f9731622" }]}>
                              <Text style={styles.delayText}>+{fi.delayMinutes} min</Text>
                            </View>
                          )}
                        </View>
                      )}

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
                          <Pressable style={[styles.openGroupBtn, { backgroundColor: colors.primary }]} onPress={() => handleOpenGroup(flight)}>
                            <Ionicons name="chatbubbles" size={16} color={colors.primaryForeground} />
                            <Text style={[styles.openGroupText, { color: colors.primaryForeground }]}>Open groep</Text>
                          </Pressable>
                        )}
                        <Pressable style={[styles.unregisterBtn, { borderColor: colors.border }]} onPress={() => handleUnregister(flight)}>
                          <Text style={[styles.unregisterText, { color: colors.mutedForeground }]}>Afmelden</Text>
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
  registerCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  flightInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  flightInputText: { flex: 1, fontSize: 18, letterSpacing: 1 },
  searchError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchErrorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dateLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  datePills: { gap: 8, paddingVertical: 2 },
  datePill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  datePillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 14,
  },
  searchBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  flightInfoCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    gap: 14,
  },
  flightInfoHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  flightInfoNumber: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  flightInfoAirline: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  statusPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  inferred: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  inferredText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeAirport: { flex: 1 },
  routeMid: { alignItems: "center", gap: 4 },
  routeLine: { height: 1, width: 24 },
  routeIata: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  routeCity: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1, maxWidth: 100 },
  routeTime: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  flightMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  metaChipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noLiveNote: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" },
  flightInfoActions: { gap: 8, marginTop: 4 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 14,
  },
  confirmBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cancelSearchBtn: { borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center" },
  cancelSearchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  registeringOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  registeringText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyFlights: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  flightCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12, overflow: "hidden" },
  todayBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: -4 },
  todayText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  flightCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  flightIconWrap: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  flightCardInfo: { flex: 1 },
  flightCardNumber: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  flightCardDate: { fontSize: 13, fontFamily: "Inter_400Regular" },
  flightCardAircraft: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  cardRouteItem: { flex: 1 },
  cardRouteIata: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardRouteTime: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 1 },
  delayBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  delayText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#f97316" },
  passengerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  passengerCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  passengerInfo: { borderRadius: 10, borderWidth: 1, padding: 10 },
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
